package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

// PasswordResetToken represents a one-time-use password reset token stored in MongoDB.
type PasswordResetToken struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    bson.ObjectID `bson:"user_id"       json:"userId"`
	Token     string        `bson:"token"         json:"token"`
	ExpiresAt time.Time     `bson:"expires_at"    json:"expiresAt"`
	Used      bool          `bson:"used"          json:"used"`
	CreatedAt time.Time     `bson:"created_at"    json:"createdAt"`
}

// ForgotPasswordRequest is the JSON body for POST /api/auth/forgot-password.
type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

// ResetPasswordRequest is the JSON body for POST /api/auth/reset-password.
type ResetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"newPassword"`
}
