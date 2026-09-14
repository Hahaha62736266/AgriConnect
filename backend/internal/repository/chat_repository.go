package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/agriconnect/backend/internal/models"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var ErrConversationNotFound = errors.New("conversation not found")

type ChatRepository struct {
	db              *mongo.Database
	conversationCol *mongo.Collection
	messageCol      *mongo.Collection
}

func NewChatRepository(db *mongo.Database) *ChatRepository {
	repo := &ChatRepository{
		db:              db,
		conversationCol: db.Collection("conversations"),
		messageCol:      db.Collection("chat_messages"),
	}
	repo.ensureIndexes()
	return repo
}

func (r *ChatRepository) ensureIndexes() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Index participant_ids on conversations
	_, _ = r.conversationCol.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "participant_ids", Value: 1}},
	})

	// Index conversation_id & created_at on chat_messages
	_, _ = r.messageCol.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "conversation_id", Value: 1},
			{Key: "created_at", Value: 1},
		},
	})

	// Index recipient_id & is_read for rapid unread count queries
	_, _ = r.messageCol.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "recipient_id", Value: 1},
			{Key: "is_read", Value: 1},
		},
	})
}

// FindOrCreateConversation finds an existing conversation between two participants or creates a new one.
func (r *ChatRepository) FindOrCreateConversation(
	ctx context.Context,
	userAID bson.ObjectID,
	userBID bson.ObjectID,
	chatCtx *models.ChatContext,
	participants []models.ConversationParticipant,
) (*models.Conversation, error) {
	filter := bson.M{
		"participant_ids": bson.M{
			"$all": []bson.ObjectID{userAID, userBID},
		},
	}

	var conv models.Conversation
	err := r.conversationCol.FindOne(ctx, filter).Decode(&conv)
	if err == nil {
		// Existing conversation found. Update context and participants if provided.
		updateFields := bson.M{
			"updated_at": time.Now(),
		}
		if chatCtx != nil {
			updateFields["context"] = chatCtx
			conv.Context = chatCtx
		}
		if len(participants) > 0 {
			updateFields["participants"] = participants
			conv.Participants = participants
		}

		_, _ = r.conversationCol.UpdateOne(ctx, bson.M{"_id": conv.ID}, bson.M{"$set": updateFields})
		return &conv, nil
	}

	if !errors.Is(err, mongo.ErrNoDocuments) {
		return nil, fmt.Errorf("find conversation: %w", err)
	}

	// Create new conversation
	newConv := models.Conversation{
		ID:             bson.NewObjectID(),
		ParticipantIDs: []bson.ObjectID{userAID, userBID},
		Participants:   participants,
		Context:        chatCtx,
		UnreadCounts: map[string]int{
			userAID.Hex(): 0,
			userBID.Hex(): 0,
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	_, err = r.conversationCol.InsertOne(ctx, &newConv)
	if err != nil {
		return nil, fmt.Errorf("create conversation: %w", err)
	}

	return &newConv, nil
}

// ListUserConversations returns all conversations a user participates in, sorted by latest activity.
func (r *ChatRepository) ListUserConversations(ctx context.Context, userID bson.ObjectID) ([]models.Conversation, error) {
	filter := bson.M{"participant_ids": userID}
	opts := options.Find().SetSort(bson.M{"updated_at": -1}).SetLimit(50)

	cursor, err := r.conversationCol.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("list user conversations: %w", err)
	}
	defer cursor.Close(ctx)

	var convs []models.Conversation
	if err := cursor.All(ctx, &convs); err != nil {
		return nil, fmt.Errorf("decode user conversations: %w", err)
	}
	if convs == nil {
		convs = []models.Conversation{}
	}
	return convs, nil
}

// ListLGUConversations returns conversations for LGU staff (direct chats + LGU municipal support threads).
func (r *ChatRepository) ListLGUConversations(ctx context.Context, userID bson.ObjectID, municipality, province string) ([]models.Conversation, error) {
	filter := bson.M{
		"$or": []bson.M{
			{"participant_ids": userID},
			{"participants.role": string(models.RoleLGUStaff)},
		},
	}
	opts := options.Find().SetSort(bson.M{"updated_at": -1}).SetLimit(50)

	cursor, err := r.conversationCol.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("list lgu conversations: %w", err)
	}
	defer cursor.Close(ctx)

	var convs []models.Conversation
	if err := cursor.All(ctx, &convs); err != nil {
		return nil, fmt.Errorf("decode lgu conversations: %w", err)
	}
	if convs == nil {
		convs = []models.Conversation{}
	}
	return convs, nil
}

