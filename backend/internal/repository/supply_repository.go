package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/agriconnect/backend/internal/models"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var (
	ErrProductNotFound = errors.New("supply product not found")
	ErrOrderNotFound   = errors.New("supply order not found")
	ErrInsufficientStock = errors.New("insufficient stock for product")
)

type SupplyFilter struct {
	Category   string
	Query      string
	SupplierID string
}

type SupplyRepository struct {
	productsColl *mongo.Collection
	ordersColl   *mongo.Collection
}

func NewSupplyRepository(db *mongo.Database) *SupplyRepository {
	repo := &SupplyRepository{
		productsColl: db.Collection("supply_products"),
		ordersColl:   db.Collection("supply_orders"),
	}
	repo.ensureIndexes()
	return repo
}

func (r *SupplyRepository) ensureIndexes() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, _ = r.productsColl.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "category", Value: 1}}},
		{Keys: bson.D{{Key: "name", Value: 1}}},
		{Keys: bson.D{{Key: "supplier_id", Value: 1}}},
	})

	_, _ = r.ordersColl.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "buyer_id", Value: 1}}},
		{Keys: bson.D{{Key: "supplier_id", Value: 1}}},
	})
}

// CreateProduct inserts a new supply product.
func (r *SupplyRepository) CreateProduct(ctx context.Context, prod *models.SupplyProduct) error {
	prod.CreatedAt = time.Now()
	prod.UpdatedAt = time.Now()

	res, err := r.productsColl.InsertOne(ctx, prod)
	if err != nil {
		return fmt.Errorf("insert product: %w", err)
	}

	if oid, ok := res.InsertedID.(bson.ObjectID); ok {
		prod.ID = oid
	}
	return nil
}

// ListProducts returns all products matching category or search query.
func (r *SupplyRepository) ListProducts(ctx context.Context, filter SupplyFilter) ([]models.SupplyProduct, error) {
	query := bson.M{}

	if filter.Category != "" {
		query["category"] = filter.Category
	}
	if filter.Query != "" {
		query["name"] = bson.M{"$regex": filter.Query, "$options": "i"}
	}
	if filter.SupplierID != "" {
		if oid, err := bson.ObjectIDFromHex(filter.SupplierID); err == nil {
			query["supplier_id"] = oid
		}
	}

	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := r.productsColl.Find(ctx, query, opts)
	if err != nil {
		return nil, fmt.Errorf("find products: %w", err)
	}
	defer cursor.Close(ctx)

	var products []models.SupplyProduct
	if err := cursor.All(ctx, &products); err != nil {
		return nil, fmt.Errorf("decode products: %w", err)
	}
	if products == nil {
		products = []models.SupplyProduct{}
	}
	return products, nil
}

// GetProductByID finds a product by ID.
func (r *SupplyRepository) GetProductByID(ctx context.Context, id bson.ObjectID) (*models.SupplyProduct, error) {
	var product models.SupplyProduct
	err := r.productsColl.FindOne(ctx, bson.M{"_id": id}).Decode(&product)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrProductNotFound
		}
		return nil, fmt.Errorf("get product: %w", err)
	}
	return &product, nil
}

// UpdateProduct updates product details.
func (r *SupplyRepository) UpdateProduct(ctx context.Context, id bson.ObjectID, update bson.M) error {
	update["updated_at"] = time.Now()
	res, err := r.productsColl.UpdateByID(ctx, id, bson.M{"$set": update})
	if err != nil {
		return fmt.Errorf("update product: %w", err)
	}
	if res.MatchedCount == 0 {
		return ErrProductNotFound
	}
	return nil
}

// DeleteProduct removes a product.
func (r *SupplyRepository) DeleteProduct(ctx context.Context, id bson.ObjectID) error {
	res, err := r.productsColl.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return fmt.Errorf("delete product: %w", err)
	}
	if res.DeletedCount == 0 {
		return ErrProductNotFound
	}
	return nil
}

// DeductStock decreases product stock quantity safely.
func (r *SupplyRepository) DeductStock(ctx context.Context, id bson.ObjectID, quantity int) error {
	filter := bson.M{
		"_id":            id,
		"stock_quantity": bson.M{"$gte": quantity},
	}
	update := bson.M{
		"$inc": bson.M{"stock_quantity": -quantity},
		"$set": bson.M{"updated_at": time.Now()},
	}

	res, err := r.productsColl.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("deduct stock: %w", err)
	}
	if res.MatchedCount == 0 {
		return ErrInsufficientStock
	}
	return nil
}

// RestoreStock increases product stock quantity when an order is cancelled.
func (r *SupplyRepository) RestoreStock(ctx context.Context, id bson.ObjectID, quantity int) error {
	filter := bson.M{"_id": id}
	update := bson.M{
		"$inc": bson.M{"stock_quantity": quantity},
		"$set": bson.M{"updated_at": time.Now()},
	}
	_, err := r.productsColl.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("restore stock: %w", err)
	}
	return nil
}

