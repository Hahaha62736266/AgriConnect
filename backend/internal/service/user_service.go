package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

	"github.com/agriconnect/backend/internal/models"
	"github.com/agriconnect/backend/internal/repository"
	"github.com/agriconnect/backend/internal/storage"
	"go.mongodb.org/mongo-driver/v2/bson"
)

// UserService handles user profile business logic.
type UserService struct {
	repo    *repository.UserRepository
	storage storage.StorageService
}

// NewUserService creates a new UserService.
func NewUserService(repo *repository.UserRepository, storage storage.StorageService) *UserService {
	return &UserService{repo: repo, storage: storage}
}

// GetProfile retrieves a user profile by ID.
func (s *UserService) GetProfile(ctx context.Context, userID string) (*models.User, error) {
	oid, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}
	return s.repo.FindByID(ctx, oid)
}

// GetPublicProfile retrieves non-sensitive public user info & payment receiving accounts.
func (s *UserService) GetPublicProfile(ctx context.Context, userID string) (*models.PublicUserProfile, error) {
	u, err := s.GetProfile(ctx, userID)
	if err != nil {
		return nil, err
	}

	return &models.PublicUserProfile{
		ID:              u.ID.Hex(),
		FirstName:       u.FirstName,
		LastName:        u.LastName,
		Role:            u.Role,
		Phone:           u.Phone,
		Region:          u.Region,
		Province:        u.Province,
		Municipality:    u.Municipality,
		Barangay:        u.Barangay,
		Address:         u.Address,
		GCashNumber:     u.GCashNumber,
		GCashName:       u.GCashName,
		GCashQrURL:      u.GCashQrURL,
		MayaNumber:      u.MayaNumber,
		MayaName:        u.MayaName,
		MayaQrURL:       u.MayaQrURL,
		BankName:        u.BankName,
		BankAccountNo:   u.BankAccountNo,
		BankAccountName: u.BankAccountName,
	}, nil
}

// UpdateProfile updates the user's profile fields.
func (s *UserService) UpdateProfile(ctx context.Context, userID string, req models.UpdateProfileRequest) (*models.User, error) {
	oid, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	existingUser, err := s.repo.FindByID(ctx, oid)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	update := bson.M{}
	if req.FirstName != nil {
		update["first_name"] = *req.FirstName
	}
	if req.LastName != nil {
		update["last_name"] = *req.LastName
	}
	if req.Phone != nil {
		update["phone"] = *req.Phone
	}

	// Jurisdiction Locking Rule:
	// If an account in any role (except SuperAdmin) is already approved (or active verified account),
	// their official jurisdiction (Region, Province, Municipality, Barangay) is locked and cannot be changed by the user.
	isApproved := (existingUser.Status == models.StatusApproved || existingUser.Status == "" || existingUser.IsVerified) &&
		existingUser.Status != models.StatusPending && existingUser.Status != models.StatusRejected
	isLocationLocked := isApproved && existingUser.Role != models.RoleSuperAdmin

	// LGU Staff jurisdiction (Region, Province, Municipality) is locked to prevent data leaks.
	// Barangay is explicitly excluded/cleared for LGU Staff since their jurisdiction covers the entire Municipality.
	if existingUser.Role == models.RoleLGUStaff {
		update["barangay"] = "" // LGU Staff represents the entire Municipality, no specific barangay
	} else if !isLocationLocked {
		if req.Region != nil {
			update["region"] = *req.Region
		}
		if req.Province != nil {
			update["province"] = *req.Province
		}
		if req.Municipality != nil {
			update["municipality"] = *req.Municipality
		}
		if req.Barangay != nil {
			update["barangay"] = *req.Barangay
		}
	}

	if req.Address != nil {
		update["address"] = *req.Address
	}

	if req.GCashNumber != nil {
		update["gcash_number"] = *req.GCashNumber
	}
	if req.GCashName != nil {
		update["gcash_name"] = *req.GCashName
	}
	if req.GCashQrURL != nil {
		update["gcash_qr_url"] = *req.GCashQrURL
	}
	if req.MayaNumber != nil {
		update["maya_number"] = *req.MayaNumber
	}
	if req.MayaName != nil {
		update["maya_name"] = *req.MayaName
	}
	if req.MayaQrURL != nil {
		update["maya_qr_url"] = *req.MayaQrURL
	}
	if req.BankName != nil {
		update["bank_name"] = *req.BankName
	}
	if req.BankAccountNo != nil {
		update["bank_account_no"] = *req.BankAccountNo
	}
	if req.BankAccountName != nil {
		update["bank_account_name"] = *req.BankAccountName
	}

	if len(update) == 0 {
		return s.repo.FindByID(ctx, oid)
	}

	if err := s.repo.Update(ctx, oid, update); err != nil {
		return nil, err
	}

	return s.repo.FindByID(ctx, oid)
}

// UploadPhoto saves a profile photo using the configured storage service and updates the user's photo URL.
func (s *UserService) UploadPhoto(ctx context.Context, userID string, filename string, file io.Reader) (*models.User, error) {
	oid, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	// Generate unique filename
	ext := filepath.Ext(filename)
	if ext == "" {
		ext = ".jpg"
	}
	newName := fmt.Sprintf("%s_%d%s", userID, time.Now().UnixNano(), strings.ToLower(ext))

	// Detect content type from extension
	contentType := "image/jpeg"
	switch strings.ToLower(ext) {
	case ".png":
		contentType = "image/png"
	case ".webp":
		contentType = "image/webp"
	case ".gif":
		contentType = "image/gif"
	}

	// Upload via storage service (local disk or Cloudflare R2)
	photoURL, err := s.storage.Upload(ctx, newName, contentType, file)
	if err != nil {
		return nil, fmt.Errorf("upload photo: %w", err)
	}

	// Update user record
	if err := s.repo.Update(ctx, oid, bson.M{"photo_url": photoURL}); err != nil {
		return nil, err
	}

	return s.repo.FindByID(ctx, oid)
}

// ChangePassword verifies the current password and updates to the new one.
func (s *UserService) ChangePassword(ctx context.Context, userID string, req models.ChangePasswordRequest) error {
	if req.CurrentPassword == "" || req.NewPassword == "" {
		return errors.New("current password and new password are required")
	}
	if len(req.NewPassword) < 8 {
		return errors.New("new password must be at least 8 characters")
	}

	oid, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	user, err := s.repo.FindByID(ctx, oid)
	if err != nil {
		return err
	}

	// Verify current password
	if !CheckPassword(req.CurrentPassword, user.Password) {
		return errors.New("current password is incorrect")
	}

	// Hash new password
	hashed, err := HashPassword(req.NewPassword)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}

	return s.repo.Update(ctx, oid, bson.M{"password": hashed})
}

// ListSupportContacts returns approved support accounts (super_admin or lgu_staff).
func (s *UserService) ListSupportContacts(ctx context.Context, currentUserID string, roleFilter string) ([]models.User, error) {
	filter := bson.M{}

	if roleFilter != "" {
		filter["role"] = roleFilter
	} else {
		filter["role"] = bson.M{"$in": []models.Role{models.RoleSuperAdmin, models.RoleLGUStaff}}
	}

	if currentUID, err := bson.ObjectIDFromHex(currentUserID); err == nil {
		filter["_id"] = bson.M{"$ne": currentUID}
	}

	return s.repo.FindUsers(ctx, filter)
}
