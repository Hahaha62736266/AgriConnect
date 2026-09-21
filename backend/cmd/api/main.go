package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/agriconnect/backend/internal/config"
	"github.com/agriconnect/backend/internal/database"
	"github.com/agriconnect/backend/internal/handler"
	"github.com/agriconnect/backend/internal/repository"
	"github.com/agriconnect/backend/internal/router"
	"github.com/agriconnect/backend/internal/service"
	"github.com/agriconnect/backend/internal/storage"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file if present
	_ = godotenv.Load()

	// Load configuration
	cfg := config.Load()

	// Connect to MongoDB
	mongoClient, err := database.Connect(cfg.MongoURI)
	if err != nil {
		log.Fatal("❌ Failed to connect to MongoDB:", err)
	}
	defer func() {
		if err := mongoClient.Disconnect(nil); err != nil {
			log.Println("Error disconnecting from MongoDB:", err)
		}
	}()

	db := mongoClient.Database(cfg.DBName)

	// Ensure local upload directory exists (used as fallback when R2 is not configured)
	if err := os.MkdirAll(cfg.UploadDir, os.ModePerm); err != nil {
		log.Fatal("❌ Failed to create upload directory:", err)
	}

	// Initialize storage service (Cloudflare R2 if configured, otherwise local disk)
	storageSvc, err := storage.New(cfg)
	if err != nil {
		log.Fatal("❌ Failed to initialize storage service:", err)
	}

	// Repositories
	userColl := database.GetCollection(mongoClient, cfg.DBName, "users")
	userRepo := repository.NewUserRepository(userColl)
	produceRepo := repository.NewProduceRepository(db)
	supplyRepo := repository.NewSupplyRepository(db)
	priceRepo := repository.NewPriceRepository(db)
	financialRepo := repository.NewFinancialRepository(db)
	programRepo := repository.NewProgramRepository(db)
	communityRepo := repository.NewCommunityRepository(db)
	analyticsRepo := repository.NewAnalyticsRepository(db)
	notifRepo := repository.NewNotificationRepository(db)
	chatRepo := repository.NewChatRepository(db)
	resetTokenRepo := repository.NewResetTokenRepository(db)

	// Services
	emailService := service.NewEmailService(cfg.BrevoAPIKey)
	authService := service.NewAuthService(userRepo, resetTokenRepo, emailService, cfg.JWTSecret, cfg.JWTExpiryHrs, cfg.AppBaseURL)
	userService := service.NewUserService(userRepo, storageSvc)
	adminService := service.NewAdminService(userRepo)
	produceService := service.NewProduceService(produceRepo, userRepo, notifRepo)
	supplyService := service.NewSupplyService(supplyRepo, userRepo, notifRepo)
	priceService := service.NewPriceService(priceRepo, userRepo)
	financialService := service.NewFinancialService(financialRepo)
	programService := service.NewProgramService(programRepo, userRepo, notifRepo)
	communityService := service.NewCommunityService(communityRepo, userRepo, notifRepo)
	analyticsService := service.NewAnalyticsService(analyticsRepo)
	notifService := service.NewNotificationService(notifRepo)
	chatService := service.NewChatService(chatRepo, userRepo, notifRepo)

	// Seed Super Admin user if not exists
	if err := authService.SeedSuperAdmin(context.Background()); err != nil {
		log.Printf("⚠️ Warning: Failed to seed Super Admin: %v\n", err)
	} else {
		log.Println("👑 Super Admin account initialized (superadmin@agriconnect.gov.ph)")
	}

	// Handlers
	authHandler := handler.NewAuthHandler(authService)
	userHandler := handler.NewUserHandler(userService)
	adminHandler := handler.NewAdminHandler(adminService)
	produceHandler := handler.NewProduceHandler(produceService)
	supplyHandler := handler.NewSupplyHandler(supplyService)
	priceHandler := handler.NewPriceHandler(priceService)
	financialHandler := handler.NewFinancialHandler(financialService)
	programHandler := handler.NewProgramHandler(programService)
	communityHandler := handler.NewCommunityHandler(communityService)
	analyticsHandler := handler.NewAnalyticsHandler(analyticsService)
	notifHandler := handler.NewNotificationHandler(notifService)
	uploadHandler := handler.NewUploadHandler(storageSvc)
	chatHandler := handler.NewChatHandler(chatService)

	// Build router
	r := router.New(
		authHandler,
		userHandler,
		produceHandler,
		supplyHandler,
		priceHandler,
		financialHandler,
		programHandler,
		communityHandler,
		analyticsHandler,
		notifHandler,
		adminHandler,
		uploadHandler,
		chatHandler,
		cfg.JWTSecret,
		cfg.UploadDir,
	)

	// Start server
	addr := ":" + cfg.Port
	log.Printf("🚀 AgriConnect API starting on http://localhost%s\n", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatal("❌ Server failed:", err)
	}
}
