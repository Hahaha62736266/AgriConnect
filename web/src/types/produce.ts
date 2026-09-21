export type ListingStatus = 'available' | 'sold' | 'reserved';
export type TransactionStatus = 'pending' | 'quoted' | 'confirmed' | 'completed' | 'cancelled';
export type BuyerQuoteAction = 'approve' | 'switch_pickup' | 'reject';

export interface ProduceCategoryConfig {
  id: string;
  name: string;
  label: string;
  icon: string;
  suggestedUnits: string[];
  samplePlaceholder: string;
}

export const PRODUCE_CATEGORIES: ProduceCategoryConfig[] = [
  {
    id: 'vegetables',
    name: 'Vegetables',
    label: 'Vegetables (Gulay)',
    icon: '🥬',
    suggestedUnits: ['kg', 'sack (50kg)', 'crate / kaing', 'bundle / tali', 'box'],
    samplePlaceholder: 'e.g. Red Tomato (Kamatis), Eggplant (Talong), Cabbage',
  },
  {
    id: 'fruits',
    name: 'Fruits',
    label: 'Fruits (Prutas)',
    icon: '🍌',
    suggestedUnits: ['kg', 'crate / kaing', 'box', 'piece', 'ton (MT)'],
    samplePlaceholder: 'e.g. Carabao Mango (Mangga), Lakatan Banana, Papaya',
  },
  {
    id: 'grains',
    name: 'Grains & Cereals',
    label: 'Grains & Cereals (Palay / Mais)',
    icon: '🌾',
    suggestedUnits: ['kg', 'sack (50kg)', 'cavan', 'ton (MT)'],
    samplePlaceholder: 'e.g. Yellow Corn (Mais), Dry Palay (Paddy Rice), Milled Rice',
  },
  {
    id: 'root_crops',
    name: 'Root Crops',
    label: 'Root Crops & Tubers (Kamote / Cassava)',
    icon: '🥔',
    suggestedUnits: ['kg', 'sack (50kg)', 'crate', 'ton (MT)'],
    samplePlaceholder: 'e.g. Fresh Cassava, Sweet Potato (Camote), Ube, Taro (Gabi)',
  },
  {
    id: 'livestock',
    name: 'Livestock & Poultry',
    label: 'Livestock & Poultry (Baka, Baboy, Manok, Kambing)',
    icon: '🐓',
    suggestedUnits: ['head', 'live weight kg', 'dressed kg', 'pair', 'tray (30 eggs)', 'piece'],
    samplePlaceholder: 'e.g. Free-range Native Chicken, Boer Goat (Kambing), Fattened Swine (Baboy), Cattle',
  },
  {
    id: 'fisheries',
    name: 'Fisheries & Aquaculture',
    label: 'Fisheries & Aquaculture (Isda / Hipon)',
    icon: '🐟',
    suggestedUnits: ['kg', 'styro box (banyera)', 'bucket', 'piece'],
    samplePlaceholder: 'e.g. Fresh Tilapia, Bangus (Milkfish), Catfish (Hito), Tiger Prawn',
  },
  {
    id: 'spices',
    name: 'Spices & Herbs',
    label: 'Spices & Herbs (Pampalasa)',
    icon: '🌶️',
    suggestedUnits: ['kg', 'bundle / tali', 'sack', 'pack'],
    samplePlaceholder: 'e.g. Red Onion (Sibuyas), Native Garlic (Bawang), Ginger (Luya), Siling Labuyo',
  },
  {
    id: 'processed',
    name: 'Agri-Processed & By-products',
    label: 'Agri-Processed & By-products (Kape, Asukal, Honey)',
    icon: '🍯',
    suggestedUnits: ['kg', 'bottle', 'jar', 'pack', 'liter'],
    samplePlaceholder: 'e.g. Pure Honey, Tablea Cacao, Robusta Coffee Beans, Muscovado Sugar',
  },
];

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

export interface CreateProduceListingPayload {
  cropName: string;
  category: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  harvestDate: string;
  location: string;
  photos?: string[];
  description?: string;
  status?: ListingStatus;
}

export interface ProduceTransaction {
  id: string;
  listingId: string;
  cropName: string;
  cropPhoto?: string;
  buyerId: string;
  buyerName: string;
  farmerId: string;
  farmerName: string;
  quantity: number;
  unitPrice: number;
  subtotal?: number;
  shippingFee?: number;
  totalPrice: number;
  deliveryMethod?: string;
  deliveryAddress?: string;
  contactMessage?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentRefNo?: string;
  paymentProofUrl?: string;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProduceTransactionPayload {
  listingId: string;
  quantity: number;
  contactMessage?: string;
  deliveryMethod?: string;
  deliveryAddress?: string;
  paymentMethod?: string;
}
