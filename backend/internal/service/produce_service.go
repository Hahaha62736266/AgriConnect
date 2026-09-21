package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/agriconnect/backend/internal/cache"
	"github.com/agriconnect/backend/internal/models"
	"github.com/agriconnect/backend/internal/repository"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type ProduceService struct {
	produceRepo *repository.ProduceRepository
	userRepo    *repository.UserRepository
	notifRepo   *repository.NotificationRepository
	cache       *cache.Cache
}

func NewProduceService(produceRepo *repository.ProduceRepository, userRepo *repository.UserRepository, notifRepo *repository.NotificationRepository) *ProduceService {
	return &ProduceService{
		produceRepo: produceRepo,
		userRepo:    userRepo,
		notifRepo:   notifRepo,
		cache:       cache.New(30*time.Second, 1*time.Minute),
	}
}

// CreateListing handles listing creation for farmers.
func (s *ProduceService) CreateListing(ctx context.Context, farmerID string, req models.CreateProduceListingRequest) (*models.ProduceListing, error) {
	fOID, err := bson.ObjectIDFromHex(farmerID)
	if err != nil {
		return nil, fmt.Errorf("invalid farmer ID: %w", err)
	}

	farmer, err := s.userRepo.FindByID(ctx, fOID)
	if err != nil {
		return nil, fmt.Errorf("fetch farmer: %w", err)
	}

	if req.CropName == "" {
		return nil, errors.New("crop name is required")
	}
	if req.Quantity <= 0 {
		return nil, errors.New("quantity must be greater than zero")
	}
	if req.PricePerUnit <= 0 {
		return nil, errors.New("price per unit must be greater than zero")
	}

	harvestTime, _ := time.Parse("2006-01-02", req.HarvestDate)
	if harvestTime.IsZero() {
		harvestTime = time.Now()
	}

	listing := &models.ProduceListing{
		FarmerID:     farmer.ID,
		FarmerName:   fmt.Sprintf("%s %s", farmer.FirstName, farmer.LastName),
		FarmerPhone:  farmer.Phone,
		CropName:     req.CropName,
		Category:     req.Category,
		Quantity:     req.Quantity,
		Unit:         req.Unit,
		PricePerUnit: req.PricePerUnit,
		HarvestDate:  harvestTime,
		Location:     req.Location,
		Photos:       req.Photos,
		Description:  req.Description,
		Status:       models.ListingAvailable,
	}

	if err := s.produceRepo.CreateListing(ctx, listing); err != nil {
		return nil, err
	}

	if s.cache != nil {
		s.cache.Clear()
	}

	return listing, nil
}

// ListListings retrieves crop listings with filtering.
func (s *ProduceService) ListListings(ctx context.Context, filter repository.ProduceFilter) ([]models.ProduceListing, error) {
	cacheKey := fmt.Sprintf("prod_list_%s_%s_%s_%s_%s_%.2f_%.2f", filter.CropName, filter.Category, filter.Location, filter.Status, filter.FarmerID, filter.MinPrice, filter.MaxPrice)

	if s.cache != nil {
		if val, found := s.cache.Get(cacheKey); found {
			if cachedList, ok := val.([]models.ProduceListing); ok {
				return cachedList, nil
			}
		}
	}

	res, err := s.produceRepo.ListListings(ctx, filter)
	if err == nil && s.cache != nil {
		s.cache.Set(cacheKey, res, 30*time.Second)
	}
	return res, err
}

// GetListingByID finds a listing.
func (s *ProduceService) GetListingByID(ctx context.Context, id string) (*models.ProduceListing, error) {
	cacheKey := fmt.Sprintf("prod_item_%s", id)
	if s.cache != nil {
		if val, found := s.cache.Get(cacheKey); found {
			if cachedItem, ok := val.(*models.ProduceListing); ok {
				return cachedItem, nil
			}
		}
	}

	oid, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("invalid listing ID: %w", err)
	}
	res, err := s.produceRepo.GetListingByID(ctx, oid)
	if err == nil && s.cache != nil {
		s.cache.Set(cacheKey, res, 60*time.Second)
	}
	return res, err
}

