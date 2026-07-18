export interface Restaurant {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
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
  responsible?: string;
  hours?: string;
  createdAt: string;
  pixKey?: string;
  historyText?: string;
  foundedYear?: number;
  familyRun?: boolean;
  isIndependent?: boolean;
  founderName?: string;
  founderImage?: string;
  deliverySettings?: {
    fee: number;
    estimatedTime: string;
    minOrder: number;
    feeByNeighborhood?: { neighborhood: string; fee: number }[];
    radiusKm?: number;
    observation?: string;
  };
  orderSettings?: {
    autoAccept: boolean;
    soundAlert: boolean;
    thermalPrinterEnabled: boolean;
    whatsappNotificationsEnabled?: boolean;
    whatsappWebhookUrl?: string;
    blockProblematicCustomers?: boolean;
    minAcceptableRating?: number;
  };
  paymentSettings?: {
    acceptCreditCard: boolean;
    creditCardLink: string;
    acceptDebit: boolean;
    debitLink: string;
    acceptVoucher: boolean;
    voucherLink: string;
  };
  fiscalSettings?: {
    nfeEnabled: boolean;
    nfeCnpj: string;
    nfeInscricaoEstadual: string;
    nfeCertificateName: string;
    nfePassword?: string;
    nfeEnvironment: 'homologacao' | 'producao';
    nfeCscId: string;
    nfeCscToken: string;
    satEnabled: boolean;
    satSerialNumber: string;
    regimeTributario?: 'simples' | 'regime_normal' | 'mei';
    nfeSerie?: string;
    nfeNumber?: string;
    satActivationCode?: string;
    satAssinaturaAC?: string;
  };
  latitude?: number;
  longitude?: number;
  geohash?: string;
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

export type AllergenKey =
  | 'gluten'
  | 'lactose'
  | 'milk'
  | 'eggs'
  | 'peanuts'
  | 'tree_nuts'
  | 'soy'
  | 'crustaceans'
  | 'fish'
  | 'sesame'
  | 'sulfites'
  | 'celery'
  | 'mustard'
  | 'lupin';

export interface AllergenInfo {
  key: AllergenKey;
  label: string;
  icon: string;
}

export type StorageType = 'refrigerated' | 'frozen' | 'dry' | 'ambient';

export interface LabelInfo {
  shelfLifeDays: number;
  storageType: StorageType;
  storageInstructions: string;
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
  selectedAllergens?: AllergenKey[];
  labelInfo?: LabelInfo;
  optionGroups?: any[];
  estimatedPrepTime?: number;
  notes?: string;
  stock?: number;
  minStockAlert?: number;
}

export interface LabelRecord {
  id: string;
  restaurantId: string;
  productId: string;
  productName: string;
  batchNumber: string;
  prepDate: string;
  expiryDate: string;
  storageType: StorageType;
  storageInstructions: string;
  allergens: AllergenKey[];
  operatorName: string;
  printedAt: string;
  restaurantName?: string;
  restaurantLogo?: string;
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
  tableId?: string;
  deliveryAddress?: string;
  paymentMethod: 'pix' | 'cash' | 'card-on-delivery' | 'on-site' | 'credit' | 'debit' | 'voucher';
  changeFor?: number;
  status: 'received' | 'accepted' | 'preparing' | 'ready' | 'out-for-delivery' | 'finished' | 'cancelled';
  paymentStatus?: 'pending' | 'paid' | 'failed';
  acceptedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  donationAmount: number;
  donationMethod?: 'checkout' | 'post-payment';
  rewardDiscount?: number;
  couponCode?: string;
  couponDiscount?: number;
  discountAmount?: number; // legacy/fallback
  total: number;
  observations?: string;
  scheduledAt?: string;
  tip?: number;
  tipPercent?: number;
  meuOvoCaixinha?: number;
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
  status?: 'free' | 'occupied';
  capacity?: number;
  lastCustomerCount?: number;
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
  targetAudience: 'all' | 'new' | 'returning' | 'by_rating' | 'by_orders';
  targetMinRating?: number;
  targetMaxRating?: number;
  targetMinOrders?: number;
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

export interface CustomerRating {
  id: string;
  restaurantId: string;
  orderId?: string;
  customerPhone: string;
  customerName: string;
  rating: number; // 0 to 5
  comment?: string;
  tags?: string[];
  createdAt: string;
}

export interface FlashDeal {
  id: string;
  restaurantId: string;
  productId: string;
  productName: string;
  discountPercentage: number;
  originalPrice: number;
  dealPrice: number;
  startsAt: string;
  endsAt: string;
  maxUnits: number;
  soldUnits: number;
  isActive: boolean;
  createdAt: string;
}

export interface SavedAddress {
  id: string;
  userId: string;
  label: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  isDefault?: boolean;
  createdAt: string;
}
