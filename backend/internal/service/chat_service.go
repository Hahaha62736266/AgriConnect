package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/agriconnect/backend/internal/models"
	"github.com/agriconnect/backend/internal/repository"
	"go.mongodb.org/mongo-driver/v2/bson"
)

var (
	ErrSelfChat       = errors.New("cannot chat with yourself")
	ErrNotParticipant = errors.New("unauthorized: not a participant in this conversation")
)

type ChatService struct {
	chatRepo  *repository.ChatRepository
	userRepo  *repository.UserRepository
	notifRepo *repository.NotificationRepository
}

func NewChatService(
	chatRepo *repository.ChatRepository,
	userRepo *repository.UserRepository,
	notifRepo *repository.NotificationRepository,
) *ChatService {
	return &ChatService{
		chatRepo:  chatRepo,
		userRepo:  userRepo,
		notifRepo: notifRepo,
	}
}

// FindOrCreateConversation retrieves an existing chat between two users or creates a new one.
func (s *ChatService) FindOrCreateConversation(
	ctx context.Context,
	currentUserIDStr string,
	recipientIDStr string,
	chatCtx *models.ChatContext,
	initialMessage string,
) (*models.Conversation, error) {
	if currentUserIDStr == recipientIDStr {
		return nil, ErrSelfChat
	}

	currentUID, err := bson.ObjectIDFromHex(currentUserIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid sender ID: %w", err)
	}

	recipientUID, err := bson.ObjectIDFromHex(recipientIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid recipient ID: %w", err)
	}

	// Fetch participant user records
	currentUser, err := s.userRepo.FindByID(ctx, currentUID)
	if err != nil {
		return nil, fmt.Errorf("lookup sender user: %w", err)
	}

	recipientUser, err := s.userRepo.FindByID(ctx, recipientUID)
	if err != nil {
		return nil, fmt.Errorf("lookup recipient user: %w", err)
	}

	currentUserName := strings.TrimSpace(currentUser.FirstName + " " + currentUser.LastName)
	if currentUserName == "" {
		currentUserName = currentUser.Email
	}

	recipientUserName := strings.TrimSpace(recipientUser.FirstName + " " + recipientUser.LastName)
	if recipientUserName == "" {
		recipientUserName = recipientUser.Email
	}

	participants := []models.ConversationParticipant{
		{
			UserID:   currentUser.ID,
			Name:     currentUserName,
			Role:     currentUser.Role,
			PhotoURL: currentUser.PhotoURL,
		},
		{
			UserID:   recipientUser.ID,
			Name:     recipientUserName,
			Role:     recipientUser.Role,
			PhotoURL: recipientUser.PhotoURL,
		},
	}

	conv, err := s.chatRepo.FindOrCreateConversation(ctx, currentUID, recipientUID, chatCtx, participants)
	if err != nil {
		return nil, err
	}

	// If an initial message or product card inquiry is requested, send it immediately
	if strings.TrimSpace(initialMessage) != "" || (chatCtx != nil && chatCtx.Title != "") {
		content := strings.TrimSpace(initialMessage)
		var pCard *models.ProductCard

		if chatCtx != nil && chatCtx.Title != "" {
			pCard = &models.ProductCard{
				Type:  chatCtx.Type,
				ID:    chatCtx.ReferenceID,
				Title: chatCtx.Title,
				Image: chatCtx.Image,
				Price: chatCtx.Price,
				Unit:  chatCtx.Unit,
			}
			if content == "" {
				content = fmt.Sprintf("Hi! I'm inquiring about %s.", chatCtx.Title)
			}
		}

		_, _ = s.SendMessage(ctx, conv.ID.Hex(), currentUserIDStr, content, pCard)
		// Reload updated conversation with last_message
		conv, _ = s.chatRepo.GetConversationByID(ctx, conv.ID)
	}

	return conv, nil
}

