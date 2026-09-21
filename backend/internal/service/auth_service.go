package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/agriconnect/backend/internal/models"
	"github.com/agriconnect/backend/internal/repository"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// AuthService handles authentication business logic.
type AuthService struct {
	repo           *repository.UserRepository
	resetTokenRepo *repository.ResetTokenRepository
	emailService   *EmailService
	jwtSecret      []byte
	jwtExpiry      time.Duration
	appBaseURL     string
}

// NewAuthService creates a new AuthService.
func NewAuthService(
	repo *repository.UserRepository,
	resetTokenRepo *repository.ResetTokenRepository,
	emailService *EmailService,
	jwtSecret string,
	jwtExpiryHrs int,
	appBaseURL string,
) *AuthService {
	return &AuthService{
		repo:           repo,
		resetTokenRepo: resetTokenRepo,
		emailService:   emailService,
		jwtSecret:      []byte(jwtSecret),
		jwtExpiry:      time.Duration(jwtExpiryHrs) * time.Hour,
		appBaseURL:     appBaseURL,
	}
}

// Register creates a new user account and returns an AuthResponse.
func (s *AuthService) Register(ctx context.Context, req models.RegisterRequest) (*models.AuthResponse, error) {
	// Validate inputs
	if req.Email == "" {
		return nil, errors.New("email is required")
	}
	if len(req.Password) < 8 {
		return nil, errors.New("password must be at least 8 characters")
	}
	if !models.IsValidRole(req.Role) {
		return nil, errors.New("invalid role")
	}
	if req.FirstName == "" || req.LastName == "" {
		return nil, errors.New("first name and last name are required")
	}

	// Determine status and verification
	status := models.StatusPending
	isVerified := false
	if req.Role == models.RoleSuperAdmin {
		status = models.StatusApproved
		isVerified = true
	}

	// Hash password
	hashed, err := HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	user := &models.User{
		Email:        req.Email,
		Password:     hashed,
		Role:         req.Role,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Region:       req.Region,
		Province:     req.Province,
		Municipality: req.Municipality,
		Barangay:     req.Barangay,
		Status:       status,
		IsVerified:   isVerified,
	}

	if err := s.repo.Create(ctx, user); err != nil {
		if errors.Is(err, repository.ErrDuplicateEmail) {
			return nil, errors.New("email already registered")
		}
		return nil, err
	}

	// Fetch the created user to get the generated ID
	created, err := s.repo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, err
	}

	// If pending approval, return response without token
	if created.Status != models.StatusApproved {
		return &models.AuthResponse{Token: "", User: *created}, nil
	}

	token, err := s.GenerateToken(created.ID.Hex(), string(created.Role))
	if err != nil {
		return nil, err
	}

	return &models.AuthResponse{Token: token, User: *created}, nil
}

// Login authenticates a user and returns a JWT if approved.
func (s *AuthService) Login(ctx context.Context, req models.LoginRequest) (*models.AuthResponse, error) {
	if req.Email == "" || req.Password == "" {
		return nil, errors.New("email and password are required")
	}

	user, err := s.repo.FindByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, errors.New("invalid email or password")
		}
		return nil, err
	}

	if !CheckPassword(req.Password, user.Password) {
		return nil, errors.New("invalid email or password")
	}

	// Check status
	if user.Status == models.StatusPending {
		if user.Role == models.RoleLGUStaff {
			return nil, errors.New("Your LGU Staff account is pending approval by the Super Admin.")
		}
		return nil, errors.New("Your account is pending approval by your LGU Staff.")
	}

	if user.Status == models.StatusRejected {
		return nil, errors.New("Your account registration request has been rejected.")
	}

	if user.Status == models.StatusSuspended {
		return nil, errors.New("Your account has been suspended. Please contact your LGU or the platform administrator.")
	}

	token, err := s.GenerateToken(user.ID.Hex(), string(user.Role))
	if err != nil {
		return nil, err
	}

	return &models.AuthResponse{Token: token, User: *user}, nil
}

