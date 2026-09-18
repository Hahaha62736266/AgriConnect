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
	ErrListingNotFound     = errors.New("produce listing not found")
	ErrTransactionNotFound = errors.New("produce transaction not found")
)

type ProduceFilter struct {
	CropName string
	Category string
	Location string
	MinPrice float64
	MaxPrice float64
	Status   string
	FarmerID string
}

type ProduceRepository struct {
	listingsColl     *mongo.Collection
	transactionsColl *mongo.Collection
}

func NewProduceRepository(db *mongo.Database) *ProduceRepository {
	repo := &ProduceRepository{
		listingsColl:     db.Collection("produce_listings"),
		transactionsColl: db.Collection("produce_transactions"),
	}
	repo.ensureIndexes()
	return repo
}

func (r *ProduceRepository) ensureIndexes() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, _ = r.listingsColl.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "crop_name", Value: 1}}},
		{Keys: bson.D{{Key: "category", Value: 1}}},
		{Keys: bson.D{{Key: "location", Value: 1}}},
		{Keys: bson.D{{Key: "farmer_id", Value: 1}}},
	})

	_, _ = r.transactionsColl.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "buyer_id", Value: 1}}},
		{Keys: bson.D{{Key: "farmer_id", Value: 1}}},
		{Keys: bson.D{{Key: "listing_id", Value: 1}}},
	})
}

// CreateListing inserts a new crop listing.
func (r *ProduceRepository) CreateListing(ctx context.Context, listing *models.ProduceListing) error {
	listing.CreatedAt = time.Now()
	listing.UpdatedAt = time.Now()

	res, err := r.listingsColl.InsertOne(ctx, listing)
	if err != nil {
		return fmt.Errorf("insert listing: %w", err)
	}

	if oid, ok := res.InsertedID.(bson.ObjectID); ok {
		listing.ID = oid
	}
	return nil
}

// ListListings retrieves crop listings matching filters.
func (r *ProduceRepository) ListListings(ctx context.Context, filter ProduceFilter) ([]models.ProduceListing, error) {
	query := bson.M{}

	if filter.Status != "" {
		query["status"] = filter.Status
	}
	if filter.CropName != "" {
		query["crop_name"] = bson.M{"$regex": filter.CropName, "$options": "i"}
	}
	if filter.Category != "" {
		query["category"] = filter.Category
	}
	if filter.Location != "" {
		query["location"] = bson.M{"$regex": filter.Location, "$options": "i"}
	}
	if filter.FarmerID != "" {
		if oid, err := bson.ObjectIDFromHex(filter.FarmerID); err == nil {
			query["farmer_id"] = oid
		}
	}

	if filter.MinPrice > 0 || filter.MaxPrice > 0 {
		priceQuery := bson.M{}
		if filter.MinPrice > 0 {
			priceQuery["$gte"] = filter.MinPrice
		}
		if filter.MaxPrice > 0 {
			priceQuery["$lte"] = filter.MaxPrice
		}
		query["price_per_unit"] = priceQuery
	}

	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := r.listingsColl.Find(ctx, query, opts)
	if err != nil {
		return nil, fmt.Errorf("find listings: %w", err)
	}
	defer cursor.Close(ctx)

	var listings []models.ProduceListing
	if err := cursor.All(ctx, &listings); err != nil {
		return nil, fmt.Errorf("decode listings: %w", err)
	}
	if listings == nil {
		listings = []models.ProduceListing{}
	}
	return listings, nil
}

// GetListingByID finds a listing by ObjectID hex.
func (r *ProduceRepository) GetListingByID(ctx context.Context, id bson.ObjectID) (*models.ProduceListing, error) {
	var listing models.ProduceListing
	err := r.listingsColl.FindOne(ctx, bson.M{"_id": id}).Decode(&listing)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrListingNotFound
		}
		return nil, fmt.Errorf("get listing: %w", err)
	}
	return &listing, nil
}

// UpdateListing performs a partial update on a listing.
func (r *ProduceRepository) UpdateListing(ctx context.Context, id bson.ObjectID, update bson.M) error {
	update["updated_at"] = time.Now()
	res, err := r.listingsColl.UpdateByID(ctx, id, bson.M{"$set": update})
	if err != nil {
		return fmt.Errorf("update listing: %w", err)
	}
	if res.MatchedCount == 0 {
		return ErrListingNotFound
	}
	return nil
}

// DeleteListing removes a listing.
func (r *ProduceRepository) DeleteListing(ctx context.Context, id bson.ObjectID) error {
	res, err := r.listingsColl.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return fmt.Errorf("delete listing: %w", err)
	}
	if res.DeletedCount == 0 {
		return ErrListingNotFound
	}
	return nil
}

// CreateTransaction inserts a new produce transaction.
func (r *ProduceRepository) CreateTransaction(ctx context.Context, tx *models.ProduceTransaction) error {
	tx.CreatedAt = time.Now()
	tx.UpdatedAt = time.Now()

	res, err := r.transactionsColl.InsertOne(ctx, tx)
	if err != nil {
		return fmt.Errorf("insert transaction: %w", err)
	}

	if oid, ok := res.InsertedID.(bson.ObjectID); ok {
		tx.ID = oid
	}
	return nil
}

