package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type PostCategory string

const (
	PostCategoryGeneral     PostCategory = "general"
	PostCategoryCropAdvice  PostCategory = "crop_advice"
	PostCategoryPestControl PostCategory = "pest_control"
	PostCategoryMarketTalk  PostCategory = "market_talk"
	PostCategoryEquipment   PostCategory = "equipment"
)

type ReactionType string

const (
	ReactionLike      ReactionType = "like"
	ReactionCelebrate ReactionType = "celebrate"
	ReactionSupport   ReactionType = "support"
	ReactionLove      ReactionType = "love"
	ReactionInsight   ReactionType = "insight"
	ReactionFunny     ReactionType = "funny"
)

// PostReaction records an individual user's reaction.
type PostReaction struct {
	UserID       bson.ObjectID `bson:"user_id"                  json:"userId"`
	UserName     string        `bson:"user_name"                json:"userName"`
	UserRole     Role          `bson:"user_role,omitempty"      json:"userRole,omitempty"`
	UserPhotoUrl string        `bson:"user_photo_url,omitempty" json:"userPhotoUrl,omitempty"`
	Type         ReactionType  `bson:"type"                     json:"type"`
	CreatedAt    time.Time     `bson:"created_at"               json:"createdAt"`
}

// Post represents a community discussion post.
type Post struct {
	ID             bson.ObjectID        `bson:"_id,omitempty"             json:"id"`
	AuthorID       bson.ObjectID        `bson:"author_id"                 json:"authorId"`
	AuthorName     string               `bson:"author_name"               json:"authorName"`
	AuthorRole     Role                 `bson:"author_role"               json:"authorRole"`
	AuthorPhotoUrl string               `bson:"author_photo_url"          json:"authorPhotoUrl,omitempty"`
	Title          string               `bson:"title"                     json:"title"`
	Body           string               `bson:"body"                      json:"body"`
	Category       PostCategory         `bson:"category"                  json:"category"`
	ImageUrl       string               `bson:"image_url,omitempty"       json:"imageUrl,omitempty"`
	VideoUrl       string               `bson:"video_url,omitempty"       json:"videoUrl,omitempty"`
	Upvotes        int                  `bson:"upvotes"                   json:"upvotes"`
	UpvotedBy      []bson.ObjectID      `bson:"upvoted_by"                json:"upvotedBy,omitempty"`
	Reactions      []PostReaction       `bson:"reactions,omitempty"       json:"reactions,omitempty"`
	ReactionCounts map[ReactionType]int `bson:"reaction_counts,omitempty" json:"reactionCounts,omitempty"`
	TotalReactions int                  `bson:"total_reactions"           json:"totalReactions"`
	CommentsCount  int                  `bson:"comments_count"            json:"commentsCount"`
	SharedPostID   *bson.ObjectID       `bson:"shared_post_id,omitempty"  json:"sharedPostId,omitempty"`
	SharedPost     *Post                `bson:"shared_post,omitempty"     json:"sharedPost,omitempty"`
	IsFlagged      bool                 `bson:"is_flagged"                json:"isFlagged"`
	IsRemoved      bool                 `bson:"is_removed"                json:"isRemoved"`
	CreatedAt      time.Time            `bson:"created_at"                json:"createdAt"`
	UpdatedAt      time.Time            `bson:"updated_at"                json:"updatedAt"`

	// Helper for frontend state
	IsUpvotedByMe bool         `bson:"-" json:"isUpvotedByMe,omitempty"`
	MyReaction    ReactionType `bson:"-" json:"myReaction,omitempty"`
}

// Comment represents a reply/answer on a community post.
type Comment struct {
	ID             bson.ObjectID `bson:"_id,omitempty"    json:"id"`
	PostID         bson.ObjectID `bson:"post_id"          json:"postId"`
	AuthorID       bson.ObjectID `bson:"author_id"        json:"authorId"`
	AuthorName     string        `bson:"author_name"      json:"authorName"`
	AuthorRole     Role          `bson:"author_role"      json:"authorRole"`
	AuthorPhotoUrl string        `bson:"author_photo_url" json:"authorPhotoUrl,omitempty"`
	Body           string        `bson:"body"             json:"body"`
	IsFlagged      bool          `bson:"is_flagged"       json:"isFlagged"`
	IsRemoved      bool          `bson:"is_removed"       json:"isRemoved"`
	CreatedAt      time.Time     `bson:"created_at"       json:"createdAt"`
	UpdatedAt      time.Time     `bson:"updated_at"       json:"updatedAt"`
}

// CreatePostRequest payload
type CreatePostRequest struct {
	Title        string       `json:"title"`
	Body         string       `json:"body"`
	Category     PostCategory `json:"category"`
	ImageUrl     string       `json:"imageUrl,omitempty"`
	VideoUrl     string       `json:"videoUrl,omitempty"`
	SharedPostID string       `json:"sharedPostId,omitempty"`
}

// ReactPostRequest payload
type ReactPostRequest struct {
	Reaction ReactionType `json:"reaction"`
}

// UpdatePostRequest payload for editing an existing post.
type UpdatePostRequest struct {
	Title    string       `json:"title"`
	Body     string       `json:"body"`
	Category PostCategory `json:"category"`
	ImageUrl string       `json:"imageUrl,omitempty"`
	VideoUrl string       `json:"videoUrl,omitempty"`
}

// CreateCommentRequest payload
type CreateCommentRequest struct {
	Body string `json:"body"`
}
