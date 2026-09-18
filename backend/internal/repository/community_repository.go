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

var (
	ErrPostNotFound    = errors.New("community post not found")
	ErrCommentNotFound = errors.New("comment not found")
)

type CommunityRepository struct {
	postColl    *mongo.Collection
	commentColl *mongo.Collection
}

func NewCommunityRepository(db *mongo.Database) *CommunityRepository {
	repo := &CommunityRepository{
		postColl:    db.Collection("community_posts"),
		commentColl: db.Collection("community_comments"),
	}
	repo.ensureIndexes()
	return repo
}

func (r *CommunityRepository) ensureIndexes() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, _ = r.postColl.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "category", Value: 1}}},
		{Keys: bson.D{{Key: "created_at", Value: -1}}},
		{Keys: bson.D{{Key: "is_removed", Value: 1}}},
	})

	_, _ = r.commentColl.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "post_id", Value: 1}}},
		{Keys: bson.D{{Key: "created_at", Value: 1}}},
	})
}

func populatePostReactionState(post *models.Post, userOID bson.ObjectID) {
	if post.ReactionCounts == nil {
		post.ReactionCounts = make(map[models.ReactionType]int)
	}

	// Calculate counts from Reactions if present
	if len(post.Reactions) > 0 {
		for _, r := range post.Reactions {
			post.ReactionCounts[r.Type]++
		}
		post.TotalReactions = len(post.Reactions)
	} else if post.Upvotes > 0 {
		// Backwards compatibility for existing upvotes
		post.ReactionCounts[models.ReactionLike] = post.Upvotes
		post.TotalReactions = post.Upvotes
	}

	if !userOID.IsZero() {
		for _, r := range post.Reactions {
			if r.UserID == userOID {
				post.MyReaction = r.Type
				post.IsUpvotedByMe = true
				break
			}
		}
		if !post.IsUpvotedByMe {
			for _, uID := range post.UpvotedBy {
				if uID == userOID {
					post.IsUpvotedByMe = true
					if post.MyReaction == "" {
						post.MyReaction = models.ReactionLike
					}
					break
				}
			}
		}
	}
}

// CreatePost creates a new community discussion post.
func (r *CommunityRepository) CreatePost(ctx context.Context, post *models.Post) error {
	post.CreatedAt = time.Now()
	post.UpdatedAt = time.Now()
	post.Upvotes = 0
	post.TotalReactions = 0
	post.CommentsCount = 0
	post.IsFlagged = false
	post.IsRemoved = false
	post.UpvotedBy = []bson.ObjectID{}
	post.Reactions = []models.PostReaction{}
	post.ReactionCounts = make(map[models.ReactionType]int)

	res, err := r.postColl.InsertOne(ctx, post)
	if err != nil {
		return fmt.Errorf("insert post: %w", err)
	}

	if oid, ok := res.InsertedID.(bson.ObjectID); ok {
		post.ID = oid
	}
	return nil
}

// ListPosts retrieves community posts filtered by category.
func (r *CommunityRepository) ListPosts(ctx context.Context, category string, currentUserID string) ([]models.Post, error) {
	query := bson.M{"is_removed": false}
	if category != "" && category != "all" {
		query["category"] = category
	}

	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := r.postColl.Find(ctx, query, opts)
	if err != nil {
		return nil, fmt.Errorf("find posts: %w", err)
	}
	defer cursor.Close(ctx)

	var posts []models.Post
	if err := cursor.All(ctx, &posts); err != nil {
		return nil, fmt.Errorf("decode posts: %w", err)
	}
	if posts == nil {
		posts = []models.Post{}
	}

	var userOID bson.ObjectID
	if currentUserID != "" {
		userOID, _ = bson.ObjectIDFromHex(currentUserID)
	}

	for i := range posts {
		populatePostReactionState(&posts[i], userOID)
	}

	return posts, nil
}