// UpdateListing handles farmer edits to their own listing.
func (s *ProduceService) UpdateListing(ctx context.Context, farmerID string, listingID string, req models.UpdateProduceListingRequest) (*models.ProduceListing, error) {
	lOID, err := bson.ObjectIDFromHex(listingID)
	if err != nil {
		return nil, fmt.Errorf("invalid listing ID: %w", err)
	}

	existing, err := s.produceRepo.GetListingByID(ctx, lOID)
	if err != nil {
		return nil, err
	}

	if existing.FarmerID.Hex() != farmerID {
		return nil, errors.New("unauthorized to update this listing")
	}

	update := bson.M{}
	if req.CropName != nil {
		update["crop_name"] = *req.CropName
	}
	if req.Category != nil {
		update["category"] = *req.Category
	}
	if req.Quantity != nil {
		update["quantity"] = *req.Quantity
		// If listing was sold out but farmer restocked quantity > 0 without explicitly specifying another status, reactivate to available
		if *req.Quantity > 0 && existing.Status == models.ListingSold && req.Status == nil {
			update["status"] = models.ListingAvailable
		}
	}
	if req.Unit != nil {
		update["unit"] = *req.Unit
	}
	if req.PricePerUnit != nil {
		update["price_per_unit"] = *req.PricePerUnit
	}
	if req.Location != nil {
		update["location"] = *req.Location
	}
	if req.Description != nil {
		update["description"] = *req.Description
	}
	if req.Status != nil {
		update["status"] = *req.Status
	}
	if req.Photos != nil {
		update["photos"] = req.Photos
	}

	if err := s.produceRepo.UpdateListing(ctx, lOID, update); err != nil {
		return nil, err
	}

	if s.cache != nil {
		s.cache.Clear()
	}

	return s.produceRepo.GetListingByID(ctx, lOID)
}

// DeleteListing handles farmer deletion of their listing.
func (s *ProduceService) DeleteListing(ctx context.Context, farmerID string, listingID string) error {
	lOID, err := bson.ObjectIDFromHex(listingID)
	if err != nil {
		return fmt.Errorf("invalid listing ID: %w", err)
	}

	existing, err := s.produceRepo.GetListingByID(ctx, lOID)
	if err != nil {
		return err
	}

	if existing.FarmerID.Hex() != farmerID {
		return errors.New("unauthorized to delete this listing")
	}

	if err := s.produceRepo.DeleteListing(ctx, lOID); err != nil {
		return err
	}

	if s.cache != nil {
		s.cache.Clear()
	}

	return nil
}

