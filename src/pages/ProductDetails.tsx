import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Product, OperationType, ProductVariant } from "../types";
import { handleFirestoreError, cn } from "../lib/utils";
import { ShoppingCart, Heart, Shield, Truck, RotateCcw, Star, ArrowRight, Percent } from "lucide-react";
import { motion } from "motion/react";
import { useCart } from "../context/CartContext";

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const snap = await getDoc(doc(db, "products", id));
        if (snap.exists()) {
          const data = snap.data() as Product;
          setProduct({ id: snap.id, ...data });
          if (data.variants && data.variants.length > 0) {
            setSelectedVariant(data.variants[0]);
          } else if (data.availableColors && data.availableColors.length > 0) {
             // Fallback for legacy data
             setSelectedVariant({ name: "اللون", colorHex: data.availableColors[0] });
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `products/${id}`);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) return <div className="p-20 text-center animate-pulse">جاري تحميل المنتج...</div>;
  if (!product) return <div className="p-20 text-center">المنتج غير موجود</div>;

  const handleAddToCart = () => {
    if (!product) return;
    addToCart({
      productId: product.id,
      title: product.title,
      price: product.discountPrice || product.price,
      originalPrice: product.price,
      imageUrl: product.imageUrl,
      quantity: quantity,
      selectedVariant: selectedVariant || undefined
    });
  };

  return (
    <div className="bg-brand-iron min-h-screen py-20 px-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <Link to="/products" className="inline-flex items-center space-x-3 space-x-reverse text-brand-muted hover:text-brand-gold transition-all mb-16 uppercase tracking-[0.2em] text-[10px] font-bold italic group">
          <ArrowRight className="w-4 h-4 rotate-180 group-hover:translate-x-[4px] transition-transform" />
          <span>العودة إلى المجموعة الحصرية</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
          {/* Images */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="aspect-[4/5] bg-brand-surface border border-brand-border overflow-hidden shadow-2xl p-4">
              <img 
                src={product.imageUrl} 
                alt={product.title}
                className="w-full h-full object-cover transition-all duration-1000 hover:scale-105"
              />
            </div>
          </motion.div>

          {/* Info */}
          <div className="space-y-12">
            <header className="space-y-6">
              <div className="flex items-center space-x-6 space-x-reverse">
                <span className="bg-brand-gold/10 text-brand-gold px-5 py-1.5 text-[10px] font-bold uppercase tracking-[0.3em] italic border border-brand-gold/20">
                  {product.category === "wood" ? "Natural Walnut" : "Industrial Steel"}
                </span>
                <div className="flex items-center text-brand-gold">
                   <Star className="w-4 h-4 fill-current" />
                   <span className="mr-2 text-brand-text font-bold text-sm tracking-wider">{product.rating || 5.0}</span>
                </div>
              </div>
              <h1 className="font-serif text-5xl md:text-7xl font-bold leading-[1.1] text-brand-text">{product.title}</h1>
              <div className="flex items-baseline gap-6">
                {product.discountPrice ? (
                  <>
                    <p className="text-4xl font-serif text-brand-gold">{product.discountPrice} ج.م</p>
                    <p className="text-2xl font-serif text-brand-muted line-through opacity-50">{product.price} ج.م</p>
                    <span className="bg-red-900/20 text-red-500 px-3 py-1 text-[10px] font-bold border border-red-900/30 flex items-center gap-2">
                       <Percent className="w-3 h-3" />
                       خصم {Math.round((1 - product.discountPrice / product.price) * 100)}%
                    </span>
                  </>
                ) : (
                  <p className="text-4xl font-serif text-brand-gold">{product.price} ج.م</p>
                )}
              </div>
            </header>

            <div className="prose prose-invert max-w-none">
              <p className="text-brand-muted text-xl leading-relaxed font-serif italic italic opacity-80">
                {product.description || "قطع أثاث مصنوعة يدوياً تعكس مهارة الحرفية السعودية، نجمع بين متانة الحديد ودفء الخشب الطبيعي."}
              </p>
            </div>

            {((product.variants && product.variants.length > 0) || (product.availableColors && product.availableColors.length > 0)) && (
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                   <label className="text-[10px] uppercase tracking-[0.2em] text-brand-gold font-bold italic">اختر اللمسة الفنية (Texture / Finish):</label>
                   {selectedVariant && (
                     <span className="text-xs text-brand-muted italic font-serif">{selectedVariant.name}</span>
                   )}
                </div>
                <div className="flex flex-wrap gap-5">
                  {/* Handle new Variants */}
                  {product.variants?.map((variant) => (
                    <button
                      key={variant.name}
                      onClick={() => setSelectedVariant(variant)}
                      className={cn(
                        "w-14 h-14 rounded-full border-2 transition-all p-1 flex-shrink-0 relative group",
                        selectedVariant?.name === variant.name ? "border-brand-gold scale-110" : "border-brand-border hover:border-brand-gold/50"
                      )}
                      title={variant.name}
                    >
                      <div 
                        className="w-full h-full rounded-full border border-brand-iron/50 bg-cover bg-center" 
                        style={{ 
                          backgroundColor: variant.colorHex || '#1a1a1a', 
                          backgroundImage: variant.textureUrl ? `url(${variant.textureUrl})` : 'none' 
                        }}
                      />
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-brand-surface border border-brand-border px-2 py-1 text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {variant.name}
                      </div>
                    </button>
                  ))}
                  
                  {/* Fallback for legacy colors if variants don't exist */}
                  {!product.variants && product.availableColors?.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedVariant({ name: "اللون", colorHex: color })}
                      className={cn(
                        "w-12 h-12 rounded-full border-2 transition-all p-1",
                        selectedVariant?.colorHex === color ? "border-brand-gold scale-110" : "border-brand-border hover:border-brand-gold/50"
                      )}
                    >
                      <div 
                        className="w-full h-full rounded-full border border-brand-iron/50" 
                        style={{ backgroundColor: color }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-10 border-y border-brand-border py-12">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex items-center bg-brand-surface border border-brand-border">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-8 py-4 hover:bg-brand-iron hover:text-brand-gold text-brand-text transition-colors"
                  >
                    -
                  </button>
                  <span className="px-8 py-4 font-bold border-x border-brand-border text-brand-text min-w-[4rem] text-center">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-8 py-4 hover:bg-brand-iron hover:text-brand-gold text-brand-text transition-colors"
                  >
                    +
                  </button>
                </div>
                <button 
                  onClick={handleAddToCart}
                  className="flex-grow bg-brand-gold text-brand-iron py-5 px-10 font-bold uppercase tracking-[0.2em] hover:bg-white transition-all flex items-center justify-center space-x-4 space-x-reverse group shadow-2xl"
                >
                  <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>إضافة إلى السلة</span>
                </button>
                <button className="p-5 border border-brand-border text-brand-muted hover:text-brand-gold hover:border-brand-gold transition-all bg-brand-surface shadow-xl">
                  <Heart className="w-6 h-6" />
                </button>
              </div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-brand-muted text-center sm:text-right italic">
                المخزون الحالي: <span className="text-brand-gold font-bold">{product.stock}</span> قطع متوفرة
              </p>
            </div>

            {/* Guarantees */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-8">
              {[
                { icon: Shield, title: "ضمان 10 سنوات", sub: "على هيكل الخشب والمعدن" },
                { icon: Truck, title: "توصيل آمن", sub: "شحن متخصص للأثاث الفاخر" },
                { icon: RotateCcw, title: "سياسة الاستبدال", sub: "خلال 14 يوم عمل" },
                { icon: Star, title: "صناعة يدوية", sub: "بأيادٍ سعودية ماهرة" },
              ].map((item, i) => (
                <div key={i} className="flex gap-6 items-start group">
                  <div className="bg-brand-surface p-4 border border-brand-border group-hover:border-brand-gold transition-colors shadow-2xl">
                    <item.icon className="w-6 h-6 text-brand-gold/70" />
                  </div>
                  <div>
                    <h4 className="font-serif text-lg font-bold text-brand-text mb-1 tracking-tight">{item.title}</h4>
                    <p className="text-[10px] text-brand-muted uppercase tracking-[0.1em] font-sans opacity-70">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