// ListTransactions retrieves transactions for a buyer or a farmer.
func (r *ProduceRepository) ListTransactions(ctx context.Context, userID string, role string) ([]models.ProduceTransaction, error) {
	oid, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user id: %w", err)
	}

	// For farmers: use $or so they see BOTH:
	//   - transactions where they are the seller (farmer_id = them)
	//   - transactions where they bought from another farmer (buyer_id = them)
	// For buyers: only show their purchases (buyer_id = them)
	query := bson.M{}
	if role == "buyer" {
		query["buyer_id"] = oid
	} else if role == "farmer" {
		query["$or"] = []bson.M{{"buyer_id": oid}, {"farmer_id": oid}}
	} else {
		query["$or"] = []bson.M{{"buyer_id": oid}, {"farmer_id": oid}}
	}

	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := r.transactionsColl.Find(ctx, query, opts)
	if err != nil {
		return nil, fmt.Errorf("find transactions: %w", err)
	}
	defer cursor.Close(ctx)

	var txs []models.ProduceTransaction
	if err := cursor.All(ctx, &txs); err != nil {
		return nil, fmt.Errorf("decode transactions: %w", err)
	}
	if txs == nil {
		txs = []models.ProduceTransaction{}
	}
	return txs, nil
}

// UpdateTransactionStatus updates a transaction's status.
func (r *ProduceRepository) UpdateTransactionStatus(ctx context.Context, txID bson.ObjectID, status models.TransactionStatus) error {
	return r.UpdateTransactionStatusWithShipping(ctx, txID, status, nil, nil)
}

// UpdateTransactionStatusWithShipping updates a transaction's status and optional shipping fee, total price, and payment fields.
func (r *ProduceRepository) UpdateTransactionStatusWithShipping(ctx context.Context, txID bson.ObjectID, status models.TransactionStatus, shippingFee *float64, totalPrice *float64) error {
	return r.UpdateTransactionStatusFull(ctx, txID, status, shippingFee, totalPrice, nil, nil, nil)
}

// UpdateTransactionStatusFull updates transaction status, shipping, and payment state.
func (r *ProduceRepository) UpdateTransactionStatusFull(ctx context.Context, txID bson.ObjectID, status models.TransactionStatus, shippingFee *float64, totalPrice *float64, paymentStatus *string, paymentRefNo *string, paymentProofUrl *string) error {
	update := bson.M{
		"status":     status,
		"updated_at": time.Now(),
	}
	if shippingFee != nil {
		update["shipping_fee"] = *shippingFee
	}
	if totalPrice != nil {
		update["total_price"] = *totalPrice
	}
	if paymentStatus != nil {
		update["payment_status"] = *paymentStatus
	}
	if paymentRefNo != nil {
		update["payment_ref_no"] = *paymentRefNo
	}
	if paymentProofUrl != nil {
		update["payment_proof_url"] = *paymentProofUrl
	}
	res, err := r.transactionsColl.UpdateByID(ctx, txID, bson.M{"$set": update})
	if err != nil {
		return fmt.Errorf("update transaction status: %w", err)
	}
	if res.MatchedCount == 0 {
		return ErrTransactionNotFound
	}
	return nil
}

// SubmitPaymentRef updates payment reference number, proof URL, and payment status for a transaction.
func (r *ProduceRepository) SubmitPaymentRef(ctx context.Context, txID bson.ObjectID, refNo string, proofURL string) error {
	update := bson.M{
		"payment_ref_no": refNo,
		"updated_at":     time.Now(),
	}
	if proofURL != "" {
		update["payment_proof_url"] = proofURL
	}
	res, err := r.transactionsColl.UpdateByID(ctx, txID, bson.M{"$set": update})
	if err != nil {
		return fmt.Errorf("submit payment ref: %w", err)
	}
	if res.MatchedCount == 0 {
		return ErrTransactionNotFound
	}
	return nil
}

// UpdateTransactionQuoteDecision updates status, delivery method, fee and total when buyer makes decision.
func (r *ProduceRepository) UpdateTransactionQuoteDecision(ctx context.Context, txID bson.ObjectID, status models.TransactionStatus, deliveryMethod string, shippingFee float64, totalPrice float64) error {
	update := bson.M{
		"status":          status,
		"delivery_method": deliveryMethod,
		"shipping_fee":    shippingFee,
		"total_price":     totalPrice,
		"updated_at":      time.Now(),
	}
	res, err := r.transactionsColl.UpdateByID(ctx, txID, bson.M{"$set": update})
	if err != nil {
		return fmt.Errorf("update transaction quote decision: %w", err)
	}
	if res.MatchedCount == 0 {
		return ErrTransactionNotFound
	}
	return nil
}

// GetTransactionByID retrieves a single transaction.
func (r *ProduceRepository) GetTransactionByID(ctx context.Context, txID bson.ObjectID) (*models.ProduceTransaction, error) {
	var tx models.ProduceTransaction
	err := r.transactionsColl.FindOne(ctx, bson.M{"_id": txID}).Decode(&tx)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrTransactionNotFound
		}
		return nil, fmt.Errorf("get transaction: %w", err)
	}
	return &tx, nil
}