// InitiateTransaction processes a buyer's purchase request.
func (s *ProduceService) InitiateTransaction(ctx context.Context, buyerID string, req models.CreateProduceTransactionRequest) (*models.ProduceTransaction, error) {
	bOID, err := bson.ObjectIDFromHex(buyerID)
	if err != nil {
		return nil, fmt.Errorf("invalid buyer ID: %w", err)
	}

	lOID, err := bson.ObjectIDFromHex(req.ListingID)
	if err != nil {
		return nil, fmt.Errorf("invalid listing ID: %w", err)
	}

	buyer, err := s.userRepo.FindByID(ctx, bOID)
	if err != nil {
		return nil, fmt.Errorf("fetch buyer: %w", err)
	}

	listing, err := s.produceRepo.GetListingByID(ctx, lOID)
	if err != nil {
		return nil, fmt.Errorf("fetch listing: %w", err)
	}

	if listing.Status != models.ListingAvailable {
		return nil, fmt.Errorf("listing for '%s' is no longer available (status: %s)", listing.CropName, listing.Status)
	}

	if listing.FarmerID.Hex() == buyerID {
		return nil, fmt.Errorf("you cannot purchase your own produce listing ('%s')", listing.CropName)
	}

	if req.Quantity <= 0 || req.Quantity > listing.Quantity {
		return nil, fmt.Errorf("insufficient harvest for '%s' (requested %.0f %s, available %.0f %s)", listing.CropName, req.Quantity, listing.Unit, listing.Quantity, listing.Unit)
	}

	subtotal := req.Quantity * listing.PricePerUnit
	var shippingFee float64 = 0
	totalPrice := subtotal + shippingFee

	deliveryMethod := req.DeliveryMethod
	deliveryAddress := req.DeliveryAddress
	if deliveryMethod == "" {
		if strings.Contains(strings.ToLower(req.ContactMessage), "pickup") {
			deliveryMethod = "pickup"
		} else {
			deliveryMethod = "delivery"
		}
	}

	cropPhoto := ""
	if len(listing.Photos) > 0 {
		cropPhoto = listing.Photos[0]
	}

	tx := &models.ProduceTransaction{
		ListingID:       listing.ID,
		CropName:        listing.CropName,
		CropPhoto:       cropPhoto,
		BuyerID:         buyer.ID,
		BuyerName:       fmt.Sprintf("%s %s", buyer.FirstName, buyer.LastName),
		FarmerID:        listing.FarmerID,
		FarmerName:      listing.FarmerName,
		Quantity:        req.Quantity,
		UnitPrice:       listing.PricePerUnit,
		Subtotal:        subtotal,
		ShippingFee:     shippingFee,
		TotalPrice:      totalPrice,
		DeliveryMethod:  deliveryMethod,
		DeliveryAddress: deliveryAddress,
		ContactMessage:  req.ContactMessage,
		PaymentMethod:   func() string { if req.PaymentMethod != "" { return req.PaymentMethod }; return "cod" }(),
		Status:          models.TxPending,
	}

	if err := s.produceRepo.CreateTransaction(ctx, tx); err != nil {
		return nil, err
	}

	// Immediately reserve listing quantity
	newQty := listing.Quantity - req.Quantity
	listingUpdate := bson.M{"quantity": newQty}
	if newQty <= 0 {
		listingUpdate["status"] = models.ListingSold
	}
	if err := s.produceRepo.UpdateListing(ctx, listing.ID, listingUpdate); err != nil {
		return nil, fmt.Errorf("failed to reserve harvest quantity: %w", err)
	}

	// Notify the farmer about the buyer inquiry
	if s.notifRepo != nil {
		_ = s.notifRepo.CreateNotification(ctx, &models.Notification{
			UserID:  listing.FarmerID,
			Title:   "🌾 New Produce Order",
			Message: fmt.Sprintf("%s ordered %.1f kg of %s (₱%.2f)", buyer.FirstName, req.Quantity, listing.CropName, totalPrice),
			Type:    models.NotifTypeOrderStatus,
			Link:    "/produce/orders",
		})
	}

	return tx, nil
}

// ListTransactions returns produce transactions for a user.
func (s *ProduceService) ListTransactions(ctx context.Context, userID string, role string) ([]models.ProduceTransaction, error) {
	return s.produceRepo.ListTransactions(ctx, userID, role)
}