// SeedSuperAdmin creates a default Super Admin account if no Super Admin exists.
func (s *AuthService) SeedSuperAdmin(ctx context.Context) error {
	existing, err := s.repo.FindByEmail(ctx, "superadmin@agriconnect.gov.ph")
	if err == nil && existing != nil {
		return nil
	}

	hashed, err := HashPassword("SuperAdmin123!")
	if err != nil {
		return fmt.Errorf("seed super admin hash: %w", err)
	}

	admin := &models.User{
		Email:      "superadmin@agriconnect.gov.ph",
		Password:   hashed,
		Role:       models.RoleSuperAdmin,
		FirstName:  "Super",
		LastName:   "Admin",
		Region:     "Central Office",
		Status:     models.StatusApproved,
		IsVerified: true,
	}

	if err := s.repo.Create(ctx, admin); err != nil {
		if errors.Is(err, repository.ErrDuplicateEmail) {
			return nil
		}
		return fmt.Errorf("seed super admin insert: %w", err)
	}

	return nil
}

// GenerateToken creates a signed JWT with user claims.
func (s *AuthService) GenerateToken(userID, role string) (string, error) {
	claims := jwt.MapClaims{
		"sub":  userID,
		"role": role,
		"exp":  time.Now().Add(s.jwtExpiry).Unix(),
		"iat":  time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// HashPassword hashes a plaintext password using bcrypt.
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPassword compares a plaintext password with a bcrypt hash.
func CheckPassword(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// ForgotPassword generates a reset token, stores its hash, and emails the raw token link.
// Always returns nil so the handler can respond with a generic 200 (prevents email enumeration).
func (s *AuthService) ForgotPassword(ctx context.Context, email string) error {
	user, err := s.repo.FindByEmail(ctx, email)
	if err != nil {
		// User not found — silently succeed to prevent enumeration.
		log.Printf("⚠️  ForgotPassword: no user for email %s (silent success)\n", email)
		return nil
	}

	// Clean up any previous tokens for this user
	_ = s.resetTokenRepo.DeleteByUserID(ctx, user.ID)

	// Generate a cryptographically-secure random token (32 bytes → 64 hex chars)
	rawBytes := make([]byte, 32)
	if _, err := rand.Read(rawBytes); err != nil {
		return fmt.Errorf("generate random token: %w", err)
	}
	rawToken := hex.EncodeToString(rawBytes)
	tokenHash := repository.HashToken(rawToken)

	tok := &models.PasswordResetToken{
		UserID:    user.ID,
		Token:     tokenHash,
		ExpiresAt: time.Now().Add(30 * time.Minute),
		Used:      false,
	}

	if err := s.resetTokenRepo.Create(ctx, tok); err != nil {
		return fmt.Errorf("store reset token: %w", err)
	}

	// Build the reset link with the raw (unhashed) token
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", s.appBaseURL, rawToken)
	toName := user.FirstName
	if toName == "" {
		toName = user.Email
	}

	if err := s.emailService.SendPasswordResetEmail(user.Email, toName, resetLink); err != nil {
		log.Printf("❌ Failed to send reset email to %s: %v\n", user.Email, err)
		return fmt.Errorf("send reset email: %w", err)
	}

	return nil
}

// ResetPassword validates a reset token and updates the user's password.
func (s *AuthService) ResetPassword(ctx context.Context, rawToken, newPassword string) error {
	if rawToken == "" {
		return errors.New("reset token is required")
	}
	if len(newPassword) < 8 {
		return errors.New("password must be at least 8 characters")
	}

	tokenHash := repository.HashToken(rawToken)

	tok, err := s.resetTokenRepo.FindByToken(ctx, tokenHash)
	if err != nil {
		return errors.New("reset token is invalid or has expired")
	}

	// Hash the new password
	hashed, err := HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("hash new password: %w", err)
	}

	// Update the user's password
	if err := s.repo.Update(ctx, tok.UserID, map[string]interface{}{
		"password": hashed,
	}); err != nil {
		return fmt.Errorf("update password: %w", err)
	}

	// Mark the token as used
	if err := s.resetTokenRepo.MarkUsed(ctx, tok.ID); err != nil {
		log.Printf("⚠️  Failed to mark token as used: %v\n", err)
	}

	// Clean up remaining tokens for this user
	_ = s.resetTokenRepo.DeleteByUserID(ctx, tok.UserID)

	return nil
}
