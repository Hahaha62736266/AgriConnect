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

type SupplyService struct {
	supplyRepo *repository.SupplyRepository
	userRepo   *repository.UserRepository
	notifRepo  *repository.NotificationRepository
	cache      *cache.Cache
}

func NewSupplyService(supplyRepo *repository.SupplyRepository, userRepo *repository.UserRepository, notifRepo *repository.NotificationRepository) *SupplyService {
	return &SupplyService{
		supplyRepo: supplyRepo,
		userRepo:   userRepo,
		notifRepo:  notifRepo,
		cache:      cache.New(30*time.Second, 1*time.Minute),
	}
}

// CreateProduct creates a product listing for a supplier.
func (s *SupplyService) CreateProduct(ctx context.Context, supplierID string, req models.CreateSupplyProductRequest) (*models.SupplyProduct, error) {
	sOID, err := bson.ObjectIDFromHex(supplierID)
	if err != nil {
		return nil, fmt.Errorf("invalid supplier ID: %w", err)
	}

	supplier, err := s.userRepo.FindByID(ctx, sOID)
	if err != nil {
		return nil, fmt.Errorf("fetch supplier: %w", err)
	}

	if req.Name == "" {
		return nil, errors.New("product name is required")
	}
	if req.Price <= 0 {
		return nil, errors.New("price must be greater than zero")
	}
	if req.StockQuantity < 0 {
		return nil, errors.New("stock quantity cannot be negative")
	}

	loc := req.Location
	if loc == "" {
		if supplier.Municipality != "" && supplier.Province != "" {
			loc = fmt.Sprintf("%s, %s", supplier.Municipality, supplier.Province)
		} else if supplier.Address != "" {
			loc = supplier.Address
		} else if supplier.Province != "" {
			loc = supplier.Province
		} else {
			loc = "Northern Mindanao"
		}
	}

	product := &models.SupplyProduct{
		SupplierID:    supplier.ID,
		SupplierName:  fmt.Sprintf("%s %s", supplier.FirstName, supplier.LastName),
		IsVerified:    supplier.IsVerified,
		Name:          req.Name,
		Category:      req.Category,
		Description:   req.Description,
		Price:         req.Price,
		StockQuantity: req.StockQuantity,
		Unit:          req.Unit,
		Location:      loc,
		Images:        req.Images,
	}

	if err := s.supplyRepo.CreateProduct(ctx, product); err != nil {
		return nil, err
	}

	if s.cache != nil {
		s.cache.Clear()
	}

	return product, nil
}

// ListProducts retrieves products matching filters.
func (s *SupplyService) ListProducts(ctx context.Context, filter repository.SupplyFilter) ([]models.SupplyProduct, error) {
	cacheKey := fmt.Sprintf("sup_prod_%s_%s_%s", filter.Category, filter.Query, filter.SupplierID)
	if s.cache != nil {
		if val, found := s.cache.Get(cacheKey); found {
			if cachedList, ok := val.([]models.SupplyProduct); ok {
				return cachedList, nil
			}
		}
	}

	res, err := s.supplyRepo.ListProducts(ctx, filter)
	if err == nil && s.cache != nil {
		s.cache.Set(cacheKey, res, 30*time.Second)
	}
	return res, err
}

// GetProductByID finds a single product.
func (s *SupplyService) GetProductByID(ctx context.Context, id string) (*models.SupplyProduct, error) {
	cacheKey := fmt.Sprintf("sup_item_%s", id)
	if s.cache != nil {
		if val, found := s.cache.Get(cacheKey); found {
			if cachedItem, ok := val.(*models.SupplyProduct); ok {
				return cachedItem, nil
			}
		}
	}

	oid, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("invalid product ID: %w", err)
	}
	res, err := s.supplyRepo.GetProductByID(ctx, oid)
	if err == nil && s.cache != nil {
		s.cache.Set(cacheKey, res, 60*time.Second)
	}
	return res, err
}