// CreateOrder inserts a new supply order.
func (r *SupplyRepository) CreateOrder(ctx context.Context, order *models.SupplyOrder) error {
	order.CreatedAt = time.Now()
	order.UpdatedAt = time.Now()

	res, err := r.ordersColl.InsertOne(ctx, order)
	if err != nil {
		return fmt.Errorf("insert order: %w", err)
	}

	if oid, ok := res.InsertedID.(bson.ObjectID); ok {
		order.ID = oid
	}
	return nil
}

// ListOrders retrieves supply orders for a buyer (farmer) or supplier.
func (r *SupplyRepository) ListOrders(ctx context.Context, userID string, role string) ([]models.SupplyOrder, error) {
	oid, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user id: %w", err)
	}

	query := bson.M{}
	if role == "supplier" {
		query["supplier_id"] = oid
	} else if role == "farmer" || role == "buyer" {
		query["buyer_id"] = oid
	} else {
		query["$or"] = []bson.M{{"buyer_id": oid}, {"supplier_id": oid}}
	}

	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := r.ordersColl.Find(ctx, query, opts)
	if err != nil {
		return nil, fmt.Errorf("find orders: %w", err)
	}
	defer cursor.Close(ctx)

	var orders []models.SupplyOrder
	if err := cursor.All(ctx, &orders); err != nil {
		return nil, fmt.Errorf("decode orders: %w", err)
	}
	if orders == nil {
		orders = []models.SupplyOrder{}
	}
	return orders, nil
}

// GetOrderByID finds a single supply order.
func (r *SupplyRepository) GetOrderByID(ctx context.Context, id bson.ObjectID) (*models.SupplyOrder, error) {
	var order models.SupplyOrder
	err := r.ordersColl.FindOne(ctx, bson.M{"_id": id}).Decode(&order)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrOrderNotFound
		}
		return nil, fmt.Errorf("get order: %w", err)
	}
	return &order, nil
}

// UpdateOrderStatus updates the status of an order.
func (r *SupplyRepository) UpdateOrderStatus(ctx context.Context, orderID bson.ObjectID, status models.SupplyOrderStatus) error {
	return r.UpdateOrderStatusWithShipping(ctx, orderID, status, nil, nil)
}

// UpdateOrderStatusWithShipping updates the status, shipping fee, and total amount of an order.
func (r *SupplyRepository) UpdateOrderStatusWithShipping(ctx context.Context, orderID bson.ObjectID, status models.SupplyOrderStatus, shippingFee *float64, totalAmount *float64) error {
	update := bson.M{
		"status":     status,
		"updated_at": time.Now(),
	}
	if shippingFee != nil {
		update["shipping_fee"] = *shippingFee
	}
	if totalAmount != nil {
		update["total_amount"] = *totalAmount
	}
	res, err := r.ordersColl.UpdateByID(ctx, orderID, bson.M{"$set": update})
	if err != nil {
		return fmt.Errorf("update order status: %w", err)
	}
	if res.MatchedCount == 0 {
		return ErrOrderNotFound
	}
	return nil
}

// UpdateOrderQuoteDecision updates order status, delivery method, fee and total when buyer makes decision.
func (r *SupplyRepository) UpdateOrderQuoteDecision(ctx context.Context, orderID bson.ObjectID, status models.SupplyOrderStatus, deliveryMethod models.DeliveryMethod, shippingFee float64, totalAmount float64) error {
	update := bson.M{
		"status":          status,
		"delivery_method": deliveryMethod,
		"shipping_fee":    shippingFee,
		"total_amount":    totalAmount,
		"updated_at":      time.Now(),
	}
	res, err := r.ordersColl.UpdateByID(ctx, orderID, bson.M{"$set": update})
	if err != nil {
		return fmt.Errorf("update order quote decision: %w", err)
	}
	if res.MatchedCount == 0 {
		return ErrOrderNotFound
	}
	return nil
}

// UpdatePaymentStatus updates the payment_status (and optional note) of a supply order.
// Called by the supplier to confirm COD receipt, or by the payment gateway webhook for online payments.
func (r *SupplyRepository) UpdatePaymentStatus(ctx context.Context, orderID bson.ObjectID, status models.PaymentStatus, note string) error {
	fields := bson.M{
		"payment_status": status,
		"updated_at":     time.Now(),
	}
	if note != "" {
		fields["payment_note"] = note
	}
	res, err := r.ordersColl.UpdateByID(ctx, orderID, bson.M{"$set": fields})
	if err != nil {
		return fmt.Errorf("update payment status: %w", err)
	}
	if res.MatchedCount == 0 {
		return ErrOrderNotFound
	}
	return nil
}

// SubmitPaymentRef updates payment_ref_no, payment_proof_url, and payment_status to verification_pending.
func (r *SupplyRepository) SubmitPaymentRef(ctx context.Context, orderID bson.ObjectID, refNo string, proofURL string) error {
	fields := bson.M{
		"payment_ref_no": refNo,
		"payment_status": models.PaymentStatusVerificationPending,
		"updated_at":     time.Now(),
	}
	if proofURL != "" {
		fields["payment_proof_url"] = proofURL
	}
	res, err := r.ordersColl.UpdateByID(ctx, orderID, bson.M{"$set": fields})
	if err != nil {
		return fmt.Errorf("submit payment ref: %w", err)
	}
	if res.MatchedCount == 0 {
		return ErrOrderNotFound
	}
	return nil
}

