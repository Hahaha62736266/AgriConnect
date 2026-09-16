package handler

import (
	"encoding/json"
	"net/http"

	"github.com/agriconnect/backend/internal/middleware"
	"github.com/agriconnect/backend/internal/models"
	"github.com/agriconnect/backend/internal/service"
	"github.com/go-chi/chi/v5"
)

// UserHandler handles user profile endpoints.
type UserHandler struct {
	userService *service.UserService
}

// NewUserHandler creates a new UserHandler.
func NewUserHandler(userService *service.UserService) *UserHandler {
	return &UserHandler{userService: userService}
}

// GetProfile handles GET /api/users/me.
func (h *UserHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	user, err := h.userService.GetProfile(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	writeJSON(w, http.StatusOK, user)
}

// GetPublicProfile handles GET /api/users/{id}/public.
func (h *UserHandler) GetPublicProfile(w http.ResponseWriter, r *http.Request) {
	targetID := chi.URLParam(r, "id")
	if targetID == "" {
		writeError(w, http.StatusBadRequest, "user ID required")
		return
	}

	user, err := h.userService.GetPublicProfile(r.Context(), targetID)
	if err != nil {
		writeError(w, http.StatusNotFound, "public profile not found")
		return
	}

	writeJSON(w, http.StatusOK, user)
}

// UpdateProfile handles PUT /api/users/me.
func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req models.UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := h.userService.UpdateProfile(r.Context(), userID, req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update profile")
		return
	}

	writeJSON(w, http.StatusOK, user)
}

// UploadPhoto handles PUT /api/users/me/photo.
func (h *UserHandler) UploadPhoto(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	// Limit upload size to 5MB
	r.Body = http.MaxBytesReader(w, r.Body, 5<<20)

	file, header, err := r.FormFile("photo")
	if err != nil {
		writeError(w, http.StatusBadRequest, "photo file is required (max 5MB)")
		return
	}
	defer file.Close()

	user, err := h.userService.UploadPhoto(r.Context(), userID, header.Filename, file)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to upload photo")
		return
	}

	writeJSON(w, http.StatusOK, user)
}

// ChangePassword handles PUT /api/users/me/password.
func (h *UserHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req models.ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.userService.ChangePassword(r.Context(), userID, req); err != nil {
		switch err.Error() {
		case "current password is incorrect":
			writeError(w, http.StatusUnauthorized, err.Error())
		case "current password and new password are required",
			"new password must be at least 8 characters":
			writeError(w, http.StatusBadRequest, err.Error())
		default:
			writeError(w, http.StatusInternalServerError, "failed to change password")
		}
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "password changed successfully"})
}

// ListSupportContacts handles GET /api/users/support-contacts
func (h *UserHandler) ListSupportContacts(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	roleFilter := r.URL.Query().Get("role")
	contacts, err := h.userService.ListSupportContacts(r.Context(), userID, roleFilter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, contacts)
}