// UpdateTransactionStatus updates order status (Farmer/Buyer/Admin) with role-based checks and stock restoration.
func (s *ProduceService) UpdateTransactionStatus(ctx context.Context, userID string, role string, txID string, req models.UpdateTransactionStatusRequest) (*models.ProduceTransaction, error) {
	tOID, err := bson.ObjectIDFromHex(txID)
	if err != nil {
		return nil, fmt.Errorf("invalid transaction ID: %w", err)
	}

	tx, err := s.produceRepo.GetTransactionByID(ctx, tOID)
	if err != nil {
		return nil, err
	}

	status := req.Status
	if status == "" {
		status = tx.Status
	}
	isBuyer := tx.BuyerID.Hex() == userID
	isFarmer := tx.FarmerID.Hex() == userID
	isAdmin := role == string(models.RoleSuperAdmin) || role == string(models.RoleLGUStaff)

	// Verify user is either buyer, farmer, or admin
	if !isBuyer && !isFarmer && !isAdmin {
		return nil, errors.New("unauthorized to update this transaction")
	}

	// Enforce role-based status transition rules
	if !isAdmin {
		if isBuyer && !isFarmer {
			if status == models.TxCompleted {
				if tx.Status != models.TxConfirmed {
					return nil, errors.New("order must be confirmed by the farmer before you can confirm delivery receipt")
				}
			} else if status == models.TxCancelled {
				if tx.Status != models.TxPending {
					return nil, errors.New("cannot cancel an order that has already been confirmed or processed")
				}
			} else if status == tx.Status {
				// Allow buyer to update payment details (reference number, receipt proof) without changing order status
			} else {
				return nil, errors.New("buyers cannot accept orders; only the farmer can confirm an order")
			}
		} else if isFarmer {
			if tx.Status == models.TxCompleted || tx.Status == models.TxCancelled {
				return nil, fmt.Errorf("cannot update a transaction that is already %s", tx.Status)
			}
			if status == models.TxCancelled {
				// Prevent seller from cancelling paid non-COD orders
				isNonCOD := tx.PaymentMethod != "cod" && tx.PaymentMethod != ""
				if (tx.PaymentStatus == "paid" || tx.PaymentRefNo != "") && isNonCOD {
					return nil, errors.New("cannot cancel order: customer has already submitted payment for this non-COD order")
				}
			}
			if status == models.TxCompleted && tx.Status != models.TxConfirmed {
				return nil, errors.New("order must be confirmed before marking as completed")
			}
		}
	}

	var shippingFee *float64
	var totalPrice *float64
	if req.ShippingFee != nil && isFarmer {
		fee := *req.ShippingFee
		if fee < 0 {
			fee = 0
		}
		subtotal := tx.Subtotal
		if subtotal == 0 {
			subtotal = tx.TotalPrice
		}
		total := subtotal + fee
		shippingFee = &fee
		totalPrice = &total
	}

	// If it's a delivery order and farmer confirms/quotes shipping fee from Pending status,
	// move to Quoted status so buyer can approve total before dispatch.
	if isFarmer && tx.Status == models.TxPending && (status == models.TxConfirmed || status == models.TxQuoted) && tx.DeliveryMethod == "delivery" {
		status = models.TxQuoted
	}

	if err := s.produceRepo.UpdateTransactionStatusFull(ctx, tOID, status, shippingFee, totalPrice, req.PaymentStatus, req.PaymentRefNo, req.PaymentProofURL); err != nil {
		return nil, err
	}

	// Stock restoration on cancellation
	if status == models.TxCancelled && tx.Status != models.TxCancelled {
		if listing, err := s.produceRepo.GetListingByID(ctx, tx.ListingID); err == nil {
			restoredQty := listing.Quantity + tx.Quantity
			update := bson.M{"quantity": restoredQty}
			if listing.Status == models.ListingSold && restoredQty > 0 {
				update["status"] = models.ListingAvailable
			}
			_ = s.produceRepo.UpdateListing(ctx, tx.ListingID, update)
		}
	}

	// Auto-update listing status if completed and depleted
	if status == models.TxCompleted {
		if listing, err := s.produceRepo.GetListingByID(ctx, tx.ListingID); err == nil && listing.Quantity <= 0 {
			_ = s.produceRepo.UpdateListing(ctx, tx.ListingID, bson.M{"status": models.ListingSold})
		}
	}

	// Send notification on status update
	if s.notifRepo != nil {
		var notifRecipient bson.ObjectID
		var notifTitle string
		var notifMsg string

		if status == models.TxQuoted {
			notifRecipient = tx.BuyerID
			notifTitle = "🌾 Delivery Fee Quoted - Action Required"
			feeVal := 0.0
			if shippingFee != nil {
				feeVal = *shippingFee
			}
			notifMsg = fmt.Sprintf("Farmer %s quoted ₱%.2f hauling fee for %s. Please review and approve total.", tx.FarmerName, feeVal, tx.CropName)
		} else if req.PaymentStatus != nil && *req.PaymentStatus == "paid" && tx.PaymentStatus != "paid" {
			notifRecipient = tx.BuyerID
			notifTitle = "✅ Payment Verified"
			notifMsg = fmt.Sprintf("Farmer %s verified your payment of ₱%.2f for %s.", tx.FarmerName, tx.TotalPrice, tx.CropName)
		} else if isFarmer || isAdmin {
			notifRecipient = tx.BuyerID
			notifTitle = "🌾 Crop Order Status Updated"
			notifMsg = fmt.Sprintf("Your order for %s has been %s by %s", tx.CropName, status, tx.FarmerName)
		} else {
			notifRecipient = tx.FarmerID
			notifTitle = "🌾 Crop Order Cancelled"
			notifMsg = fmt.Sprintf("Buyer %s cancelled their order for %s", tx.BuyerName, tx.CropName)
		}

		_ = s.notifRepo.CreateNotification(ctx, &models.Notification{
			UserID:  notifRecipient,
			Title:   notifTitle,
			Message: notifMsg,
			Type:    models.NotifTypeOrderStatus,
			Link:    "/produce/orders",
		})
	}

	return s.produceRepo.GetTransactionByID(ctx, tOID)
}