// ListConversations returns all conversations for a user (or municipal inbox for LGU Staff).
func (s *ChatService) ListConversations(ctx context.Context, userIDStr string) ([]models.Conversation, error) {
	uOID, err := bson.ObjectIDFromHex(userIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	currentUser, err := s.userRepo.FindByID(ctx, uOID)
	if err == nil && currentUser != nil {
		if currentUser.Role == models.RoleLGUStaff {
			return s.chatRepo.ListLGUConversations(ctx, uOID, currentUser.Municipality, currentUser.Province)
		}
		if currentUser.Role == models.RoleSuperAdmin {
			return s.chatRepo.ListSuperAdminConversations(ctx, uOID)
		}
	}

	return s.chatRepo.ListUserConversations(ctx, uOID)
}

// GetConversationByID returns a conversation if the user is a participant or role-authorized.
func (s *ChatService) GetConversationByID(ctx context.Context, convIDStr, userIDStr string) (*models.Conversation, error) {
	cOID, err := bson.ObjectIDFromHex(convIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid conversation ID: %w", err)
	}
	uOID, err := bson.ObjectIDFromHex(userIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	conv, err := s.chatRepo.GetConversationByID(ctx, cOID)
	if err != nil {
		return nil, err
	}

	currentUser, _ := s.userRepo.FindByID(ctx, uOID)

	isParticipant := false
	for _, p := range conv.ParticipantIDs {
		if p == uOID {
			isParticipant = true
			break
		}
	}
	if !isParticipant && currentUser != nil {
		for _, part := range conv.Participants {
			if part.Role == currentUser.Role {
				isParticipant = true
				break
			}
		}
	}
	if !isParticipant {
		return nil, ErrNotParticipant
	}

	return conv, nil
}

// ListMessages fetches messages in a conversation.
func (s *ChatService) ListMessages(ctx context.Context, convIDStr, userIDStr string) ([]models.ChatMessage, error) {
	cOID, err := bson.ObjectIDFromHex(convIDStr)
	if err != nil {
		return []models.ChatMessage{}, nil
	}

	_, err = s.GetConversationByID(ctx, convIDStr, userIDStr)
	if err != nil {
		return nil, err
	}

	return s.chatRepo.ListMessages(ctx, cOID, 100)
}

// SendMessage delivers a new message to a conversation.
func (s *ChatService) SendMessage(
	ctx context.Context,
	convIDStr, senderIDStr, content string,
	productCard *models.ProductCard,
) (*models.ChatMessage, error) {
	conv, err := s.GetConversationByID(ctx, convIDStr, senderIDStr)
	if err != nil {
		return nil, err
	}

	senderUID, _ := bson.ObjectIDFromHex(senderIDStr)
	var recipientUID bson.ObjectID
	for _, p := range conv.ParticipantIDs {
		if p != senderUID {
			recipientUID = p
			break
		}
	}
	if recipientUID.IsZero() {
		return nil, errors.New("recipient not found in conversation")
	}

	senderUser, err := s.userRepo.FindByID(ctx, senderUID)
	if err != nil {
		return nil, fmt.Errorf("find sender user: %w", err)
	}

	senderName := strings.TrimSpace(senderUser.FirstName + " " + senderUser.LastName)
	if senderName == "" {
		senderName = senderUser.Email
	}

	msg := &models.ChatMessage{
		ConversationID: conv.ID,
		SenderID:       senderUID,
		SenderName:     senderName,
		SenderRole:     senderUser.Role,
		SenderPhoto:    senderUser.PhotoURL,
		RecipientID:    recipientUID,
		Content:        content,
		ProductCard:    productCard,
	}

	if err := s.chatRepo.CreateMessage(ctx, msg); err != nil {
		return nil, err
	}

	// Trigger in-app notification to the recipient
	if s.notifRepo != nil {
		preview := content
		if len(preview) > 60 {
			preview = preview[:60] + "..."
		}
		_ = s.notifRepo.CreateNotification(ctx, &models.Notification{
			UserID:  recipientUID,
			Title:   fmt.Sprintf("💬 Message from %s", senderName),
			Message: preview,
			Type:    models.NotificationType("chat_message"),
			Link:    "/messages",
		})
	}

	return msg, nil
}

// MarkAsRead marks all messages in the conversation as read for the user.
func (s *ChatService) MarkAsRead(ctx context.Context, convIDStr, userIDStr string) error {
	cOID, err := bson.ObjectIDFromHex(convIDStr)
	if err != nil {
		return nil
	}
	uOID, err := bson.ObjectIDFromHex(userIDStr)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	return s.chatRepo.MarkConversationAsRead(ctx, cOID, uOID)
}

// GetTotalUnreadCount returns total unread messages across all chats.
func (s *ChatService) GetTotalUnreadCount(ctx context.Context, userIDStr string) (int, error) {
	uOID, err := bson.ObjectIDFromHex(userIDStr)
	if err != nil {
		return 0, fmt.Errorf("invalid user ID: %w", err)
	}
	return s.chatRepo.GetTotalUnreadCount(ctx, uOID)
}
