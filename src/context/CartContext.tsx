import React, { createContext, useContext, useState, useEffect } from "react";
import { CartItem } from "../types";
import { toast } from "sonner";

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, variantName?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantName?: string) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === item.productId && i.selectedVariant?.name === item.selectedVariant?.name);
      if (existing) {
        return prev.map((i) =>
          (i.productId === item.productId && i.selectedVariant?.name === item.selectedVariant?.name)
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      return [...prev, item];
    });
    
    toast.success("تم إضافة المنتج إلى السلة بنجاح", {
      description: item.title,
      duration: 3000,
    });
  };

  const removeFromCart = (productId: string, variantName?: string) => {
    setCart((prev) => prev.filter((i) => !(i.productId === productId && i.selectedVariant?.name === variantName)));
    toast.info("تمت إزالة المنتج من السلة");
  };

  const updateQuantity = (productId: string, quantity: number, variantName?: string) => {
    setCart((prev) =>
      prev.map((i) => (i.productId === productId && i.selectedVariant?.name === variantName ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, total }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};