// UpdateProduct updates product details.
func (s *SupplyService) UpdateProduct(ctx context.Context, supplierID string, productID string, req models.UpdateSupplyProductRequest) (*models.SupplyProduct, error) {
	pOID, err := bson.ObjectIDFromHex(productID)
	if err != nil {
		return nil, fmt.Errorf("invalid product ID: %w", err)
	}

	existing, err := s.supplyRepo.GetProductByID(ctx, pOID)
	if err != nil {
		return nil, err
	}

	if existing.SupplierID.Hex() != supplierID {
		return nil, errors.New("unauthorized to update this product")
	}

	update := bson.M{}
	if req.Name != nil {
		update["name"] = *req.Name
	}
	if req.Category != nil {
		update["category"] = *req.Category
	}
	if req.Description != nil {
		update["description"] = *req.Description
	}
	if req.Price != nil {
		update["price"] = *req.Price
	}
	if req.StockQuantity != nil {
		update["stock_quantity"] = *req.StockQuantity
	}
	if req.Unit != nil {
		update["unit"] = *req.Unit
	}
	if req.Location != nil {
		update["location"] = *req.Location
	}
	if req.Images != nil {
		update["images"] = req.Images
	}

	if err := s.supplyRepo.UpdateProduct(ctx, pOID, update); err != nil {
		return nil, err
	}

	if s.cache != nil {
		s.cache.Clear()
	}

	return s.supplyRepo.GetProductByID(ctx, pOID)
}

// DeleteProduct deletes a product.
func (s *SupplyService) DeleteProduct(ctx context.Context, supplierID string, productID string) error {
	pOID, err := bson.ObjectIDFromHex(productID)
	if err != nil {
		return fmt.Errorf("invalid product ID: %w", err)
	}

	existing, err := s.supplyRepo.GetProductByID(ctx, pOID)
	if err != nil {
		return err
	}

	if existing.SupplierID.Hex() != supplierID {
		return errors.New("unauthorized to delete this product")
	}

	if err := s.supplyRepo.DeleteProduct(ctx, pOID); err != nil {
		return err
	}

	if s.cache != nil {
		s.cache.Clear()
	}

	return nil
}

// CreateOrder places an order for supply products (Farmer).
func (s *SupplyService) CreateOrder(ctx context.Context, buyerID string, req models.CreateSupplyOrderRequest) (*models.SupplyOrder, error) {
	bOID, err := bson.ObjectIDFromHex(buyerID)
	if err != nil {
		return nil, fmt.Errorf("invalid buyer ID: %w", err)
	}

	buyer, err := s.userRepo.FindByID(ctx, bOID)
	if err != nil {
		return nil, fmt.Errorf("fetch buyer: %w", err)
	}

	if len(req.Items) == 0 {
		return nil, errors.New("order must contain at least one item")
	}

	var items []models.SupplyOrderItem
	var totalAmount float64
	var supplierID bson.ObjectID
	var supplierName string

	type validatedItem struct {
		product  *models.SupplyProduct
		quantity int
	}
	var validated []validatedItem

	for i, itemReq := range req.Items {
		pOID, err := bson.ObjectIDFromHex(itemReq.ProductID)
		if err != nil {
			return nil, fmt.Errorf("invalid product ID at index %d: %w", i, err)
		}

		product, err := s.supplyRepo.GetProductByID(ctx, pOID)
		if err != nil {
			if errors.Is(err, repository.ErrProductNotFound) {
				return nil, fmt.Errorf("product (ID: %s) is no longer available or was removed by the supplier", itemReq.ProductID)
			}
			return nil, fmt.Errorf("fetch product: %w", err)
		}

		if product.StockQuantity < itemReq.Quantity {
			return nil, fmt.Errorf("insufficient stock for %s (available: %d)", product.Name, product.StockQuantity)
		}

		if i == 0 {
			supplierID = product.SupplierID
			supplierName = product.SupplierName
		} else if product.SupplierID != supplierID {
			return nil, errors.New("all items in an order must be from the same supplier; please place separate orders per supplier")
		}

		validated = append(validated, validatedItem{product: product, quantity: itemReq.Quantity})
	}

	for _, v := range validated {
		itemTotal := float64(v.quantity) * v.product.Price
		totalAmount += itemTotal

		img := ""
		if len(v.product.Images) > 0 {
			img = v.product.Images[0]
		}
		items = append(items, models.SupplyOrderItem{
			ProductID:    v.product.ID,
			ProductName:  v.product.Name,
			ProductImage: img,
			Quantity:     v.quantity,
			PricePerItem: v.product.Price,
		})

		// Deduct inventory
		if err := s.supplyRepo.DeductStock(ctx, v.product.ID, v.quantity); err != nil {
			return nil, fmt.Errorf("deduct inventory for %s: %w", v.product.Name, err)
		}
	}

	subtotal := totalAmount
	var shippingFee float64 = 0 // default 0 for pickup; for delivery, confirmed by supplier upon order acceptance
	finalTotal := subtotal + shippingFee

	order := &models.SupplyOrder{
		BuyerID:         buyer.ID,
		BuyerName:       fmt.Sprintf("%s %s", buyer.FirstName, buyer.LastName),
		SupplierID:      supplierID,
		SupplierName:    supplierName,
		Items:           items,
		Subtotal:        subtotal,
		ShippingFee:     shippingFee,
		TotalAmount:     finalTotal,
		DeliveryMethod:  req.DeliveryMethod,
		DeliveryAddress: req.DeliveryAddress,
		Status:          models.SupplyOrderPending,
		// Default payment method to COD if the client omits it.
		PaymentMethod: func() models.PaymentMethod {
			if req.PaymentMethod == "" {
				return models.PaymentCOD
			}
			return req.PaymentMethod
		}(),
		PaymentRefNo:    req.PaymentRefNo,
		PaymentProofURL: req.PaymentProofURL,
		// If buyer submitted e-wallet/bank payment with a ref number, mark as verification pending
		PaymentStatus: func() models.PaymentStatus {
			if (req.PaymentMethod == models.PaymentGCash || req.PaymentMethod == models.PaymentMaya || req.PaymentMethod == models.PaymentBankTransfer) && req.PaymentRefNo != "" {
				return models.PaymentStatusVerificationPending
			}
			return models.PaymentStatusPending
		}(),
	}

	if err := s.supplyRepo.CreateOrder(ctx, order); err != nil {
		return nil, err
	}

	// Trigger Notification to Supplier
	if s.notifRepo != nil {
		_ = s.notifRepo.CreateNotification(ctx, &models.Notification{
			UserID:  supplierID,
			Title:   "📦 New Supply Order Received",
			Message: fmt.Sprintf("%s placed an order for %d item(s) totaling ₱%.2f", order.BuyerName, len(items), order.TotalAmount),
			Type:    models.NotifTypeOrderStatus,
			Link:    "/supply/orders",
		})
	}

	return order, nil
}

