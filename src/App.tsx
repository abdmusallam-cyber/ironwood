/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { createContext, useContext, useState, useEffect } from "react";
import { getRedirectResult, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, getDocFromServer } from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import { ensureGoogleUserProfileFirestore } from "./lib/ensureGoogleUserProfile";
import { UserProfile } from "./types";
import "./lib/i18n";
import { I18nextProvider } from "react-i18next";
import i18n from "./lib/i18n";

// Pages
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Portfolio from "./pages/Portfolio";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import NewArrivals from "./pages/NewArrivals";
import Profile from "./pages/Profile";

// Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { CartProvider } from "./context/CartContext";
import { Toaster } from "sonner";

interface AuthContextType {
  user: UserProfile | null;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, setUser: () => {}, loading: true });
export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error) {
        if (error instanceof Error && error.message.includes("the client is offline")) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    void testConnection();

    void (async () => {
      try {
        const redirectResult = await getRedirectResult(auth);
        if (cancelled) return;
        if (redirectResult?.user) {
          await ensureGoogleUserProfileFirestore(redirectResult.user);
        }
      } catch (e) {
        console.warn("getRedirectResult:", e);
      }
      if (cancelled) return;

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          const isAdminEmail = firebaseUser.email?.toLowerCase() === "abd.musallam@gmail.com";

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              id: firebaseUser.uid,
              ...userData,
              role: isAdminEmail ? "admin" : (userData.role || "user")
            } as UserProfile);
          } else {
            setUser({
              id: firebaseUser.uid,
              displayName: firebaseUser.displayName || firebaseUser.phoneNumber || "",
              email: firebaseUser.email || "",
              phoneNumber: firebaseUser.phoneNumber || "",
              role: isAdminEmail ? "admin" : "user",
              createdAt: new Date(),
            } as UserProfile);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-iron">
        <div className="text-brand-gold animate-pulse font-serif text-3xl">IRON WOOD</div>
      </div>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <AuthContext.Provider value={{ user, setUser, loading }}>
        <CartProvider>
          <Toaster position="bottom-right" richColors theme="dark" expand={true} />
          <Router>
            <div className="flex flex-col min-h-screen">
              <Navbar user={user} />
              <main className="flex-grow">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/new-arrivals" element={<NewArrivals />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/product/:id" element={<ProductDetails />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
                  <Route 
                    path="/checkout" 
                    element={user ? <Checkout /> : <Navigate to="/login" />} 
                  />
                  <Route 
                    path="/admin/*" 
                    element={user?.role === "admin" ? <AdminDashboard /> : <Navigate to="/" />} 
                  />
                </Routes>
              </main>
              <Footer />
            </div>
          </Router>
        </CartProvider>
      </AuthContext.Provider>
    </I18nextProvider>
  );
}
