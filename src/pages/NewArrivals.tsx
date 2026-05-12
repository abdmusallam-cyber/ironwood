import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Product, OperationType } from "../types";
import { handleFirestoreError, cn } from "../lib/utils";
import { Search, ShoppingCart, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function NewArrivals() {
  const [products, setProducts] = useState<Product[]>([]);
  const { addToCart } = useCart();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNewArrivals = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, "products"),
          where("isNew", "==", true),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        setProducts(snap.docs.map(d => ({ ...d.data(), id: d.id } as Product)));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "products/new-arrivals");
      } finally {
        setLoading(false);
      }
    };
    fetchNewArrivals();
  }, []);

  return (
    <div className="bg-brand-iron min-h-screen pb-20" dir="rtl">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden border-b border-brand-border">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1581428982868-e410dd047a90?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-30 scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-iron via-brand-iron/60 to-transparent" />
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative text-center px-4"
        >
          <span className="text-brand-gold uppercase tracking-[0.6em] text-[10px] font-bold block mb-4 italic">Latest Collection 2026</span>
          <h1 className="font-serif text-5xl md:text-8xl text-brand-text mb-8 italic tracking-tighter">وُصِل حديثاً</h1>
          <p className="text-brand-muted max-w-xl mx-auto text-sm md:text-lg leading-loose font-serif italic mb-10">استكشف أحدث ابتكاراتنا في عالم الأثاث الفاخر، حيث يلتقي التجديد بالأصالة في كل قطعة.</p>
        </motion.div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-6">
                <div className="aspect-[4/5] bg-brand-surface border border-brand-border" />
                <div className="h-4 bg-brand-surface w-3/4" />
                <div className="h-4 bg-brand-surface w-1/4" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {products.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="group bg-brand-surface p-4 border border-brand-border hover:border-brand-gold transition-all duration-500"
                >
                  <Link to={`/product/${p.id}`} className="block">
                    <div className="relative aspect-[4/5] overflow-hidden bg-brand-iron mb-6">
                      <img 
                        src={p.imageUrl} 
                        alt={p.title}
                        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                      />
                      <div className="absolute top-4 left-4">
                         <div className="bg-brand-gold text-brand-iron px-4 py-1 text-[10px] uppercase font-bold tracking-widest shadow-2xl">New</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                       <h3 className="font-serif text-2xl mb-1 group-hover:text-brand-gold transition-colors italic">{p.title}</h3>
                       <div className="flex items-center gap-4">
                          {p.discountPrice ? (
                            <>
                              <span className="text-brand-gold font-serif text-2xl font-bold">{p.discountPrice} ج.م</span>
                              <span className="text-brand-muted font-serif text-sm line-through opacity-50">{p.price} ج.م</span>
                            </>
                          ) : (
                            <span className="text-brand-gold font-serif text-2xl font-bold">{p.price} ج.م</span>
                          )}
                       </div>
                    </div>
                  </Link>
                  <button 
                    onClick={() => addToCart({
                      productId: p.id,
                      title: p.title,
                      price: p.discountPrice || p.price,
                      originalPrice: p.price,
                      imageUrl: p.imageUrl,
                      quantity: 1
                    })}
                    className="mt-8 w-full bg-brand-iron text-brand-text py-5 text-[10px] font-bold uppercase tracking-widest border border-brand-border hover:bg-brand-gold hover:text-brand-iron transition-all flex items-center justify-center gap-4"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>إضافة للسلة</span>
                  </button>
                </motion.div>
              ))}
            </div>

            {products.length === 0 && (
              <div className="text-center py-32 border border-dashed border-brand-border bg-brand-surface/50">
                 <p className="font-serif text-3xl text-brand-muted italic mb-6">لا توجد منتجات جديدة حالياً</p>
                 <Link to="/products" className="text-brand-gold uppercase tracking-[0.3em] text-[10px] font-bold flex items-center justify-center gap-2 hover:gap-4 transition-all">
                    تصفح جميع المنتجات <ArrowRight className="w-4 h-4 rotate-180" />
                 </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