// ListOrders returns supply orders for a user.
func (s *SupplyService) ListOrders(ctx context.Context, userID string, role string) ([]models.SupplyOrder, error) {
	return s.supplyRepo.ListOrders(ctx, userID, role)
}

// UpdateOrderStatus updates an order's fulfillment status and optional shipping fee.
func (s *SupplyService) UpdateOrderStatus(ctx context.Context, userID string, orderID string, req models.UpdateSupplyOrderStatusRequest) (*models.SupplyOrder, error) {
	oOID, err := bson.ObjectIDFromHex(orderID)
	if err != nil {
		return nil, fmt.Errorf("invalid order ID: %w", err)
	}

	order, err := s.supplyRepo.GetOrderByID(ctx, oOID)
	if err != nil {
		return nil, err
	}

	if order.SupplierID.Hex() != userID && order.BuyerID.Hex() != userID {
		return nil, errors.New("unauthorized to update this order")
	}

	var shippingFee *float64
	var totalAmount *float64
	if req.ShippingFee != nil && order.SupplierID.Hex() == userID {
		fee := *req.ShippingFee
		if fee < 0 {
			fee = 0
		}
		subtotal := order.Subtotal
		if subtotal == 0 {
			subtotal = order.TotalAmount
		}
		total := subtotal + fee
		shippingFee = &fee
		totalAmount = &total
	}

	status := req.Status
	// If it's a delivery order and supplier confirms/quotes shipping fee from Pending status,
	// move to Quoted status so buyer can approve total before processing starts.
	if order.SupplierID.Hex() == userID && order.Status == models.SupplyOrderPending && (status == models.SupplyOrderProcessing || status == models.SupplyOrderQuoted) && order.DeliveryMethod == models.DeliveryShip {
		status = models.SupplyOrderQuoted
	}

	if err := s.supplyRepo.UpdateOrderStatusWithShipping(ctx, oOID, status, shippingFee, totalAmount); err != nil {
		return nil, err
	}

	// When an active order is cancelled, restore stock back to products
	if status == models.SupplyOrderCancelled && order.Status != models.SupplyOrderCancelled && order.Status != models.SupplyOrderCompleted {
		for _, item := range order.Items {
			_ = s.supplyRepo.RestoreStock(ctx, item.ProductID, item.Quantity)
		}
	}

	updated, err := s.supplyRepo.GetOrderByID(ctx, oOID)
	if err == nil && s.notifRepo != nil {
		if status == models.SupplyOrderQuoted {
			feeVal := 0.0
			if shippingFee != nil {
				feeVal = *shippingFee
			}
			_ = s.notifRepo.CreateNotification(ctx, &models.Notification{
				UserID:  updated.BuyerID,
				Title:   "🚚 Delivery Fee Quoted - Action Required",
				Message: fmt.Sprintf("Supplier %s quoted ₱%.2f shipping fee for order #%s. Please review and approve total.", updated.SupplierName, feeVal, updated.ID.Hex()[:8]),
				Type:    models.NotifTypeOrderStatus,
				Link:    "/supply/orders",
			})
		} else if status == models.SupplyOrderCancelled {
			if userID == updated.BuyerID.Hex() {
				// Buyer cancelled -> Notify supplier
				_ = s.notifRepo.CreateNotification(ctx, &models.Notification{
					UserID:  updated.SupplierID,
					Title:   "✕ Order Cancelled by Buyer",
					Message: fmt.Sprintf("%s cancelled order #%s", updated.BuyerName, updated.ID.Hex()[:8]),
					Type:    models.NotifTypeOrderStatus,
					Link:    "/supply/orders",
				})
			} else {
				// Supplier cancelled -> Notify buyer
				_ = s.notifRepo.CreateNotification(ctx, &models.Notification{
					UserID:  updated.BuyerID,
					Title:   "✕ Order Cancelled by Supplier",
					Message: fmt.Sprintf("Supplier %s cancelled your order #%s", updated.SupplierName, updated.ID.Hex()[:8]),
					Type:    models.NotifTypeOrderStatus,
					Link:    "/supply/orders",
				})
			}
		} else {
			// Notify buyer about status change
			_ = s.notifRepo.CreateNotification(ctx, &models.Notification{
				UserID:  updated.BuyerID,
				Title:   "🚚 Order Status Updated",
				Message: fmt.Sprintf("Your supply order from %s is now %s", updated.SupplierName, status),
				Type:    models.NotifTypeOrderStatus,
				Link:    "/supply/orders",
			})
		}
	}

	return updated, err
}

