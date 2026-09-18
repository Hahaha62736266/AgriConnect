/** Roles available in the AgriConnect system. */
export type Role = 'farmer' | 'buyer' | 'supplier' | 'lgu_staff' | 'super_admin';

/** User profile as returned by the API. */
export interface User {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone?: string;
  region?: string;
  address?: string;
  photoUrl?: string;
  isVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Request body for POST /api/auth/register. */
export interface RegisterRequest {
  email: string;
  password: string;
  role: Role;
  firstName: string;
  lastName: string;
}

/** Request body for POST /api/auth/login. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Response from successful login or registration. */
export interface AuthResponse {
  token: string;
  user: User;
}

/** Request body for PUT /api/users/me. */
export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  region?: string;
  address?: string;
}

/** Produce Listing Status */
export type ListingStatus = 'available' | 'sold' | 'reserved';

/** Produce Transaction Status */
export type TransactionStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

/** Produce Listing Model */
export interface ProduceListing {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerPhone?: string;
  cropName: string;
  category: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  harvestDate: string;
  location: string;
  photos?: string[];
  description?: string;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProduceListingRequest {
  cropName: string;
  category: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  harvestDate: string;
  location: string;
  photos?: string[];
  description?: string;
}

export interface ProduceTransaction {
  id: string;
  listingId: string;
  cropName: string;
  buyerId: string;
  buyerName: string;
  farmerId: string;
  farmerName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  contactMessage?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentRefNo?: string;
  paymentProofUrl?: string;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProduceTransactionRequest {
  listingId: string;
  quantity: number;
  contactMessage?: string;
}

/** Supply Product Category */
export type SupplyCategory =
  | 'fertilizer'
  | 'pesticide_herbicide_fungicide'
  | 'seeds_seedlings'
  | 'animal_feeds'
  | 'vet_medicines'
  | 'irrigation'
  | 'machinery_equipment'
  | 'nursery_greenhouse'
  | 'packaging_storage'
  | 'tools'
  | 'ppe';

export type DeliveryMethod = 'delivery' | 'pickup';

export type SupplyOrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped_ready'
  | 'completed'
  | 'cancelled';

export interface SupplyProduct {
  id: string;
  supplierId: string;
  supplierName: string;
  isVerified: boolean;
  name: string;
  category: SupplyCategory;
  description: string;
  price: number;
  stockQuantity: number;
  unit: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplyProductRequest {
  name: string;
  category: SupplyCategory;
  description: string;
  price: number;
  stockQuantity: number;
  unit: string;
  images?: string[];
}

export interface SupplyOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  pricePerItem: number;
}

export interface SupplyOrder {
  id: string;
  buyerId: string;
  buyerName: string;
  supplierId: string;
  supplierName: string;
  items: SupplyOrderItem[];
  totalAmount: number;
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: string;
  status: SupplyOrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplyOrderRequest {
  items: { productId: string; quantity: number }[];
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: string;
}

/** Market Price Model */
export interface MarketPrice {
  id: string;
  cropName: string;
  category: string;
  unit: string;
  price: number;
  region: string;
  marketLocation: string;
  recordedAt: string;
  source: string;
  recordedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMarketPriceRequest {
  cropName: string;
  category: string;
  unit: string;
  price: number;
  region: string;
  marketLocation: string;
  recordedAt: string;
  source: string;
}

export interface LatestPriceResponse {
  cropName: string;
  region: string;
  price: number;
  unit: string;
  marketLocation: string;
  recordedAt: string;
  source: string;
}

/** Farm Income & Expense Models */
export type EntryType = 'income' | 'expense';

export type FinancialCategory =
  | 'produce_sale'
  | 'seeds'
  | 'fertilizer'
  | 'labor'
  | 'equipment'
  | 'other';

export interface FinancialEntry {
  id: string;
  farmerId: string;
  type: EntryType;
  category: FinancialCategory;
  title: string;
  amount: number;
  date: string;
  notes?: string;
  relatedCrop?: string;
  linkedProduceTxId?: string;
  linkedSupplyOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFinancialEntryRequest {
  type: EntryType;
  category: FinancialCategory;
  title: string;
  amount: number;
  date: string;
  notes?: string;
  relatedCrop?: string;
  linkedProduceTxId?: string;
  linkedSupplyOrderId?: string;
}

export interface CategoryBreakdown {
  category: FinancialCategory;
  amount: number;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  breakdown: CategoryBreakdown[];
}

/** Standard API error response. */
export interface ApiError {
  error: string;
}
