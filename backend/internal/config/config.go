package config

import (
	"os"
	"strconv"
)

// Config holds all configuration for the application.
type Config struct {
	MongoURI     string
	DBName       string
	JWTSecret    string
	JWTExpiryHrs int
	Port         string
	UploadDir    string

	// Cloudflare R2 / S3-compatible cloud storage
	R2AccountID       string
	R2AccessKeyID     string
	R2SecretAccessKey string
	R2BucketName      string
	R2PublicURL       string

	// Brevo (transactional email)
	BrevoAPIKey string
	AppBaseURL  string
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	cfg := &Config{
		MongoURI:          getEnv("MONGO_URI", "mongodb://localhost:27017"),
		DBName:            getEnv("DB_NAME", "agriconnect"),
		JWTSecret:         getEnv("JWT_SECRET", "change-me-to-a-secure-random-string"),
		JWTExpiryHrs:      getEnvInt("JWT_EXPIRY_HOURS", 24),
		Port:              getEnv("PORT", "8080"),
		UploadDir:         getEnv("UPLOAD_DIR", "./uploads"),
		R2AccountID:       getEnv("R2_ACCOUNT_ID", ""),
		R2AccessKeyID:     getEnv("R2_ACCESS_KEY_ID", ""),
		R2SecretAccessKey: getEnv("R2_SECRET_ACCESS_KEY", ""),
		R2BucketName:      getEnv("R2_BUCKET_NAME", ""),
		R2PublicURL:       getEnv("R2_PUBLIC_URL", ""),
		BrevoAPIKey:       getEnv("BREVO_API_KEY", ""),
		AppBaseURL:        getEnv("APP_BASE_URL", "http://localhost:5173"),
	}
	return cfg
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}
