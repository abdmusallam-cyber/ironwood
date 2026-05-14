import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, Menu, X, LogOut, Shield, Languages } from "lucide-react";
import { useState, useEffect } from "react";
import { auth } from "../lib/firebase";
import { getSiteSettings } from "../services/siteContent";
import { UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";

interface NavbarProps {
  user: UserProfile | null;
}

export default function Navbar({ user }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [navLinks, setNavLinks] = useState<{ name: string; path: string }[]>([]);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getSiteSettings();
        if (settings?.navigationLinks?.length) {
          setNavLinks(settings.navigationLinks);
        }
      } catch (error) {
        console.error("Failed to load navbar settings:", error);
      }
    };
    loadSettings();
  }, []);

  const defaultNavLinks = [
    { name: t('nav.home'), path: "/" },
    { name: t('nav.newArrivals'), path: "/new-arrivals" },
    { name: t('nav.products'), path: "/products" },
    { name: t('nav.portfolio'), path: "/portfolio" },
  ];

  const menuLinks = navLinks.length ? navLinks : defaultNavLinks;

  return (
    <nav className="bg-brand-surface text-brand-text sticky top-0 z-50 border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center">
            <Link to="/" className="font-serif text-2xl font-bold tracking-widest text-brand-gold">
              IRON WOOD
            </Link>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-10">
            {menuLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="text-sm uppercase tracking-[0.1em] hover:text-brand-gold transition-colors font-medium opacity-80 hover:opacity-100 px-2"
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-10">
            {user?.role === "admin" && (
              <Link to="/admin" className="hover:text-brand-gold transition-colors opacity-80 hover:opacity-100">
                <Shield className="w-5 h-5" />
              </Link>
            )}
            <button
              onClick={toggleLanguage}
              className="hover:text-brand-gold transition-colors opacity-80 hover:opacity-100"
              title={i18n.language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
            >
              <Languages className="w-5 h-5" />
            </button>
            <Link to="/cart" className="hover:text-brand-gold transition-colors relative opacity-80 hover:opacity-100">
              <ShoppingCart className="w-5 h-5" />
            </Link>
            {user ? (
              <div className="flex items-center gap-6">
                <Link to="/profile" className="flex items-center gap-3 hover:text-brand-gold transition-colors opacity-80 hover:opacity-100">
                  <span className="text-[10px] font-bold uppercase tracking-widest">{user.displayName}</span>
                  <User className="w-5 h-5 text-brand-gold" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="hover:text-brand-gold transition-colors opacity-80 hover:opacity-100"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="hover:text-brand-gold transition-colors opacity-80 hover:opacity-100">
                <User className="w-5 h-5" />
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white hover:text-brand-gold transition-colors"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-brand-surface border-t border-brand-border"
          >
            <div className="px-4 pt-2 pb-6 space-y-4">
              {menuLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className="block text-lg font-medium hover:text-brand-gold transition-colors opacity-80"
                >
                  {link.name}
                </Link>
              ))}
              <div className="pt-4 border-t border-brand-border flex space-x-6 space-x-reverse">
                <Link to="/cart" onClick={() => setIsOpen(false)}>
                  <ShoppingCart className="w-6 h-6" />
                </Link>
                {user?.role === "admin" && (
                  <Link to="/admin" onClick={() => setIsOpen(false)}>
                    <Shield className="w-6 h-6 text-brand-gold" />
                  </Link>
                )}
                {user ? (
                  <>
                    <Link to="/profile" onClick={() => setIsOpen(false)}>
                      <User className="w-6 h-6 text-brand-gold" />
                    </Link>
                    <button onClick={handleLogout}>
                      <LogOut className="w-6 h-6" />
                    </button>
                  </>
                ) : (
                  <Link to="/login" onClick={() => setIsOpen(false)}>
                    <User className="w-6 h-6" />
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