// RespondToQuote allows a buyer to approve, switch to pickup, or reject a quoted shipping fee.
func (s *SupplyService) RespondToQuote(ctx context.Context, userID string, orderID string, req models.BuyerQuoteDecisionRequest) (*models.SupplyOrder, error) {
	oOID, err := bson.ObjectIDFromHex(orderID)
	if err != nil {
		return nil, fmt.Errorf("invalid order ID: %w", err)
	}

	order, err := s.supplyRepo.GetOrderByID(ctx, oOID)
	if err != nil {
		return nil, err
	}

	if order.BuyerID.Hex() != userID {
		return nil, errors.New("only the buyer can respond to a quoted delivery fee")
	}

	if order.Status != models.SupplyOrderQuoted && order.Status != models.SupplyOrderPending {
		return nil, fmt.Errorf("order cannot be updated from status %s", order.Status)
	}

	action := strings.ToLower(strings.TrimSpace(req.Action))
	var newStatus models.SupplyOrderStatus
	deliveryMethod := order.DeliveryMethod
	shippingFee := order.ShippingFee
	totalAmount := order.TotalAmount

	subtotal := order.Subtotal
	if subtotal <= 0 {
		var calcSubtotal float64
		for _, item := range order.Items {
			calcSubtotal += float64(item.Quantity) * item.PricePerItem
		}
		subtotal = calcSubtotal
	}

	switch action {
	case "approve":
		newStatus = models.SupplyOrderProcessing
		totalAmount = subtotal + shippingFee
		if err := s.supplyRepo.UpdateOrderQuoteDecision(ctx, oOID, newStatus, deliveryMethod, shippingFee, totalAmount); err != nil {
			return nil, err
		}
		if s.notifRepo != nil {
			_ = s.notifRepo.CreateNotification(ctx, &models.Notification{
				UserID:  order.SupplierID,
				Title:   "✅ Order Total Approved",
				Message: fmt.Sprintf("Buyer %s approved total of ₱%.2f (including ₱%.2f shipping fee) for order #%s. You may now pack and process.", order.BuyerName, totalAmount, shippingFee, order.ID.Hex()[:8]),
				Type:    models.NotifTypeOrderStatus,
				Link:    "/supply/orders",
			})
		}

	case "switch_pickup":
		newStatus = models.SupplyOrderProcessing
		deliveryMethod = models.DeliveryPickup
		shippingFee = 0
		totalAmount = subtotal
		if err := s.supplyRepo.UpdateOrderQuoteDecision(ctx, oOID, newStatus, deliveryMethod, shippingFee, totalAmount); err != nil {
			return nil, err
		}
		if s.notifRepo != nil {
			_ = s.notifRepo.CreateNotification(ctx, &models.Notification{
				UserID:  order.SupplierID,
				Title:   "🚗 Switched to Store Pickup",
				Message: fmt.Sprintf("Buyer %s switched order #%s to Store Pickup (₱0 fee). Total is ₱%.2f. Ready for preparation!", order.BuyerName, order.ID.Hex()[:8], totalAmount),
				Type:    models.NotifTypeOrderStatus,
				Link:    "/supply/orders",
			})
		}

	case "reject":
		newStatus = models.SupplyOrderCancelled
		if err := s.supplyRepo.UpdateOrderStatus(ctx, oOID, newStatus); err != nil {
			return nil, err
		}
		// Restore reserved stock
		for _, item := range order.Items {
			_ = s.supplyRepo.RestoreStock(ctx, item.ProductID, item.Quantity)
		}
		if s.notifRepo != nil {
			_ = s.notifRepo.CreateNotification(ctx, &models.Notification{
				UserID:  order.SupplierID,
				Title:   "📦 Order Quote Declined",
				Message: fmt.Sprintf("Buyer %s declined the quoted shipping fee and cancelled order #%s.", order.BuyerName, order.ID.Hex()[:8]),
				Type:    models.NotifTypeOrderStatus,
				Link:    "/supply/orders",
			})
		}

	default:
		return nil, fmt.Errorf("invalid action: %s (expected 'approve', 'switch_pickup', or 'reject')", req.Action)
	}

	return s.supplyRepo.GetOrderByID(ctx, oOID)
}

