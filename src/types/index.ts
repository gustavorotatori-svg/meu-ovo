export interface Restaurant {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  pixKey: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  neighborhood: string;
  logo: string;
  coverImage: string;
  primaryColor: string;
  isOpen: boolean;
  cuisineType: string;
  priceRange: 'low' | 'medium' | 'high';
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  dineInEnabled: boolean;
  estimatedTime: number;
  deliveryFee: number;
  minimumOrder: number;
  rating: number;
  reviewCount: number;
  description: string;
  createdAt: string;
  deliverySettings?: {
    fee: number;
    estimatedTime: string;
    minOrder: number;
    feeByNeighborhood?: { neighborhood: string; fee: number }[];
  };
  orderSettings?: {
    autoAccept: boolean;
    soundAlert: boolean;
    thermalPrinterEnabled: boolean;
    whatsappNotificationsEnabled?: boolean;
    whatsappWebhookUrl?: string;
  };
  loyaltySettings?: {
    enabled: boolean;
    pointsPerReal: number;
    pointsPerOrder?: number;
    accumulationType: 'amount' | 'order';
    redemptionRules: {
      id: string;
      type: 'discount_percent' | 'free_product';
      value: string | number; // percentage or productId
      pointsRequired: number;
      description: string;
    }[];
  };
}

export interface Category {
  id: string;
  restaurantId: string;
  name: string;
  order: number;
}

export interface Additional {
  id: string;
  name: string;
  price: number;
}

export interface AdditionalGroup {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  items: Additional[];
}

export interface Product {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  imageUrl: string;
  isAvailable: boolean;
  isFeatured: boolean;
  bestSeller: boolean;
  onPromotion: boolean;
  promotionPrice?: number;
  additionalGroups: AdditionalGroup[];
  createdAt: string;
  isActive: boolean;
  order: number;
  ingredients?: string;
  allergens?: string;
  optionGroups?: any[];
  estimatedPrepTime?: number;
  notes?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedAdditionals: { groupId: string; additionalId: string; name: string; price: number }[];
  observations: string;
}

export interface Order {
  id: string;
  restaurantId: string;
  userId?: string;
  customerName: string;
  customerPhone: string;
  type: 'dine-in' | 'delivery' | 'pickup';
  tableNumber?: string;
  deliveryAddress?: string;
  paymentMethod: 'pix' | 'cash' | 'card-on-delivery' | 'on-site';
  changeFor?: number;
  status: 'received' | 'preparing' | 'ready' | 'out-for-delivery' | 'finished' | 'cancelled';
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  donationAmount: number;
  rewardDiscount?: number;
  couponCode?: string;
  couponDiscount?: number;
  discountAmount?: number; // legacy/fallback
  total: number;
  observations?: string;
  problemReport?: {
    type: 'missing_item' | 'wrong_item' | 'bad_condition' | 'other';
    description: string;
    photoUrl?: string;
    status: 'pending' | 'resolved';
    createdAt: string;
  };
  createdAt: string;
  origin: 'direct-link' | 'marketplace' | 'qr-code' | 'whatsapp' | 'instagram';
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  additionals: { name: string; price: number }[];
  observations?: string;
}

export interface Table {
  id: string;
  restaurantId: string;
  number: string;
  qrCodeUrl: string;
  active: boolean;
  currentOrderId?: string;
}

export interface CashierSession {
  id: string;
  restaurantId: string;
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  openingAmount: number;
  closingAmount?: number;
  totalSales: number;
  status: 'open' | 'closed';
  withdrawals: { amount: number; reason: string; time: string }[];
  additions: { amount: number; reason: string; time: string }[];
}

export interface FiscalReceipt {
  id: string;
  orderId: string;
  nfeNumber?: string;
  status: 'pending' | 'success' | 'failed';
  xmlUrl?: string;
  createdAt: string;
}

export interface DeliverySettings {
  restaurantId: string;
  enabled: boolean;
  radiusKm: number;
  fee: number;
  estimatedTime: number;
  minimumOrder: number;
  observation: string;
  feeByNeighborhood: { neighborhood: string; fee: number }[];
}

export interface Donation {
  id: string;
  orderId: string;
  amount: number;
  city: string;
  socialProject: string;
  status: 'pending' | 'confirmed' | 'transferred';
  createdAt: string;
}

export interface SupplierAd {
  id: string;
  companyName: string;
  category: string;
  title: string;
  description: string;
  targetRegion: string;
  active: boolean;
  logoUrl: string;
}

export interface Coupon {
  id: string;
  restaurantId: string;
  code: string;
  type: 'fixed' | 'percent';
  value: number;
  minOrderValue: number;
  expiryDate: string;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface LoyaltyProfile {
  id: string;
  restaurantId: string;
  customerPhone: string;
  customerName: string;
  pointsBalance: number;
  history: {
    type: 'earn' | 'redeem';
    points: number;
    description: string;
    orderId?: string;
    createdAt: string;
  }[];
}
