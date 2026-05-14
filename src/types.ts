export interface ProductVariant {
  name: string;
  textureUrl?: string;
  colorHex?: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  discountPrice?: number;
  stock: number;
  category: "wood" | "metal" | "combined";
  imageUrl: string;
  rating: number;
  isNew?: boolean;
  availableColors?: string[]; // Keep for backward compatibility if needed, but we'll use variants
  variants?: ProductVariant[];
  createdAt: any;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  shippingCost: number;
  status: "pending" | "confirmed" | "processing" | "paid" | "shipped" | "delivered" | "vodafone_cash" | "instapay" | "cod";
  shippingInfo: ShippingInfo;
  createdAt: any;
}

export interface CartItem {
  productId: string;
  title: string;
  price: number;
  originalPrice: number;
  quantity: number;
  imageUrl: string;
  selectedColor?: string;
  selectedVariant?: ProductVariant;
}

export interface ShippingInfo {
  name: string;
  address: string;
  governorate: string;
  city: string;
  phone: string;
  location?: { lat: number; lng: number };
  paymentMethod: "cod" | "card" | "transfer" | "vodafone_cash" | "instapay";
}

export interface Testimonial {
  id: string;
  name: string;
  quote: string;
  rating: number;
  avatarUrl: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
}

export interface UserProfile {
  id: string;
  username?: string;
  displayName: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  governorate?: string;
  city?: string;
  role: "user" | "admin";
  createdAt: any;
}

export interface ShippingRate {
  governorate: string;
  rate: number;
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}