// ListSuperAdminConversations returns conversations for Super Admin (direct chats + platform support threads).
func (r *ChatRepository) ListSuperAdminConversations(ctx context.Context, userID bson.ObjectID) ([]models.Conversation, error) {
	filter := bson.M{
		"$or": []bson.M{
			{"participant_ids": userID},
			{"participants.role": string(models.RoleSuperAdmin)},
		},
	}
	opts := options.Find().SetSort(bson.M{"updated_at": -1}).SetLimit(50)

	cursor, err := r.conversationCol.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("list admin conversations: %w", err)
	}
	defer cursor.Close(ctx)

	var convs []models.Conversation
	if err := cursor.All(ctx, &convs); err != nil {
		return nil, fmt.Errorf("decode admin conversations: %w", err)
	}
	if convs == nil {
		convs = []models.Conversation{}
	}
	return convs, nil
}

// GetConversationByID retrieves a conversation by ID.
func (r *ChatRepository) GetConversationByID(ctx context.Context, convID bson.ObjectID) (*models.Conversation, error) {
	var conv models.Conversation
	err := r.conversationCol.FindOne(ctx, bson.M{"_id": convID}).Decode(&conv)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrConversationNotFound
		}
		return nil, fmt.Errorf("get conversation: %w", err)
	}
	return &conv, nil
}

// CreateMessage saves a chat message and updates the conversation summary & unread counts.
func (r *ChatRepository) CreateMessage(ctx context.Context, msg *models.ChatMessage) error {
	msg.ID = bson.NewObjectID()
	msg.CreatedAt = time.Now()
	msg.IsRead = false

	_, err := r.messageCol.InsertOne(ctx, msg)
	if err != nil {
		return fmt.Errorf("insert message: %w", err)
	}

	// Update conversation's last_message, updated_at, and increment recipient unread count
	recipientKey := fmt.Sprintf("unread_counts.%s", msg.RecipientID.Hex())
	update := bson.M{
		"$set": bson.M{
			"last_message": models.LastMessageSummary{
				SenderID:  msg.SenderID,
				Content:   msg.Content,
				CreatedAt: msg.CreatedAt,
			},
			"updated_at": msg.CreatedAt,
		},
		"$inc": bson.M{
			recipientKey: 1,
		},
	}

	_, _ = r.conversationCol.UpdateOne(ctx, bson.M{"_id": msg.ConversationID}, update)
	return nil
}

// ListMessages returns messages for a conversation ordered chronologically.
func (r *ChatRepository) ListMessages(ctx context.Context, convID bson.ObjectID, limit int) ([]models.ChatMessage, error) {
	if limit <= 0 {
		limit = 100
	}
	opts := options.Find().SetSort(bson.M{"created_at": 1}).SetLimit(int64(limit))
	cursor, err := r.messageCol.Find(ctx, bson.M{"conversation_id": convID}, opts)
	if err != nil {
		return nil, fmt.Errorf("list messages: %w", err)
	}
	defer cursor.Close(ctx)

	var messages []models.ChatMessage
	if err := cursor.All(ctx, &messages); err != nil {
		return nil, fmt.Errorf("decode messages: %w", err)
	}
	if messages == nil {
		messages = []models.ChatMessage{}
	}
	return messages, nil
}

// MarkConversationAsRead marks all unread messages in the conversation for the recipient as read and resets unread count.
func (r *ChatRepository) MarkConversationAsRead(ctx context.Context, convID, userID bson.ObjectID) error {
	// Mark messages read
	msgFilter := bson.M{
		"conversation_id": convID,
		"recipient_id":    userID,
		"is_read":         false,
	}
	_, err := r.messageCol.UpdateMany(ctx, msgFilter, bson.M{"$set": bson.M{"is_read": true}})
	if err != nil {
		return fmt.Errorf("mark messages read: %w", err)
	}

	// Reset conversation unread count for this user
	recipientKey := fmt.Sprintf("unread_counts.%s", userID.Hex())
	_, err = r.conversationCol.UpdateOne(ctx, bson.M{"_id": convID}, bson.M{
		"$set": bson.M{
			recipientKey: 0,
		},
	})
	if err != nil {
		return fmt.Errorf("reset conversation unread count: %w", err)
	}

	return nil
}

// GetTotalUnreadCount returns the number of unread messages across all conversations for a user.
func (r *ChatRepository) GetTotalUnreadCount(ctx context.Context, userID bson.ObjectID) (int, error) {
	count, err := r.messageCol.CountDocuments(ctx, bson.M{"recipient_id": userID, "is_read": false})
	if err != nil {
		return 0, fmt.Errorf("count unread messages: %w", err)
	}
	return int(count), nil
}