// GetPostByID fetches a single post by ID.
func (r *CommunityRepository) GetPostByID(ctx context.Context, id bson.ObjectID, currentUserID string) (*models.Post, error) {
	var post models.Post
	err := r.postColl.FindOne(ctx, bson.M{"_id": id, "is_removed": false}).Decode(&post)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrPostNotFound
		}
		return nil, fmt.Errorf("find post by id: %w", err)
	}

	var userOID bson.ObjectID
	if currentUserID != "" {
		userOID, _ = bson.ObjectIDFromHex(currentUserID)
	}
	populatePostReactionState(&post, userOID)

	return &post, nil
}

// ReactToPost updates or toggles a user's multi-reaction on a post.
func (r *CommunityRepository) ReactToPost(ctx context.Context, postID bson.ObjectID, userID bson.ObjectID, userName string, userRole models.Role, userPhotoUrl string, reaction models.ReactionType) (*models.Post, error) {
	post, err := r.GetPostByID(ctx, postID, "")
	if err != nil {
		return nil, err
	}

	existingIdx := -1
	for i, r := range post.Reactions {
		if r.UserID == userID {
			existingIdx = i
			break
		}
	}

	var myReaction models.ReactionType
	if existingIdx >= 0 {
		if post.Reactions[existingIdx].Type == reaction {
			// Toggle OFF (same reaction clicked again)
			post.Reactions = append(post.Reactions[:existingIdx], post.Reactions[existingIdx+1:]...)
			myReaction = ""
		} else {
			// Change reaction type
			post.Reactions[existingIdx].Type = reaction
			post.Reactions[existingIdx].CreatedAt = time.Now()
			if userName != "" {
				post.Reactions[existingIdx].UserName = userName
			}
			if userRole != "" {
				post.Reactions[existingIdx].UserRole = userRole
			}
			if userPhotoUrl != "" {
				post.Reactions[existingIdx].UserPhotoUrl = userPhotoUrl
			}
			myReaction = reaction
		}
	} else {
		// Add new reaction
		post.Reactions = append(post.Reactions, models.PostReaction{
			UserID:       userID,
			UserName:     userName,
			UserRole:     userRole,
			UserPhotoUrl: userPhotoUrl,
			Type:         reaction,
			CreatedAt:    time.Now(),
		})
		myReaction = reaction
	}

	// Recount reactions
	newCounts := make(map[models.ReactionType]int)
	for _, r := range post.Reactions {
		newCounts[r.Type]++
	}
	totalReactions := len(post.Reactions)

	// Keep UpvotedBy list synced for compatibility
	newUpvotedBy := make([]bson.ObjectID, 0, len(post.Reactions))
	for _, r := range post.Reactions {
		newUpvotedBy = append(newUpvotedBy, r.UserID)
	}

	update := bson.M{
		"$set": bson.M{
			"reactions":       post.Reactions,
			"reaction_counts": newCounts,
			"total_reactions": totalReactions,
			"upvotes":         totalReactions,
			"upvoted_by":      newUpvotedBy,
			"updated_at":      time.Now(),
		},
	}

	_, err = r.postColl.UpdateOne(ctx, bson.M{"_id": postID}, update)
	if err != nil {
		return nil, fmt.Errorf("update reactions: %w", err)
	}

	post.ReactionCounts = newCounts
	post.TotalReactions = totalReactions
	post.Upvotes = totalReactions
	post.UpvotedBy = newUpvotedBy
	post.MyReaction = myReaction
	post.IsUpvotedByMe = (myReaction != "")

	return post, nil
}

// ToggleUpvote toggles user upvote on a post (legacy compatibility mapped to 'like').
func (r *CommunityRepository) ToggleUpvote(ctx context.Context, postID bson.ObjectID, userID bson.ObjectID) (bool, error) {
	updatedPost, err := r.ReactToPost(ctx, postID, userID, "", "", "", models.ReactionLike)
	if err != nil {
		return false, err
	}
	return updatedPost.IsUpvotedByMe, nil
}

