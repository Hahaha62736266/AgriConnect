package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/agriconnect/backend/internal/cache"
	"github.com/agriconnect/backend/internal/models"
	"github.com/agriconnect/backend/internal/repository"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type PriceService struct {
	priceRepo *repository.PriceRepository
	userRepo  *repository.UserRepository
	cache     *cache.Cache
}

func NewPriceService(priceRepo *repository.PriceRepository, userRepo *repository.UserRepository) *PriceService {
	return &PriceService{
		priceRepo: priceRepo,
		userRepo:  userRepo,
		cache:     cache.New(2*time.Minute, 5*time.Minute),
	}
}

// CreatePriceRecord handles adding price entries by LGU staff.
func (s *PriceService) CreatePriceRecord(ctx context.Context, recorderID string, req models.CreateMarketPriceRequest) (*models.MarketPrice, error) {
	var rOID bson.ObjectID
	if recorderID != "" {
		rOID, _ = bson.ObjectIDFromHex(recorderID)
	}

	if req.CropName == "" {
		return nil, errors.New("crop name is required")
	}
	if req.Price <= 0 {
		return nil, errors.New("price must be greater than zero")
	}
	if req.Region == "" {
		return nil, errors.New("region is required")
	}

	recTime, _ := time.Parse("2006-01-02", req.RecordedAt)
	if recTime.IsZero() {
		recTime = time.Now()
	}

	price := &models.MarketPrice{
		CropName:       req.CropName,
		Category:       req.Category,
		Unit:           req.Unit,
		Price:          req.Price,
		Region:         req.Region,
		MarketLocation: req.MarketLocation,
		RecordedAt:     recTime,
		Source:         req.Source,
		RecordedBy:     rOID,
	}

	if err := s.priceRepo.Create(ctx, price); err != nil {
		return nil, err
	}

	if s.cache != nil {
		s.cache.Clear()
	}

	return price, nil
}

// ListPriceHistory retrieves price history filterable by crop, region, and date range.
func (s *PriceService) ListPriceHistory(ctx context.Context, cropName, region, startDateStr, endDateStr string) ([]models.MarketPrice, error) {
	cacheKey := fmt.Sprintf("price_hist_%s_%s_%s_%s", cropName, region, startDateStr, endDateStr)
	if s.cache != nil {
		if val, found := s.cache.Get(cacheKey); found {
			if cachedList, ok := val.([]models.MarketPrice); ok {
				return cachedList, nil
			}
		}
	}

	var startDate, endDate *time.Time

	if startDateStr != "" {
		if t, err := time.Parse("2006-01-02", startDateStr); err == nil {
			startDate = &t
		}
	}
	if endDateStr != "" {
		if t, err := time.Parse("2006-01-02", endDateStr); err == nil {
			// Set end of day
			t = t.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			endDate = &t
		}
	}

	filter := repository.PriceFilter{
		CropName:  cropName,
		Region:    region,
		StartDate: startDate,
		EndDate:   endDate,
	}

	res, err := s.priceRepo.ListPriceHistory(ctx, filter)
	if err == nil && s.cache != nil {
		s.cache.Set(cacheKey, res, 2*time.Minute)
	}
	return res, err
}

// GetLatestPrice returns the latest price record for a specific crop and region.
func (s *PriceService) GetLatestPrice(ctx context.Context, cropName string, region string) (*models.LatestPriceResponse, error) {
	if cropName == "" {
		return nil, errors.New("crop name query parameter is required")
	}

	cacheKey := fmt.Sprintf("price_latest_%s_%s", cropName, region)
	if s.cache != nil {
		if val, found := s.cache.Get(cacheKey); found {
			if cachedResp, ok := val.(*models.LatestPriceResponse); ok {
				return cachedResp, nil
			}
		}
	}

	price, err := s.priceRepo.GetLatestPrice(ctx, cropName, region)
	if err != nil {
		return nil, fmt.Errorf("fetch latest price: %w", err)
	}

	resp := &models.LatestPriceResponse{
		CropName:       price.CropName,
		Region:         price.Region,
		Price:          price.Price,
		Unit:           price.Unit,
		MarketLocation: price.MarketLocation,
		RecordedAt:     price.RecordedAt,
		Source:         price.Source,
	}

	if s.cache != nil {
		s.cache.Set(cacheKey, resp, 2*time.Minute)
	}

	return resp, nil
}
