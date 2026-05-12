import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Product, OperationType } from "../types";
import { handleFirestoreError, cn } from "../lib/utils";
import { Search, Grid, List as ListIcon, ShoppingCart, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const { addToCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        let q = collection(db, "products");
        const snap = await getDocs(query(q, orderBy("createdAt", "desc")));
        setProducts(snap.docs.map(d => ({ ...d.data(), id: d.id } as Product)));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "products");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesCategory = filter === "all" || p.category === filter || (filter === "new" && p.isNew);
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-brand-iron min-h-screen pb-20" dir="rtl">
      {/* Header */}
      <section className="bg-brand-surface py-24 px-4 text-center border-b border-brand-border">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <h1 className="font-serif text-5xl md:text-7xl text-brand-text mb-6 font-medium">مجموعتنا الحصرية</h1>
          <p className="text-brand-gold uppercase tracking-[0.4em] text-[10px] font-bold italic">خشب طبيعي . حديد صلب . فخامة سعودية</p>
        </motion.div>
      </section>

      {/* Filters & Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 border-b border-brand-border pb-12 mb-12">
          <div className="flex flex-wrap items-center gap-4">
            {["all", "new", "wood", "metal", "combined"].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  "px-8 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border",
                  filter === cat 
                    ? "bg-brand-gold text-brand-iron border-brand-gold" 
                    : "bg-transparent text-brand-muted border-brand-border hover:border-brand-gold"
                )}
              >
                {cat === "all" ? "الكل" : cat === "new" ? "وصل حديثاً" : cat === "wood" ? "خشبي" : cat === "metal" ? "معدني" : "مشترك"}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-96">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
            <input 
              type="text" 
              placeholder="ابحث عن قطعة أثاث..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border py-4 pr-12 pl-4 text-sm text-brand-text focus:outline-none focus:border-brand-gold transition-colors"
            />
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse space-y-6">
                <div className="aspect-[4/5] bg-brand-surface border border-brand-border" />
                <div className="h-4 bg-brand-surface w-3/4" />
                <div className="h-4 bg-brand-surface w-1/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {filteredProducts.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group bg-brand-surface p-4 border border-brand-border"
              >
                <Link to={`/product/${p.id}`} className="block">
                  <div className="relative aspect-[4/5] overflow-hidden bg-brand-iron mb-6 flex items-center justify-center">
                    {p.imageUrl ? (
                      <img 
                        src={p.imageUrl} 
                        alt={p.title}
                        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-brand-surface" />
                    )}
                    <div className="absolute inset-0 bg-brand-iron/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                       {p.isNew && (
                         <div className="bg-brand-gold text-brand-iron px-3 py-1 text-[8px] uppercase font-bold tracking-widest leading-none shadow-xl">
                           New Arrival
                         </div>
                       )}
                    </div>
                    {p.stock < 1 ? (
                      <div className="absolute top-4 right-4 bg-red-900 text-white px-3 py-1 text-[10px] uppercase font-bold tracking-widest leading-none">
                        نفذت الكمية
                      </div>
                    ) : (
                      p.stock <= 2 && (
                        <div className="absolute top-4 right-4 bg-brand-gold text-brand-iron px-3 py-1 text-[10px] uppercase font-bold tracking-widest leading-none">
                          كمية محدودة
                        </div>
                      )
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-serif text-xl group-hover:text-brand-gold transition-colors">{p.title}</h3>
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-brand-muted italic">{p.category === "wood" ? "Natural Walnut" : "Industrial Steel"}</p>
                    <div className="flex items-center gap-4 mt-2">
                      {p.discountPrice ? (
                        <>
                          <p className="text-brand-gold font-serif text-2xl">{p.discountPrice} ج.م</p>
                          <p className="text-brand-muted font-serif text-sm line-through opacity-50">{p.price} ج.م</p>
                        </>
                      ) : (
                        <p className="text-brand-gold font-serif text-2xl">{p.price} ج.م</p>
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
                  className="mt-6 w-full bg-brand-iron text-brand-text py-5 text-[10px] font-bold uppercase tracking-widest border border-brand-border hover:bg-brand-gold hover:text-brand-iron hover:border-brand-gold transition-all flex items-center justify-center space-x-3 space-x-reverse"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>إضافة للسلة</span>
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && filteredProducts.length === 0 && (
          <div className="py-32 text-center">
            <p className="text-gray-400 font-serif text-2xl italic">لم نجد أي منتجات تطابق بحثك</p>
          </div>
        )}
      </div>

      {/* Live Chat Widget */}
      <div className="fixed bottom-8 left-8 z-50">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="bg-brand-surface w-80 h-[500px] shadow-2xl border border-brand-border flex flex-col mb-4 overflow-hidden"
            >
              <div className="bg-brand-iron p-6 text-brand-text flex justify-between items-center border-b border-brand-border">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold">دعم العملاء</span>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="text-brand-muted hover:text-brand-gold transition-colors">✕</button>
              </div>
              <div className="flex-grow p-6 flex flex-col justify-center items-center text-center space-y-6">
                <div className="w-16 h-16 rounded-full border border-brand-border flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-brand-gold opacity-40" />
                </div>
                <p className="text-xs text-brand-muted font-serif italic leading-relaxed">
                  مرحباً بك في IRON WOOD. <br /> خبراؤنا متواجدون لمساعدتك في اختيار قطع الأثاث المثالية.
                </p>
              </div>
              <div className="p-4 border-t border-brand-border flex bg-brand-iron">
                <input 
                  type="text" 
                  placeholder="ابحث عنا..." 
                  className="flex-grow bg-transparent text-sm p-3 focus:outline-none text-brand-text"
                />
                <button className="text-brand-gold px-4 font-bold text-xs uppercase tracking-widest">إرسال</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="bg-brand-gold w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-brand-iron hover:scale-110 hover:bg-white transition-all active:scale-95"
        >
          <MessageCircle className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
}
