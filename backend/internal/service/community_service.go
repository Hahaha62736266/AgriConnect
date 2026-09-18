package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/agriconnect/backend/internal/models"
	"github.com/agriconnect/backend/internal/repository"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type CommunityService struct {
	commRepo  *repository.CommunityRepository
	userRepo  *repository.UserRepository
	notifRepo *repository.NotificationRepository
}

func NewCommunityService(commRepo *repository.CommunityRepository, userRepo *repository.UserRepository, notifRepo *repository.NotificationRepository) *CommunityService {
	return &CommunityService{
		commRepo:  commRepo,
		userRepo:  userRepo,
		notifRepo: notifRepo,
	}
}

// CreatePost creates a new discussion post.
func (s *CommunityService) CreatePost(ctx context.Context, authorID string, req models.CreatePostRequest) (*models.Post, error) {
	aOID, err := bson.ObjectIDFromHex(authorID)
	if err != nil {
		return nil, fmt.Errorf("invalid author ID: %w", err)
	}

	if req.Body == "" && req.ImageUrl == "" && req.VideoUrl == "" && req.SharedPostID == "" {
		return nil, errors.New("post must contain text, an image, a video, or a shared post")
	}

	user, err := s.userRepo.FindByID(ctx, aOID)
	if err != nil {
		return nil, fmt.Errorf("fetch author info: %w", err)
	}

	title := req.Title
	if title == "" {
		if req.Body != "" {
			runes := []rune(req.Body)
			if len(runes) > 60 {
				title = string(runes[:57]) + "..."
			} else {
				title = req.Body
			}
		} else if req.VideoUrl != "" {
			title = "Shared a video"
		} else if req.ImageUrl != "" {
			title = "Shared a photo"
		} else {
			title = "Shared a post"
		}
	}

	category := req.Category
	if category == "" {
		category = models.PostCategoryGeneral
	}

	post := &models.Post{
		AuthorID:       aOID,
		AuthorName:     user.FirstName + " " + user.LastName,
		AuthorRole:     user.Role,
		AuthorPhotoUrl: user.PhotoURL,
		Title:          title,
		Body:           req.Body,
		Category:       category,
		ImageUrl:       req.ImageUrl,
		VideoUrl:       req.VideoUrl,
	}

	if req.SharedPostID != "" {
		if sOID, err := bson.ObjectIDFromHex(req.SharedPostID); err == nil {
			post.SharedPostID = &sOID
			if origPost, err := s.commRepo.GetPostByID(ctx, sOID, ""); err == nil && origPost != nil {
				post.SharedPost = origPost
				// Send notification to the original post author
				if s.notifRepo != nil && origPost.AuthorID != aOID {
					_ = s.notifRepo.CreateNotification(ctx, &models.Notification{
						UserID:  origPost.AuthorID,
						Title:   "🔄 Post Shared",
						Message: fmt.Sprintf("%s shared your post to the community.", post.AuthorName),
						Type:    models.NotifTypeCommunityReply,
						Link:    fmt.Sprintf("/community/posts/%s", post.ID.Hex()),
					})
				}
			}
		}
	}

	if err := s.commRepo.CreatePost(ctx, post); err != nil {
		return nil, err
	}
	return post, nil
}

func (s *CommunityService) enrichSharedPosts(ctx context.Context, posts []models.Post) []models.Post {
	cache := make(map[bson.ObjectID]*models.Post)
	for i := range posts {
		if posts[i].SharedPostID != nil {
			if cached, ok := cache[*posts[i].SharedPostID]; ok {
				posts[i].SharedPost = cached
			} else {
				if orig, err := s.commRepo.GetPostByID(ctx, *posts[i].SharedPostID, ""); err == nil && orig != nil {
					cache[*posts[i].SharedPostID] = orig
					posts[i].SharedPost = orig
				}
			}
		}
	}
	return posts
}

// ListPosts fetches posts filtered by category.
func (s *CommunityService) ListPosts(ctx context.Context, category string, currentUserID string) ([]models.Post, error) {
	posts, err := s.commRepo.ListPosts(ctx, category, currentUserID)
	if err != nil {
		return nil, err
	}
	return s.enrichSharedPosts(ctx, posts), nil
}

// GetPostByID fetches a single post.
func (s *CommunityService) GetPostByID(ctx context.Context, postIDStr string, currentUserID string) (*models.Post, error) {
	pOID, err := bson.ObjectIDFromHex(postIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid post ID: %w", err)
	}
	post, err := s.commRepo.GetPostByID(ctx, pOID, currentUserID)
	if err != nil {
		return nil, err
	}
	if post != nil && post.SharedPostID != nil {
		if orig, err := s.commRepo.GetPostByID(ctx, *post.SharedPostID, ""); err == nil && orig != nil {
			post.SharedPost = orig
		}
	}
	return post, nil
}

