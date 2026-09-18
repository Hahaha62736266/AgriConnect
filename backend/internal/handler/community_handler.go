package handler

import (
	"encoding/json"
	"net/http"

	"github.com/agriconnect/backend/internal/middleware"
	"github.com/agriconnect/backend/internal/models"
	"github.com/agriconnect/backend/internal/service"
	"github.com/go-chi/chi/v5"
)

type CommunityHandler struct {
	commService *service.CommunityService
}

func NewCommunityHandler(commService *service.CommunityService) *CommunityHandler {
	return &CommunityHandler{commService: commService}
}

// CreatePost handles POST /api/community/posts.
func (h *CommunityHandler) CreatePost(w http.ResponseWriter, r *http.Request) {
	authorID := middleware.GetUserID(r.Context())

	var req models.CreatePostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	post, err := h.commService.CreatePost(r.Context(), authorID, req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, post)
}

// ListPosts handles GET /api/community/posts.
func (h *CommunityHandler) ListPosts(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	currentUserID := middleware.GetUserID(r.Context())

	posts, err := h.commService.ListPosts(r.Context(), category, currentUserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch community posts")
		return
	}

	writeJSON(w, http.StatusOK, posts)
}

// GetPostByID handles GET /api/community/posts/{id}.
func (h *CommunityHandler) GetPostByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	currentUserID := middleware.GetUserID(r.Context())

	post, err := h.commService.GetPostByID(r.Context(), id, currentUserID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, post)
}

// ReactToPost handles POST /api/community/posts/{id}/react.
func (h *CommunityHandler) ReactToPost(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	postID := chi.URLParam(r, "id")

	var req models.ReactPostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		req.Reaction = models.ReactionLike
	}

	post, err := h.commService.ReactToPost(r.Context(), postID, userID, req.Reaction)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, post)
}

// GetPostReactions handles GET /api/community/posts/{id}/reactions.
func (h *CommunityHandler) GetPostReactions(w http.ResponseWriter, r *http.Request) {
	postID := chi.URLParam(r, "id")

	reactions, err := h.commService.GetPostReactions(r.Context(), postID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch post reactions")
		return
	}

	writeJSON(w, http.StatusOK, reactions)
}

// ToggleUpvote handles POST /api/community/posts/{id}/upvote.
func (h *CommunityHandler) ToggleUpvote(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	postID := chi.URLParam(r, "id")

	isUpvoted, err := h.commService.ToggleUpvote(r.Context(), postID, userID)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"isUpvoted": isUpvoted})
}

// CreateComment handles POST /api/community/posts/{id}/comments.
func (h *CommunityHandler) CreateComment(w http.ResponseWriter, r *http.Request) {
	authorID := middleware.GetUserID(r.Context())
	postID := chi.URLParam(r, "id")

	var req models.CreateCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	comment, err := h.commService.CreateComment(r.Context(), authorID, postID, req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, comment)
}

// ListCommentsByPost handles GET /api/community/posts/{id}/comments.
func (h *CommunityHandler) ListCommentsByPost(w http.ResponseWriter, r *http.Request) {
	postID := chi.URLParam(r, "id")

	comments, err := h.commService.ListCommentsByPost(r.Context(), postID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch comments")
		return
	}

	writeJSON(w, http.StatusOK, comments)
}

// UpdatePost handles PUT /api/community/posts/{id}.
// Only the post author can update their own post.
func (h *CommunityHandler) UpdatePost(w http.ResponseWriter, r *http.Request) {
	authorID := middleware.GetUserID(r.Context())
	postID := chi.URLParam(r, "id")

	var req models.UpdatePostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	post, err := h.commService.UpdatePost(r.Context(), postID, authorID, req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, post)
}

// DeletePost handles DELETE /api/community/posts/{id}.
// Only the post author can delete their own post (soft delete).
func (h *CommunityHandler) DeletePost(w http.ResponseWriter, r *http.Request) {
	authorID := middleware.GetUserID(r.Context())
	postID := chi.URLParam(r, "id")

	if err := h.commService.DeletePost(r.Context(), postID, authorID); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ListMyPosts handles GET /api/community/posts/my.
// Returns all posts authored by the currently authenticated user.
func (h *CommunityHandler) ListMyPosts(w http.ResponseWriter, r *http.Request) {
	authorID := middleware.GetUserID(r.Context())

	posts, err := h.commService.ListMyPosts(r.Context(), authorID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch your posts")
		return
	}

	writeJSON(w, http.StatusOK, posts)
}

