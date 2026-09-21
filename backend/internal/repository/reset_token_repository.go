package repository

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/agriconnect/backend/internal/models"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var ErrTokenNotFound = errors.New("reset token not found or expired")

// ResetTokenRepository manages password reset tokens in MongoDB.
type ResetTokenRepository struct {
	coll *mongo.Collection
}

// NewResetTokenRepository creates a new repository and ensures indexes.
func NewResetTokenRepository(db *mongo.Database) *ResetTokenRepository {
	repo := &ResetTokenRepository{
		coll: db.Collection("password_reset_tokens"),
	}
	repo.ensureIndexes()
	return repo
}

func (r *ResetTokenRepository) ensureIndexes() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, _ = r.coll.Indexes().CreateMany(ctx, []mongo.IndexModel{
		// Fast lookup by hashed token
		{Keys: bson.D{{Key: "token", Value: 1}}, Options: options.Index().SetUnique(true)},
		// Auto-delete expired tokens (MongoDB TTL index)
		{Keys: bson.D{{Key: "expires_at", Value: 1}}, Options: options.Index().SetExpireAfterSeconds(0)},
		// Lookup all tokens for a user (cleanup)
		{Keys: bson.D{{Key: "user_id", Value: 1}}},
	})
}

// HashToken returns a SHA-256 hex digest of the raw token.
// We store the hash, never the raw token, so a DB breach won't compromise tokens.
func HashToken(raw string) string {
	h := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(h[:])
}

// Create inserts a new password reset token.
func (r *ResetTokenRepository) Create(ctx context.Context, token *models.PasswordResetToken) error {
	token.CreatedAt = time.Now()
	_, err := r.coll.InsertOne(ctx, token)
	if err != nil {
		return fmt.Errorf("insert reset token: %w", err)
	}
	return nil
}

// FindByToken looks up a valid (non-expired, non-used) token by its hash.
func (r *ResetTokenRepository) FindByToken(ctx context.Context, tokenHash string) (*models.PasswordResetToken, error) {
	filter := bson.M{
		"token":      tokenHash,
		"used":       false,
		"expires_at": bson.M{"$gt": time.Now()},
	}

	var tok models.PasswordResetToken
	err := r.coll.FindOne(ctx, filter).Decode(&tok)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrTokenNotFound
		}
		return nil, fmt.Errorf("find reset token: %w", err)
	}
	return &tok, nil
}

// MarkUsed sets the used flag to true so the token cannot be reused.
func (r *ResetTokenRepository) MarkUsed(ctx context.Context, id bson.ObjectID) error {
	_, err := r.coll.UpdateByID(ctx, id, bson.M{"$set": bson.M{"used": true}})
	if err != nil {
		return fmt.Errorf("mark token used: %w", err)
	}
	return nil
}

// DeleteByUserID removes all existing tokens for a user (housekeeping before issuing a new one).
func (r *ResetTokenRepository) DeleteByUserID(ctx context.Context, userID bson.ObjectID) error {
	_, err := r.coll.DeleteMany(ctx, bson.M{"user_id": userID})
	if err != nil {
		return fmt.Errorf("delete tokens for user: %w", err)
	}
	return nil
}
