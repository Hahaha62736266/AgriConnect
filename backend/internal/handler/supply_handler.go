package handler

import (
	"encoding/json"
	"net/http"

	"github.com/agriconnect/backend/internal/middleware"
	"github.com/agriconnect/backend/internal/models"
	"github.com/agriconnect/backend/internal/repository"
	"github.com/agriconnect/backend/internal/service"
	"github.com/go-chi/chi/v5"
)

type SupplyHandler struct {
	supplyService *service.SupplyService
}

func NewSupplyHandler(supplyService *service.SupplyService) *SupplyHandler {
	return &SupplyHandler{supplyService: supplyService}
}

// CreateProduct handles POST /api/supply/products (Supplier only).
func (h *SupplyHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	supplierID := middleware.GetUserID(r.Context())
	if supplierID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req models.CreateSupplyProductRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	product, err := h.supplyService.CreateProduct(r.Context(), supplierID, req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, product)
}

// ListProducts handles GET /api/supply/products (Public / Auth).
func (h *SupplyHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := repository.SupplyFilter{
		Category:   q.Get("category"),
		Query:      q.Get("q"),
		SupplierID: q.Get("supplierId"),
	}

	products, err := h.supplyService.ListProducts(r.Context(), filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch supply products")
		return
	}

	writeJSON(w, http.StatusOK, products)
}

// GetProductByID handles GET /api/supply/products/{id}.
func (h *SupplyHandler) GetProductByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	product, err := h.supplyService.GetProductByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "product not found")
		return
	}

	writeJSON(w, http.StatusOK, product)
}

// UpdateProduct handles PUT /api/supply/products/{id} (Supplier only).
func (h *SupplyHandler) UpdateProduct(w http.ResponseWriter, r *http.Request) {
	supplierID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")

	var req models.UpdateSupplyProductRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	product, err := h.supplyService.UpdateProduct(r.Context(), supplierID, id, req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, product)
}

// DeleteProduct handles DELETE /api/supply/products/{id} (Supplier only).
func (h *SupplyHandler) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	supplierID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")

	if err := h.supplyService.DeleteProduct(r.Context(), supplierID, id); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "product deleted"})
}

// CreateOrder handles POST /api/supply/orders (Farmer only).
func (h *SupplyHandler) CreateOrder(w http.ResponseWriter, r *http.Request) {
	buyerID := middleware.GetUserID(r.Context())

	var req models.CreateSupplyOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	order, err := h.supplyService.CreateOrder(r.Context(), buyerID, req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, order)
}

// ListOrders handles GET /api/supply/orders (Farmer / Supplier).
func (h *SupplyHandler) ListOrders(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	role := middleware.GetRole(r.Context())

	orders, err := h.supplyService.ListOrders(r.Context(), userID, role)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch supply orders")
		return
	}

	writeJSON(w, http.StatusOK, orders)
}

// UpdateOrderStatus handles PUT /api/supply/orders/{id}/status.
func (h *SupplyHandler) UpdateOrderStatus(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	orderID := chi.URLParam(r, "id")

	var req models.UpdateSupplyOrderStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	order, err := h.supplyService.UpdateOrderStatus(r.Context(), userID, orderID, req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, order)
}

// UpdatePaymentStatus handles PUT /api/supply/orders/{id}/payment-status.
// Suppliers call this to confirm COD cash has been received upon delivery.
// Future: a payment gateway webhook handler will also call this for online payments.
func (h *SupplyHandler) UpdatePaymentStatus(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	orderID := chi.URLParam(r, "id")

	var req models.UpdatePaymentStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.PaymentStatus == "" {
		writeError(w, http.StatusBadRequest, "paymentStatus is required")
		return
	}

	order, err := h.supplyService.UpdatePaymentStatus(r.Context(), userID, orderID, req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, order)
}

// RespondToQuote handles POST /api/supply/orders/{id}/quote-decision (Buyer).
func (h *SupplyHandler) RespondToQuote(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	orderID := chi.URLParam(r, "id")

	var req models.BuyerQuoteDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	order, err := h.supplyService.RespondToQuote(r.Context(), userID, orderID, req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, order)
}

// SubmitPaymentRef handles PUT /api/supply/orders/{id}/payment-ref (Buyer).
func (h *SupplyHandler) SubmitPaymentRef(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	orderID := chi.URLParam(r, "id")

	var req models.SubmitPaymentRefRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	order, err := h.supplyService.SubmitPaymentRef(r.Context(), userID, orderID, req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, order)
}

