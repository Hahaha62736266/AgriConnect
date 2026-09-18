package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

// Role represents the user's role in the system.
type Role string

const (
	RoleFarmer     Role = "farmer"
	RoleBuyer      Role = "buyer"
	RoleSupplier   Role = "supplier"
	RoleLGUStaff   Role = "lgu_staff"
	RoleSuperAdmin Role = "super_admin"
)

// User account approval status constants.
const (
	StatusPending   = "pending"
	StatusApproved  = "approved"
	StatusRejected  = "rejected"
	StatusSuspended = "suspended"
)

// ValidRoles is the set of all accepted role values.
var ValidRoles = map[Role]bool{
	RoleFarmer:     true,
	RoleBuyer:      true,
	RoleSupplier:   true,
	RoleLGUStaff:   true,
	RoleSuperAdmin: true,
}

// IsValidRole checks whether a given role string is valid.
func IsValidRole(r Role) bool {
	return ValidRoles[r]
}

// User represents a user account in the system.
type User struct {
	ID           bson.ObjectID `bson:"_id,omitempty" json:"id"`
	Email        string        `bson:"email"         json:"email"`
	Password     string        `bson:"password"      json:"-"`
	Role         Role          `bson:"role"          json:"role"`
	FirstName    string        `bson:"first_name"    json:"firstName"`
	LastName     string        `bson:"last_name"     json:"lastName"`
	Phone        string        `bson:"phone,omitempty"        json:"phone,omitempty"`
	Region       string        `bson:"region,omitempty"       json:"region,omitempty"`
	Province     string        `bson:"province,omitempty"     json:"province,omitempty"`
	Municipality string        `bson:"municipality,omitempty" json:"municipality,omitempty"`
	Barangay     string        `bson:"barangay,omitempty"     json:"barangay,omitempty"`
	Address      string        `bson:"address,omitempty"      json:"address,omitempty"`
	PhotoURL     string        `bson:"photo_url,omitempty"     json:"photoUrl,omitempty"`
	// Payment & Payout receiving accounts
	GCashNumber     string `bson:"gcash_number,omitempty"     json:"gcashNumber,omitempty"`
	GCashName       string `bson:"gcash_name,omitempty"       json:"gcashName,omitempty"`
	GCashQrURL      string `bson:"gcash_qr_url,omitempty"     json:"gcashQrUrl,omitempty"`
	MayaNumber      string `bson:"maya_number,omitempty"      json:"mayaNumber,omitempty"`
	MayaName        string `bson:"maya_name,omitempty"        json:"mayaName,omitempty"`
	MayaQrURL       string `bson:"maya_qr_url,omitempty"      json:"mayaQrUrl,omitempty"`
	BankName        string `bson:"bank_name,omitempty"        json:"bankName,omitempty"`
	BankAccountNo   string `bson:"bank_account_no,omitempty"  json:"bankAccountNo,omitempty"`
	BankAccountName string `bson:"bank_account_name,omitempty" json:"bankAccountName,omitempty"`
	BankQrURL       string `bson:"bank_qr_url,omitempty"       json:"bankQrUrl,omitempty"`

	IsVerified bool      `bson:"is_verified"             json:"isVerified"`
	Status     string    `bson:"status"                  json:"status"`
	CreatedAt  time.Time `bson:"created_at"              json:"createdAt"`
	UpdatedAt  time.Time `bson:"updated_at"              json:"updatedAt"`
}

// RegisterRequest is the JSON body for POST /api/auth/register.
type RegisterRequest struct {
	Email        string `json:"email"`
	Password     string `json:"password"`
	Role         Role   `json:"role"`
	FirstName    string `json:"firstName"`
	LastName     string `json:"lastName"`
	Region       string `json:"region,omitempty"`
	Province     string `json:"province,omitempty"`
	Municipality string `json:"municipality,omitempty"`
	Barangay     string `json:"barangay,omitempty"`
}

// LoginRequest is the JSON body for POST /api/auth/login.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// AuthResponse is returned after successful login or registration.
type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// UpdateProfileRequest is the JSON body for PUT /api/users/me.
type UpdateProfileRequest struct {
	FirstName    *string `json:"firstName,omitempty"`
	LastName     *string `json:"lastName,omitempty"`
	Phone        *string `json:"phone,omitempty"`
	Region       *string `json:"region,omitempty"`
	Province     *string `json:"province,omitempty"`
	Municipality *string `json:"municipality,omitempty"`
	Barangay     *string `json:"barangay,omitempty"`
	Address      *string `json:"address,omitempty"`

	// Payment receiving account updates
	GCashNumber     *string `json:"gcashNumber,omitempty"`
	GCashName       *string `json:"gcashName,omitempty"`
	GCashQrURL      *string `json:"gcashQrUrl,omitempty"`
	MayaNumber      *string `json:"mayaNumber,omitempty"`
	MayaName        *string `json:"mayaName,omitempty"`
	MayaQrURL       *string `json:"mayaQrUrl,omitempty"`
	BankName        *string `json:"bankName,omitempty"`
	BankAccountNo   *string `json:"bankAccountNo,omitempty"`
	BankAccountName *string `json:"bankAccountName,omitempty"`
	BankQrURL       *string `json:"bankQrUrl,omitempty"`
}

// ChangePasswordRequest is the JSON body for PUT /api/users/me/password.
type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

// ErrorResponse is a standard error payload.
type ErrorResponse struct {
	Error string `json:"error"`
}

// PublicUserProfile contains non-sensitive public seller/farmer details and payment accounts.
type PublicUserProfile struct {
	ID              string   `json:"id"`
	FirstName       string   `json:"firstName"`
	LastName        string   `json:"lastName"`
	Role            Role     `json:"role"`
	Phone           string   `json:"phone,omitempty"`
	Region          string   `json:"region,omitempty"`
	Province        string   `json:"province,omitempty"`
	Municipality    string   `json:"municipality,omitempty"`
	Barangay        string   `json:"barangay,omitempty"`
	Address         string   `json:"address,omitempty"`
	GCashNumber     string   `json:"gcashNumber,omitempty"`
	GCashName       string   `json:"gcashName,omitempty"`
	GCashQrURL      string   `json:"gcashQrUrl,omitempty"`
	MayaNumber      string   `json:"mayaNumber,omitempty"`
	MayaName        string   `json:"mayaName,omitempty"`
	MayaQrURL       string   `json:"mayaQrUrl,omitempty"`
	BankName        string   `json:"bankName,omitempty"`
	BankAccountNo   string   `json:"bankAccountNo,omitempty"`
	BankAccountName string   `json:"bankAccountName,omitempty"`
	BankQrURL       string   `json:"bankQrUrl,omitempty"`
}

