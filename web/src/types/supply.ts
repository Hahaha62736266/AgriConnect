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

export interface SupplyCategoryConfig {
  key: SupplyCategory;
  label: string;
  icon: string;
  suggestedUnits: string[];
  placeholderName: string;
}

export const SUPPLY_CATEGORIES: SupplyCategoryConfig[] = [
  {
    key: 'fertilizer',
    label: 'Fertilizers & Soil Nutrients',
    icon: '🌱',
    suggestedUnits: ['sack (50kg)', 'bag (25kg)', 'kg', 'bottle (1L)', 'liter'],
    placeholderName: 'e.g. Complete 14-14-14, Urea 46-0-0, Organic Vermicast',
  },
  {
    key: 'pesticide_herbicide_fungicide',
    label: 'Crop Protection & Chemicals',
    icon: '🧪',
    suggestedUnits: ['bottle (1L)', 'bottle (500ml)', 'sachet (100g)', 'kg', 'pack'],
    placeholderName: 'e.g. Broad-spectrum Insecticide, Glyphosate Herbicide, Mancozeb Fungicide',
  },
  {
    key: 'seeds_seedlings',
    label: 'Seeds & Planting Materials',
    icon: '🌽',
    suggestedUnits: ['can (50g)', 'can (100g)', 'pouch', 'pack (1kg)', 'seedling tray', 'piece'],
    placeholderName: 'e.g. Hybrid Yellow Corn Seeds, Diamante Max Tomato Seeds, Grafted Mango Seedlings',
  },
  {
    key: 'animal_feeds',
    label: 'Animal Feeds & Nutrition',
    icon: '🌾',
    suggestedUnits: ['sack (50kg)', 'bag (25kg)', 'kg', 'bundle', 'pack'],
    placeholderName: 'e.g. Chick Booster Crumble, Hog Grower Pellets, Cattle Concentrate, Rice Bran (Darak)',
  },
  {
    key: 'vet_medicines',
    label: 'Veterinary Medicine & Biologics',
    icon: '💉',
    suggestedUnits: ['bottle (100ml)', 'bottle (1L)', 'vial', 'sachet (10g)', 'sachet (100g)', 'box'],
    placeholderName: 'e.g. Vitstress Electrolytes + Vitamin B-Complex, Albendazole Dewormer, Amoxicillin Powder',
  },
  {
    key: 'irrigation',
    label: 'Irrigation & Water Systems',
    icon: '💧',
    suggestedUnits: ['roll (100m)', 'roll (500m)', 'piece', 'set', 'meter'],
    placeholderName: 'e.g. Drip Irrigation Tape Kit 16mm, PE Pipe, Micro Sprinkler Set, Automatic Hog Nipple Drinker',
  },
  {
    key: 'machinery_equipment',
    label: 'Farm Machinery & Power Equipment',
    icon: '⚙️',
    suggestedUnits: ['unit', 'set', 'piece'],
    placeholderName: 'e.g. 2-in-1 Rechargeable Battery Knapsack Sprayer 16L, 4-Stroke Brush Cutter, 3-inch Water Pump',
  },
  {
    key: 'nursery_greenhouse',
    label: 'Greenhouse, Mulch & Nursery',
    icon: '🏡',
    suggestedUnits: ['roll', 'piece (tray)', 'bundle (100pcs)', 'meter'],
    placeholderName: 'e.g. Silver-Black Plastic Mulch 1.2m x 400m, Black Shade Net 70%, 104-Hole Seedling Trays',
  },
  {
    key: 'packaging_storage',
    label: 'Packaging, Sacks & Crates',
    icon: '📦',
    suggestedUnits: ['piece', 'bundle (50pcs)', 'bundle (100pcs)', 'bale'],
    placeholderName: 'e.g. 50kg Woven Polypropylene Sacks, Heavy-Duty Plastic Harvest Crates (Kaing)',
  },
  {
    key: 'tools',
    label: 'Hand Tools & Implements',
    icon: '🔧',
    suggestedUnits: ['piece', 'set', 'pair'],
    placeholderName: 'e.g. Heavy-Duty Carabao Bolo, Digging Shovel, Pruning Shears, Garden Rake',
  },
  {
    key: 'ppe',
    label: 'Safety Gear & PPE',
    icon: '🥽',
    suggestedUnits: ['pair', 'piece', 'set', 'box'],
    placeholderName: 'e.g. Chemical Spraying Respirator Mask, Rubber Knee Boots, Heavy-Duty Nitrile Gloves',
  },
];

export type DeliveryMethod = 'delivery' | 'pickup';

export type SupplyOrderStatus =
  | 'pending'
  | 'quoted'
  | 'processing'
  | 'shipped_ready'
  | 'completed'
  | 'cancelled';

/**
 * PaymentMethod — mirrors backend models.PaymentMethod constants.
 * - cod: Cash on Delivery (no gateway required, supplier confirms on delivery)
 * - gcash: GCash e-wallet via PayMongo (future)
 * - maya: Maya (PayMaya) e-wallet via PayMongo (future)
 * - bank_transfer: InstaPay / PESONet via Dragonpay (future)
 * - card: Visa / Mastercard via PayMongo (future)
 */
export type PaymentMethod = 'cod' | 'gcash' | 'maya' | 'bank_transfer' | 'card';

/**
 * PaymentStatus — mirrors backend models.PaymentStatus constants.
 * - pending_payment: default for all new orders; COD awaits delivery confirmation
 * - paid: confirmed paid (COD: by supplier; online: by gateway webhook)
 * - failed: online payment attempt was declined
 * - refunded: payment was reversed
 */
export type PaymentStatus =
  | 'pending_payment'
  | 'payment_pending_verification'
  | 'paid'
  | 'failed'
  | 'refunded';

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
  location?: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplyProductPayload {
  name: string;
  category: SupplyCategory;
  description: string;
  price: number;
  stockQuantity: number;
  unit: string;
  location?: string;
  images?: string[];
}

export interface SupplyOrderItem {
  productId: string;
  productName: string;
  productImage?: string;
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
  subtotal?: number;
  shippingFee?: number;
  totalAmount: number;
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: string;
  status: SupplyOrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentNote?: string;
  paymentRefNo?: string;
  paymentProofUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplyOrderPayload {
  items: { productId: string; quantity: number }[];
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: string;
  /** Defaults to 'cod' on the backend if omitted. */
  paymentMethod: PaymentMethod;
  paymentRefNo?: string;
  paymentProofUrl?: string;
}

export interface UpdatePaymentStatusPayload {
  paymentStatus: PaymentStatus;
  paymentNote?: string;
}