// UpdatePaymentStatus updates the payment status of a supply order.
func (s *SupplyService) UpdatePaymentStatus(ctx context.Context, userID string, orderID string, req models.UpdatePaymentStatusRequest) (*models.SupplyOrder, error) {
	oOID, err := bson.ObjectIDFromHex(orderID)
	if err != nil {
		return nil, fmt.Errorf("invalid order ID: %w", err)
	}

	order, err := s.supplyRepo.GetOrderByID(ctx, oOID)
	if err != nil {
		return nil, err
	}

	if order.SupplierID.Hex() != userID && order.BuyerID.Hex() != userID {
		return nil, errors.New("unauthorized to update payment status for this order")
	}

	if err := s.supplyRepo.UpdatePaymentStatus(ctx, oOID, req.PaymentStatus, req.PaymentNote); err != nil {
		return nil, err
	}

	updated, err := s.supplyRepo.GetOrderByID(ctx, oOID)
	if err == nil && s.notifRepo != nil {
		// Notify buyer about payment status change
		_ = s.notifRepo.CreateNotification(ctx, &models.Notification{
			UserID:  updated.BuyerID,
			Title:   "💵 Payment Confirmed",
			Message: fmt.Sprintf("Payment status for order from %s has been updated to %s", updated.SupplierName, req.PaymentStatus),
			Type:    models.NotifTypePaymentStatus,
			Link:    "/supply/orders",
		})
	}

	return updated, err
}

// SubmitPaymentRef allows a buyer to submit/update their transaction reference number post-checkout.
func (s *SupplyService) SubmitPaymentRef(ctx context.Context, userID string, orderID string, req models.SubmitPaymentRefRequest) (*models.SupplyOrder, error) {
	oOID, err := bson.ObjectIDFromHex(orderID)
	if err != nil {
		return nil, fmt.Errorf("invalid order ID: %w", err)
	}

	order, err := s.supplyRepo.GetOrderByID(ctx, oOID)
	if err != nil {
		return nil, err
	}

	if order.BuyerID.Hex() != userID {
		return nil, errors.New("unauthorized: only the buyer can submit payment reference for this order")
	}

	if strings.TrimSpace(req.PaymentRefNo) == "" {
		return nil, errors.New("payment reference number is required")
	}

	if err := s.supplyRepo.SubmitPaymentRef(ctx, oOID, strings.TrimSpace(req.PaymentRefNo), req.PaymentProofURL); err != nil {
		return nil, err
	}

	updated, err := s.supplyRepo.GetOrderByID(ctx, oOID)
	if err == nil && s.notifRepo != nil {
		_ = s.notifRepo.CreateNotification(ctx, &models.Notification{
			UserID:  updated.SupplierID,
			Title:   "📲 Payment Ref Received",
			Message: fmt.Sprintf("Buyer %s submitted Ref No #%s for order. Please verify.", updated.BuyerName, req.PaymentRefNo),
			Type:    models.NotifTypePaymentStatus,
			Link:    "/supply/orders",
		})
	}

	return updated, err
}