// ReactToPost handles LinkedIn-style multi-reactions on a post.
func (s *CommunityService) ReactToPost(ctx context.Context, postIDStr string, userIDStr string, reaction models.ReactionType) (*models.Post, error) {
	pOID, err := bson.ObjectIDFromHex(postIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid post ID: %w", err)
	}
	uOID, err := bson.ObjectIDFromHex(userIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	// Validate reaction
	validReactions := map[models.ReactionType]bool{
		models.ReactionLike:      true,
		models.ReactionCelebrate: true,
		models.ReactionSupport:   true,
		models.ReactionLove:      true,
		models.ReactionInsight:   true,
		models.ReactionFunny:     true,
	}
	if !validReactions[reaction] {
		reaction = models.ReactionLike
	}

	user, err := s.userRepo.FindByID(ctx, uOID)
	if err != nil {
		return nil, fmt.Errorf("fetch reacting user: %w", err)
	}
	userName := user.FirstName + " " + user.LastName

	updatedPost, err := s.commRepo.ReactToPost(ctx, pOID, uOID, userName, user.Role, user.PhotoURL, reaction)
	if err != nil {
		return nil, err
	}

	// If reacted (not un-reacted) and user is not the post author, notify post author
	if updatedPost.MyReaction != "" && updatedPost.AuthorID != uOID && s.notifRepo != nil {
		emoji := "👍"
		switch updatedPost.MyReaction {
		case models.ReactionCelebrate:
			emoji = "👏"
		case models.ReactionSupport:
			emoji = "🤝"
		case models.ReactionLove:
			emoji = "❤️"
		case models.ReactionInsight:
			emoji = "💡"
		case models.ReactionFunny:
			emoji = "😄"
		}

		_ = s.notifRepo.CreateNotification(ctx, &models.Notification{
			UserID:  updatedPost.AuthorID,
			Title:   fmt.Sprintf("%s New Reaction on Your Post", emoji),
			Message: fmt.Sprintf("%s reacted to \"%s\"", userName, updatedPost.Title),
			Type:    models.NotifTypeCommunityReply,
			Link:    fmt.Sprintf("/community/post/%s", postIDStr),
		})
	}

	return updatedPost, nil
}

// GetPostReactions retrieves all enriched user reactions for a post.
func (s *CommunityService) GetPostReactions(ctx context.Context, postIDStr string) ([]models.PostReaction, error) {
	pOID, err := bson.ObjectIDFromHex(postIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid post ID: %w", err)
	}

	post, err := s.commRepo.GetPostByID(ctx, pOID, "")
	if err != nil {
		return nil, err
	}

	// Gather user IDs that need user profile enrichment
	userIDsMap := make(map[bson.ObjectID]bool)
	for _, r := range post.Reactions {
		if !r.UserID.IsZero() {
			userIDsMap[r.UserID] = true
		}
	}
	for _, uID := range post.UpvotedBy {
		if !uID.IsZero() {
			userIDsMap[uID] = true
		}
	}

	userIDs := make([]bson.ObjectID, 0, len(userIDsMap))
	for id := range userIDsMap {
		userIDs = append(userIDs, id)
	}

	profilesMap := make(map[bson.ObjectID]models.User)
	if len(userIDs) > 0 {
		users, err := s.userRepo.FindUsers(ctx, bson.M{"_id": bson.M{"$in": userIDs}})
		if err == nil {
			for _, u := range users {
				profilesMap[u.ID] = u
			}
		}
	}

	result := make([]models.PostReaction, 0, len(post.Reactions))
	reactedUserIDs := make(map[bson.ObjectID]bool)

	// Enrich existing reactions
	for _, r := range post.Reactions {
		reactionCopy := r
		if u, found := profilesMap[r.UserID]; found {
			if reactionCopy.UserName == "" {
				reactionCopy.UserName = u.FirstName + " " + u.LastName
			}
			if reactionCopy.UserRole == "" {
				reactionCopy.UserRole = u.Role
			}
			if reactionCopy.UserPhotoUrl == "" {
				reactionCopy.UserPhotoUrl = u.PhotoURL
			}
		}
		result = append(result, reactionCopy)
		reactedUserIDs[r.UserID] = true
	}

	// If legacy upvotes exist that weren't in reactions, synthesize them as 'like'
	for _, uID := range post.UpvotedBy {
		if !reactedUserIDs[uID] {
			if u, found := profilesMap[uID]; found {
				result = append(result, models.PostReaction{
					UserID:       uID,
					UserName:     u.FirstName + " " + u.LastName,
					UserRole:     u.Role,
					UserPhotoUrl: u.PhotoURL,
					Type:         models.ReactionLike,
					CreatedAt:    post.CreatedAt,
				})
				reactedUserIDs[uID] = true
			}
		}
	}

	return result, nil
}

// ToggleUpvote toggles an upvote on a post.
func (s *CommunityService) ToggleUpvote(ctx context.Context, postIDStr string, userIDStr string) (bool, error) {
	pOID, err := bson.ObjectIDFromHex(postIDStr)
	if err != nil {
		return false, fmt.Errorf("invalid post ID: %w", err)
	}
	uOID, err := bson.ObjectIDFromHex(userIDStr)
	if err != nil {
		return false, fmt.Errorf("invalid user ID: %w", err)
	}
	return s.commRepo.ToggleUpvote(ctx, pOID, uOID)
}

// CreateComment adds a comment/answer to a post.
func (s *CommunityService) CreateComment(ctx context.Context, authorID string, postIDStr string, req models.CreateCommentRequest) (*models.Comment, error) {
	aOID, err := bson.ObjectIDFromHex(authorID)
	if err != nil {
		return nil, fmt.Errorf("invalid author ID: %w", err)
	}
	pOID, err := bson.ObjectIDFromHex(postIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid post ID: %w", err)
	}

	if req.Body == "" {
		return nil, errors.New("comment text is required")
	}

	user, err := s.userRepo.FindByID(ctx, aOID)
	if err != nil {
		return nil, fmt.Errorf("fetch author info: %w", err)
	}

	comment := &models.Comment{
		PostID:         pOID,
		AuthorID:       aOID,
		AuthorName:     user.FirstName + " " + user.LastName,
		AuthorRole:     user.Role,
		AuthorPhotoUrl: user.PhotoURL,
		Body:           req.Body,
	}

	if err := s.commRepo.CreateComment(ctx, comment); err != nil {
		return nil, err
	}

	// Trigger notification to the post author if commenter is someone else
	if s.notifRepo != nil {
		post, err := s.commRepo.GetPostByID(ctx, pOID, authorID)
		if err == nil && post.AuthorID != aOID {
			_ = s.notifRepo.CreateNotification(ctx, &models.Notification{
				UserID:  post.AuthorID,
				Title:   "💬 New Comment on Your Post",
				Message: fmt.Sprintf("%s commented: \"%s\"", comment.AuthorName, req.Body),
				Type:    models.NotifTypeCommunityReply,
				Link:    fmt.Sprintf("/community/post/%s", postIDStr),
			})
		}
	}

	return comment, nil
}

// ListCommentsByPost fetches comments for a post thread.
func (s *CommunityService) ListCommentsByPost(ctx context.Context, postIDStr string) ([]models.Comment, error) {
	pOID, err := bson.ObjectIDFromHex(postIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid post ID: %w", err)
	}
	comments, err := s.commRepo.ListCommentsByPost(ctx, pOID)
	if err != nil {
		return nil, err
	}

	for i := range comments {
		if comments[i].AuthorPhotoUrl == "" || comments[i].AuthorRole == "" {
			if u, err := s.userRepo.FindByID(ctx, comments[i].AuthorID); err == nil && u != nil {
				if comments[i].AuthorPhotoUrl == "" {
					comments[i].AuthorPhotoUrl = u.PhotoURL
				}
				if comments[i].AuthorRole == "" {
					comments[i].AuthorRole = u.Role
				}
			}
		}
	}

	return comments, nil
}

// UpdatePost updates a post owned by the given author.
func (s *CommunityService) UpdatePost(ctx context.Context, postIDStr string, authorIDStr string, req models.UpdatePostRequest) (*models.Post, error) {
	pOID, err := bson.ObjectIDFromHex(postIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid post ID: %w", err)
	}
	aOID, err := bson.ObjectIDFromHex(authorIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid author ID: %w", err)
	}

	if req.Body == "" && req.ImageUrl == "" && req.VideoUrl == "" {
		return nil, errors.New("post must contain text, an image, or a video")
	}

	if req.Category == "" {
		req.Category = models.PostCategoryGeneral
	}

	// Auto-generate title if not provided
	if req.Title == "" {
		if req.Body != "" {
			runes := []rune(req.Body)
			if len(runes) > 60 {
				req.Title = string(runes[:57]) + "..."
			} else {
				req.Title = req.Body
			}
		}
	}

	return s.commRepo.UpdatePost(ctx, pOID, aOID, req)
}

// DeletePost soft-deletes a post owned by the given author.
func (s *CommunityService) DeletePost(ctx context.Context, postIDStr string, authorIDStr string) error {
	pOID, err := bson.ObjectIDFromHex(postIDStr)
	if err != nil {
		return fmt.Errorf("invalid post ID: %w", err)
	}
	aOID, err := bson.ObjectIDFromHex(authorIDStr)
	if err != nil {
		return fmt.Errorf("invalid author ID: %w", err)
	}
	return s.commRepo.DeletePost(ctx, pOID, aOID)
}

// ListMyPosts fetches all posts authored by the given user.
func (s *CommunityService) ListMyPosts(ctx context.Context, authorIDStr string) ([]models.Post, error) {
	aOID, err := bson.ObjectIDFromHex(authorIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid author ID: %w", err)
	}
	posts, err := s.commRepo.ListPostsByAuthor(ctx, aOID)
	if err != nil {
		return nil, err
	}
	return s.enrichSharedPosts(ctx, posts), nil
}