// RespondToQuote allows a buyer to approve, switch to pickup, or reject a quoted delivery fee.
func (s *ProduceService) RespondToQuote(ctx context.Context, userID string, txID string, req models.BuyerQuoteDecisionRequest) (*models.ProduceTransaction, error) {
	tOID, err := bson.ObjectIDFromHex(txID)
	if err != nil {
		return nil, fmt.Errorf("invalid transaction ID: %w", err)
	}

	tx, err := s.produceRepo.GetTransactionByID(ctx, tOID)
	if err != nil {
		return nil, err
	}

	if tx.BuyerID.Hex() != userID {
		return nil, errors.New("only the buyer can respond to a quoted delivery fee")
	}

	if tx.Status != models.TxQuoted && tx.Status != models.TxPending {
		return nil, fmt.Errorf("order cannot be updated from status %s", tx.Status)
	}

	action := strings.ToLower(strings.TrimSpace(req.Action))
	var newStatus models.TransactionStatus
	deliveryMethod := tx.DeliveryMethod
	shippingFee := tx.ShippingFee
	totalPrice := tx.TotalPrice

	subtotal := tx.Subtotal
	if subtotal <= 0 {
		subtotal = tx.Quantity * tx.UnitPrice
	}

	switch action {
	case "approve":
		newStatus = models.TxConfirmed
		totalPrice = subtotal + shippingFee
		if err := s.produceRepo.UpdateTransactionQuoteDecision(ctx, tOID, newStatus, deliveryMethod, shippingFee, totalPrice); err != nil {
			return nil, err
		}
		if s.notifRepo != nil {
			_ = s.notifRepo.CreateNotification(ctx, &models.Notification{
				UserID:  tx.FarmerID,
				Title:   "✅ Order Total Approved",
				Message: fmt.Sprintf("Buyer %s approved total of ₱%.2f (including ₱%.2f delivery fee) for %s. Order confirmed!", tx.BuyerName, totalPrice, shippingFee, tx.CropName),
				Type:    models.NotifTypeOrderStatus,
				Link:    "/produce/orders",
			})
		}

	case "switch_pickup":
		newStatus = models.TxConfirmed
		deliveryMethod = "pickup"
		shippingFee = 0
		totalPrice = subtotal
		if err := s.produceRepo.UpdateTransactionQuoteDecision(ctx, tOID, newStatus, deliveryMethod, shippingFee, totalPrice); err != nil {
			return nil, err
		}
		if s.notifRepo != nil {
			_ = s.notifRepo.CreateNotification(ctx, &models.Notification{
				UserID:  tx.FarmerID,
				Title:   "🚗 Switched to Farm Pickup",
				Message: fmt.Sprintf("Buyer %s switched order for %s to Farm Pickup (₱0 fee). Total is ₱%.2f. Order confirmed for pickup!", tx.BuyerName, tx.CropName, totalPrice),
				Type:    models.NotifTypeOrderStatus,
				Link:    "/produce/orders",
			})
		}

	case "reject":
		newStatus = models.TxCancelled
		if err := s.produceRepo.UpdateTransactionStatus(ctx, tOID, newStatus); err != nil {
			return nil, err
		}
		// Restore listing stock
		if listing, err := s.produceRepo.GetListingByID(ctx, tx.ListingID); err == nil {
			restoredQty := listing.Quantity + tx.Quantity
			update := bson.M{"quantity": restoredQty}
			if listing.Status == models.ListingSold && restoredQty > 0 {
				update["status"] = models.ListingAvailable
			}
			_ = s.produceRepo.UpdateListing(ctx, tx.ListingID, update)
		}
		if s.notifRepo != nil {
			_ = s.notifRepo.CreateNotification(ctx, &models.Notification{
				UserID:  tx.FarmerID,
				Title:   "🌾 Order Quote Declined",
				Message: fmt.Sprintf("Buyer %s declined the quoted shipping fee and cancelled order for %s.", tx.BuyerName, tx.CropName),
				Type:    models.NotifTypeOrderStatus,
				Link:    "/produce/orders",
			})
		}

	default:
		return nil, fmt.Errorf("invalid action: %s (expected 'approve', 'switch_pickup', or 'reject')", req.Action)
	}

	return s.produceRepo.GetTransactionByID(ctx, tOID)
}
