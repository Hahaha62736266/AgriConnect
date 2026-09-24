package middleware

import (
	"net/http"

	"github.com/agriconnect/backend/internal/models"
)

// Test2
// RequireRole returns a middleware that restricts access to the specified roles.
// If the authenticated user's role is not in the allowed list, it returns 403 Forbidden.
func RequireRole(roles ...models.Role) func(http.Handler) http.Handler {
	allowed := make(map[models.Role]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role := models.Role(GetRole(r.Context()))
			if !allowed[role] {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				w.Write([]byte(`{"error":"insufficient permissions"}`))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
