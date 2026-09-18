package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type ListingStatus string

const (
	ListingAvailable ListingStatus = "available"
	ListingSold      ListingStatus = "sold"
	ListingReserved  ListingStatus = "reserved"
)

type TransactionStatus string

const (
	TxPending   TransactionStatus = "pending"
	TxQuoted    TransactionStatus = "quoted"
	TxConfirmed TransactionStatus = "confirmed"
	TxCompleted TransactionStatus = "completed"
	TxCancelled TransactionStatus = "cancelled"
)

// ProduceListing represents a farmer's crop listing.
type ProduceListing struct {
	ID           bson.ObjectID `bson:"_id,omitempty"       json:"id"`
	FarmerID     bson.ObjectID `bson:"farmer_id"           json:"farmerId"`
	FarmerName   string        `bson:"farmer_name"         json:"farmerName"`
	FarmerPhone  string        `bson:"farmer_phone"        json:"farmerPhone,omitempty"`
	CropName     string        `bson:"crop_name"           json:"cropName"`
	Category     string        `bson:"category"            json:"category"`
	Quantity     float64       `bson:"quantity"            json:"quantity"`
	Unit         string        `bson:"unit"                json:"unit"` // e.g. "kg", "tons", "sacks"
	PricePerUnit float64       `bson:"price_per_unit"      json:"pricePerUnit"`
	HarvestDate  time.Time     `bson:"harvest_date"        json:"harvestDate"`
	Location     string        `bson:"location"            json:"location"` // Region / Location
	Photos       []string      `bson:"photos,omitempty"    json:"photos,omitempty"`
	Description  string        `bson:"description,omitempty" json:"description,omitempty"`
	Status       ListingStatus `bson:"status"              json:"status"`
	CreatedAt    time.Time     `bson:"created_at"          json:"createdAt"`
	UpdatedAt    time.Time     `bson:"updated_at"          json:"updatedAt"`
}

// CreateProduceListingRequest is the JSON payload to create a produce listing.
type CreateProduceListingRequest struct {
	CropName     string    `json:"cropName"`
	Category     string    `json:"category"`
	Quantity     float64   `json:"quantity"`
	Unit         string    `json:"unit"`
	PricePerUnit float64   `json:"pricePerUnit"`
	HarvestDate  string    `json:"harvestDate"` // YYYY-MM-DD
	Location     string    `json:"location"`
	Photos       []string  `json:"photos,omitempty"`
	Description  string    `json:"description,omitempty"`
}

// UpdateProduceListingRequest is the JSON payload to update a produce listing.
type UpdateProduceListingRequest struct {
	CropName     *string        `json:"cropName,omitempty"`
	Category     *string        `json:"category,omitempty"`
	Quantity     *float64       `json:"quantity,omitempty"`
	Unit         *string        `json:"unit,omitempty"`
	PricePerUnit *float64       `json:"pricePerUnit,omitempty"`
	HarvestDate  *string        `json:"harvestDate,omitempty"`
	Location     *string        `json:"location,omitempty"`
	Photos       []string       `json:"photos,omitempty"`
	Description  *string        `json:"description,omitempty"`
	Status       *ListingStatus `json:"status,omitempty"`
}

// ProduceTransaction represents a purchase order for produce.
type ProduceTransaction struct {
	ID             bson.ObjectID     `bson:"_id,omitempty"       json:"id"`
	ListingID      bson.ObjectID     `bson:"listing_id"          json:"listingId"`
	CropName       string            `bson:"crop_name"           json:"cropName"`
	CropPhoto      string            `bson:"crop_photo,omitempty" json:"cropPhoto,omitempty"`
	BuyerID        bson.ObjectID     `bson:"buyer_id"            json:"buyerId"`
	BuyerName      string            `bson:"buyer_name"          json:"buyerName"`
	FarmerID       bson.ObjectID     `bson:"farmer_id"           json:"farmerId"`
	FarmerName     string            `bson:"farmer_name"         json:"farmerName"`
	Quantity       float64           `bson:"quantity"            json:"quantity"`
	UnitPrice      float64           `bson:"unit_price"          json:"unitPrice"`
	Subtotal       float64           `bson:"subtotal"            json:"subtotal"`
	ShippingFee    float64           `bson:"shipping_fee"        json:"shippingFee"`
	TotalPrice     float64           `bson:"total_price"         json:"totalPrice"`
	DeliveryMethod string            `bson:"delivery_method,omitempty" json:"deliveryMethod,omitempty"`
	DeliveryAddress string           `bson:"delivery_address,omitempty" json:"deliveryAddress,omitempty"`
	ContactMessage string            `bson:"contact_message,omitempty" json:"contactMessage,omitempty"`
	PaymentMethod  string            `bson:"payment_method,omitempty"   json:"paymentMethod,omitempty"`
	PaymentStatus  string            `bson:"payment_status,omitempty"   json:"paymentStatus,omitempty"`
	PaymentRefNo   string            `bson:"payment_ref_no,omitempty"   json:"paymentRefNo,omitempty"`
	PaymentProofURL string           `bson:"payment_proof_url,omitempty" json:"paymentProofUrl,omitempty"`
	Status         TransactionStatus `bson:"status"              json:"status"`
	CreatedAt      time.Time         `bson:"created_at"          json:"createdAt"`
	UpdatedAt      time.Time         `bson:"updated_at"          json:"updatedAt"`
}

// CreateProduceTransactionRequest is the JSON body to initiate a purchase request.
type CreateProduceTransactionRequest struct {
	ListingID       string  `json:"listingId"`
	Quantity        float64 `json:"quantity"`
	ContactMessage  string  `json:"contactMessage,omitempty"`
	DeliveryMethod  string  `json:"deliveryMethod,omitempty"`
	DeliveryAddress string  `json:"deliveryAddress,omitempty"`
	PaymentMethod   string  `json:"paymentMethod,omitempty"`
}

// UpdateTransactionStatusRequest is the JSON payload to update transaction status.
type UpdateTransactionStatusRequest struct {
	Status          TransactionStatus `json:"status"`
	ShippingFee     *float64          `json:"shippingFee,omitempty"`
	PaymentStatus   *string           `json:"paymentStatus,omitempty"`
	PaymentRefNo    *string           `json:"paymentRefNo,omitempty"`
	PaymentProofURL *string           `json:"paymentProofUrl,omitempty"`
}

// SubmitProducePaymentRefRequest is the request to submit payment reference and proof.
type SubmitProducePaymentRefRequest struct {
	PaymentRefNo    string  `json:"paymentRefNo"`
	PaymentProofURL *string `json:"paymentProofUrl,omitempty"`
}

// BuyerQuoteDecisionRequest is the payload for buyer responding to a seller-quoted fee.
type BuyerQuoteDecisionRequest struct {
	Action string `json:"action"` // "approve", "switch_pickup", "reject"
}