// CreateComment creates a new comment on a post.
func (r *CommunityRepository) CreateComment(ctx context.Context, comment *models.Comment) error {
	comment.CreatedAt = time.Now()
	comment.UpdatedAt = time.Now()
	comment.IsFlagged = false
	comment.IsRemoved = false

	res, err := r.commentColl.InsertOne(ctx, comment)
	if err != nil {
		return fmt.Errorf("insert comment: %w", err)
	}

	if oid, ok := res.InsertedID.(bson.ObjectID); ok {
		comment.ID = oid
	}

	// Increment post comments_count
	_, _ = r.postColl.UpdateOne(ctx, bson.M{"_id": comment.PostID}, bson.M{"$inc": bson.M{"comments_count": 1}})

	return nil
}

// ListCommentsByPost retrieves comments for a post in chronological order.
func (r *CommunityRepository) ListCommentsByPost(ctx context.Context, postID bson.ObjectID) ([]models.Comment, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}})
	cursor, err := r.commentColl.Find(ctx, bson.M{"post_id": postID, "is_removed": false}, opts)
	if err != nil {
		return nil, fmt.Errorf("find comments: %w", err)
	}
	defer cursor.Close(ctx)

	var comments []models.Comment
	if err := cursor.All(ctx, &comments); err != nil {
		return nil, fmt.Errorf("decode comments: %w", err)
	}
	if comments == nil {
		comments = []models.Comment{}
	}
	return comments, nil
}

// UpdatePost updates the editable fields of a post. Ownership is enforced by
// including author_id in the filter so only the post author can update it.
func (r *CommunityRepository) UpdatePost(ctx context.Context, postID bson.ObjectID, authorID bson.ObjectID, req models.UpdatePostRequest) (*models.Post, error) {
	filter := bson.M{"_id": postID, "author_id": authorID, "is_removed": false}

	update := bson.M{
		"$set": bson.M{
			"title":      req.Title,
			"body":       req.Body,
			"category":   req.Category,
			"image_url":  req.ImageUrl,
			"video_url":  req.VideoUrl,
			"updated_at": time.Now(),
		},
	}

	res, err := r.postColl.UpdateOne(ctx, filter, update)
	if err != nil {
		return nil, fmt.Errorf("update post: %w", err)
	}
	if res.MatchedCount == 0 {
		return nil, ErrPostNotFound
	}

	return r.GetPostByID(ctx, postID, authorID.Hex())
}

// DeletePost soft-deletes a post by setting is_removed = true.
// Ownership is enforced via author_id in the filter.
func (r *CommunityRepository) DeletePost(ctx context.Context, postID bson.ObjectID, authorID bson.ObjectID) error {
	filter := bson.M{"_id": postID, "author_id": authorID, "is_removed": false}
	update := bson.M{"$set": bson.M{"is_removed": true, "updated_at": time.Now()}}

	res, err := r.postColl.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("delete post: %w", err)
	}
	if res.MatchedCount == 0 {
		return ErrPostNotFound
	}
	return nil
}

// ListPostsByAuthor retrieves all non-removed posts by a specific author.
func (r *CommunityRepository) ListPostsByAuthor(ctx context.Context, authorID bson.ObjectID) ([]models.Post, error) {
	query := bson.M{"author_id": authorID, "is_removed": false}
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := r.postColl.Find(ctx, query, opts)
	if err != nil {
		return nil, fmt.Errorf("find posts by author: %w", err)
	}
	defer cursor.Close(ctx)

	var posts []models.Post
	if err := cursor.All(ctx, &posts); err != nil {
		return nil, fmt.Errorf("decode posts: %w", err)
	}
	if posts == nil {
		posts = []models.Post{}
	}

	for i := range posts {
		populatePostReactionState(&posts[i], authorID)
	}
	return posts, nil
}

