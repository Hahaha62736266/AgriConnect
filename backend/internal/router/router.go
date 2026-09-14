package router

import (
	"net/http"

	"github.com/agriconnect/backend/internal/handler"
	"github.com/agriconnect/backend/internal/middleware"
	"github.com/agriconnect/backend/internal/models"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
)

// New creates and configures the application router with all routes and middleware.
func New(
	authHandler *handler.AuthHandler,
	userHandler *handler.UserHandler,
	produceHandler *handler.ProduceHandler,
	supplyHandler *handler.SupplyHandler,
	priceHandler *handler.PriceHandler,
	financialHandler *handler.FinancialHandler,
	programHandler *handler.ProgramHandler,
	communityHandler *handler.CommunityHandler,
	analyticsHandler *handler.AnalyticsHandler,
	notifHandler *handler.NotificationHandler,
	adminHandler *handler.AdminHandler,
	uploadHandler *handler.UploadHandler,
	chatHandler *handler.ChatHandler,
	jwtSecret string,
	uploadDir string,
) http.Handler {
	r := chi.NewRouter()

	// Global middleware
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(middleware.CORS())

	// Health check
	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Public auth routes
	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/register", authHandler.Register)
		r.Post("/login", authHandler.Login)
	})

	// Admin / LGU account management routes
	r.Route("/api/admin", func(r chi.Router) {
		r.Use(middleware.JWTAuth(jwtSecret))
		r.Use(middleware.RequireRole(models.RoleSuperAdmin, models.RoleLGUStaff))

		r.Get("/users", adminHandler.ListUsers)
		r.Put("/users/{id}/approve", adminHandler.ApproveUser)
		r.Put("/users/{id}/reject", adminHandler.RejectUser)
		r.Put("/users/{id}/suspend", adminHandler.SuspendUser)
		r.Put("/users/{id}/unsuspend", adminHandler.UnsuspendUser)
	})

	// Notification routes
	r.Route("/api/notifications", func(r chi.Router) {
		r.Use(middleware.JWTAuth(jwtSecret))

		r.Get("/", notifHandler.ListNotifications)
		r.Get("/unread-count", notifHandler.GetUnreadCount)
		r.Put("/{id}/read", notifHandler.MarkAsRead)
		r.Put("/read-all", notifHandler.MarkAllAsRead)
	})

	// User routes
	r.Route("/api/users", func(r chi.Router) {
		r.Use(middleware.JWTAuth(jwtSecret))

		r.Get("/me", userHandler.GetProfile)
		r.Put("/me", userHandler.UpdateProfile)
		r.Put("/me/photo", userHandler.UploadPhoto)
		r.Put("/me/password", userHandler.ChangePassword)
		r.Get("/support-contacts", userHandler.ListSupportContacts)
	})

	// General file/image upload route
	r.With(middleware.JWTAuth(jwtSecret)).Post("/api/upload", uploadHandler.UploadImage)

	// Produce Marketplace routes
	r.Route("/api/produce", func(r chi.Router) {
		r.Get("/listings", produceHandler.ListListings)
		r.Get("/listings/{id}", produceHandler.GetListingByID)

		r.Group(func(r chi.Router) {
			r.Use(middleware.JWTAuth(jwtSecret))

			r.With(middleware.RequireRole(models.RoleFarmer)).Post("/listings", produceHandler.CreateListing)
			r.With(middleware.RequireRole(models.RoleFarmer)).Put("/listings/{id}", produceHandler.UpdateListing)
			r.With(middleware.RequireRole(models.RoleFarmer)).Delete("/listings/{id}", produceHandler.DeleteListing)

			r.With(middleware.RequireRole(models.RoleBuyer, models.RoleFarmer, models.RoleSuperAdmin)).Post("/transactions", produceHandler.InitiateTransaction)

			r.Get("/transactions", produceHandler.ListTransactions)
			r.Put("/transactions/{id}/status", produceHandler.UpdateTransactionStatus)
			r.Post("/transactions/{id}/quote-decision", produceHandler.RespondToQuote)
		})
	})

	// Agri-Supply Store routes
	r.Route("/api/supply", func(r chi.Router) {
		r.Get("/products", supplyHandler.ListProducts)
		r.Get("/products/{id}", supplyHandler.GetProductByID)

		r.Group(func(r chi.Router) {
			r.Use(middleware.JWTAuth(jwtSecret))

			r.With(middleware.RequireRole(models.RoleSupplier)).Post("/products", supplyHandler.CreateProduct)
			r.With(middleware.RequireRole(models.RoleSupplier)).Put("/products/{id}", supplyHandler.UpdateProduct)
			r.With(middleware.RequireRole(models.RoleSupplier)).Delete("/products/{id}", supplyHandler.DeleteProduct)

			r.With(middleware.RequireRole(models.RoleFarmer, models.RoleBuyer, models.RoleSuperAdmin)).Post("/orders", supplyHandler.CreateOrder)

			r.Get("/orders", supplyHandler.ListOrders)
			r.Put("/orders/{id}/status", supplyHandler.UpdateOrderStatus)
			// Payment status: supplier confirms COD receipt; future: gateway webhook for online payments.
			r.Put("/orders/{id}/payment-status", supplyHandler.UpdatePaymentStatus)
			r.Post("/orders/{id}/quote-decision", supplyHandler.RespondToQuote)
		})
	})

	// Market Price Monitoring routes
	r.Route("/api/market-prices", func(r chi.Router) {
		r.Get("/", priceHandler.ListHistory)
		r.Get("/latest", priceHandler.GetLatestPrice)

		// LGU staff / Admin role can record daily crop prices
		r.Group(func(r chi.Router) {
			r.Use(middleware.JWTAuth(jwtSecret))
			r.With(middleware.RequireRole(models.RoleLGUStaff)).Post("/", priceHandler.CreateRecord)
		})
	})

	// Farm Income & Expense Tracker routes
	r.Route("/api/finances", func(r chi.Router) {
		r.Use(middleware.JWTAuth(jwtSecret))
		r.Use(middleware.RequireRole(models.RoleFarmer))

		r.Get("/entries", financialHandler.ListEntries)
		r.Post("/entries", financialHandler.CreateEntry)
		r.Delete("/entries/{id}", financialHandler.DeleteEntry)
		r.Get("/summary", financialHandler.GetSummary)
	})

	// Government Program Application & Tracking routes
	r.Route("/api/programs", func(r chi.Router) {
		r.Get("/", programHandler.ListPrograms)
		r.Get("/{id}", programHandler.GetProgramByID)

		r.Group(func(r chi.Router) {
			r.Use(middleware.JWTAuth(jwtSecret))

			// Farmer endpoints
			r.With(middleware.RequireRole(models.RoleFarmer)).Post("/{id}/applications", programHandler.SubmitApplication)
			r.With(middleware.RequireRole(models.RoleFarmer)).Get("/applications/my", programHandler.ListApplicationsByFarmer)

			// LGU / Admin endpoints
			r.With(middleware.RequireRole(models.RoleLGUStaff, models.RoleSuperAdmin)).Post("/", programHandler.CreateProgram)
			r.With(middleware.RequireRole(models.RoleLGUStaff, models.RoleSuperAdmin)).Put("/{id}/status", programHandler.UpdateProgramStatus)
			r.With(middleware.RequireRole(models.RoleLGUStaff, models.RoleSuperAdmin)).Get("/{id}/applications", programHandler.ListApplicationsByProgram)
			r.With(middleware.RequireRole(models.RoleLGUStaff, models.RoleSuperAdmin)).Put("/applications/{appId}/status", programHandler.ReviewApplication)
		})
	})

	// Community Hub routes
	r.Route("/api/community", func(r chi.Router) {
		r.Get("/posts", communityHandler.ListPosts)
		r.Get("/posts/{id}", communityHandler.GetPostByID)
		r.Get("/posts/{id}/comments", communityHandler.ListCommentsByPost)
		r.Get("/posts/{id}/reactions", communityHandler.GetPostReactions)

		r.Group(func(r chi.Router) {
			r.Use(middleware.JWTAuth(jwtSecret))

			r.Post("/posts", communityHandler.CreatePost)
			r.Post("/posts/{id}/react", communityHandler.ReactToPost)
			r.Post("/posts/{id}/upvote", communityHandler.ToggleUpvote)
			r.Post("/posts/{id}/comments", communityHandler.CreateComment)
		})
	})

	// LGU Regional Monitoring Dashboard routes
	r.Route("/api/lgu", func(r chi.Router) {
		r.Use(middleware.JWTAuth(jwtSecret))
		r.With(middleware.RequireRole(models.RoleLGUStaff, models.RoleSuperAdmin)).Get("/dashboard", analyticsHandler.GetLGUDashboard)
	})

	// Chat routes
	r.Route("/api/chat", func(r chi.Router) {
		r.Use(middleware.JWTAuth(jwtSecret))

		r.Post("/conversations", chatHandler.CreateConversation)
		r.Get("/conversations", chatHandler.ListConversations)
		r.Get("/conversations/{id}", chatHandler.GetConversation)
		r.Get("/conversations/{id}/messages", chatHandler.ListMessages)
		r.Post("/conversations/{id}/messages", chatHandler.SendMessage)
		r.Put("/conversations/{id}/read", chatHandler.MarkAsRead)
		r.Get("/unread-count", chatHandler.GetUnreadCount)
	})

	// Serve uploaded files
	fileServer := http.StripPrefix("/uploads/", http.FileServer(http.Dir(uploadDir)))
	r.Handle("/uploads/*", fileServer)

	return r
}
