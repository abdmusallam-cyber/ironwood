import { useCart } from "../context/CartContext";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, ArrowLeft, ShoppingBag } from "lucide-react";
import { motion } from "motion/react";

export default function Cart() {
  const { cart, removeFromCart, updateQuantity, total } = useCart();
  const navigate = useNavigate();

  const totalSavings = cart.reduce((sum, item) => sum + ((item.originalPrice - item.price) * item.quantity), 0);

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-8" dir="rtl">
        <ShoppingBag className="w-20 h-20 text-brand-gold opacity-20" />
        <h2 className="font-serif text-3xl font-bold">سلة التسوق فارغة</h2>
        <Link 
          to="/products"
          className="bg-brand-iron text-white px-8 py-4 font-bold uppercase tracking-widest hover:bg-brand-gold hover:text-brand-iron transition-all"
        >
          ابدأ التسوق
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-brand-iron min-h-screen py-24 px-4" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-serif text-5xl font-bold mb-16 flex items-center text-brand-text tracking-tighter">
          سـلة التسـوق
          <span className="mr-6 text-[10px] font-bold text-brand-gold bg-brand-gold/10 border border-brand-gold/20 px-4 py-1.5 uppercase tracking-[0.2em] italic">
            {cart.length} PIECES
          </span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-10">
              {cart.map((item) => (
                <motion.div 
                  key={`${item.productId}-${item.selectedVariant?.name || 'default'}`}
                  layout
                  className="flex items-center space-x-8 space-x-reverse bg-brand-surface p-8 border border-brand-border shadow-2xl group hover:border-brand-gold/30 transition-all"
                >
                  <div className="w-28 h-28 flex-shrink-0 bg-brand-iron border border-brand-border p-2 overflow-hidden shadow-xl">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-all duration-700" />
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-serif text-2xl font-bold mb-2 tracking-tight text-brand-text">{item.title}</h3>
                    <div className="flex items-center gap-4 mb-2">
                      <p className="text-brand-gold font-serif text-xl">{item.price} ج.م</p>
                      {item.originalPrice > item.price && (
                        <p className="text-brand-muted font-serif text-sm line-through opacity-50">{item.originalPrice} ج.م</p>
                      )}
                      {item.selectedVariant && (
                        <div className="flex items-center gap-3 border-r border-brand-border pr-4">
                          <span className="text-[10px] text-brand-muted uppercase tracking-widest font-bold opacity-60">الخامة:</span>
                          <div 
                            className="w-5 h-5 border border-brand-border bg-cover bg-center" 
                            style={{ 
                              backgroundColor: item.selectedVariant.colorHex || '#1a1a1a',
                              backgroundImage: item.selectedVariant.textureUrl ? `url(${item.selectedVariant.textureUrl})` : 'none'
                             }}
                            title={item.selectedVariant.name}
                          />
                          <span className="text-[10px] text-brand-text font-serif italic">{item.selectedVariant.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center bg-brand-iron border border-brand-border">
                    <button 
                      onClick={() => item.quantity > 1 && updateQuantity(item.productId, item.quantity - 1, item.selectedVariant?.name)}
                      className="px-5 py-2 hover:text-brand-gold transition-colors text-brand-muted"
                    >
                      -
                    </button>
                    <span className="px-5 py-2 font-bold text-sm border-x border-brand-border text-brand-text min-w-[3rem] text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.productId, item.quantity + 1, item.selectedVariant?.name)}
                      className="px-5 py-2 hover:text-brand-gold transition-colors text-brand-muted"
                    >
                      +
                    </button>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.productId, item.selectedVariant?.name)}
                    className="text-brand-muted hover:text-red-500 transition-colors p-3 hover:bg-red-500/5"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </motion.div>
              ))}
            
            <Link to="/products" className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.3em] text-brand-muted hover:text-brand-gold transition-all italic mt-4 group">
              <ArrowLeft className="ml-3 w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              مواصلة استكشاف المجـموعة
            </Link>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-brand-surface p-10 border border-brand-border shadow-2xl sticky top-32">
              <h3 className="font-serif text-2xl font-bold mb-10 pb-6 border-b border-brand-border tracking-tight text-brand-text">ملخص الاستثمار</h3>
              <div className="space-y-6 mb-10">
                <div className="flex justify-between text-sm">
                  <span className="text-brand-muted uppercase tracking-widest text-[10px]">المجموع الفرعي</span>
                  <span className="font-bold text-brand-text">{total + totalSavings} ج.م</span>
                </div>
                {totalSavings > 0 && (
                  <div className="flex justify-between text-red-500 uppercase tracking-widest text-[10px] italic">
                    <span>الخصومات والوفورات</span>
                    <span className="font-bold">-{totalSavings} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-brand-muted uppercase tracking-widest text-[10px]">تكاليف الشحن</span>
                  <span className="text-brand-gold font-bold uppercase tracking-[0.2em] text-[10px] italic">تحتسب عند الدفع</span>
                </div>
                <div className="pt-8 border-t border-brand-border flex justify-between items-baseline">
                  <span className="font-serif text-lg font-bold text-brand-text">الإجمالي النهائي</span>
                  <span className="text-4xl font-serif font-bold text-brand-gold">{total} ج.م</span>
                </div>
              </div>
              <button 
                onClick={() => navigate("/checkout")}
                className="w-full bg-brand-gold text-brand-iron py-5 font-bold uppercase tracking-[0.2em] hover:bg-white transition-all shadow-2xl"
              >
                المضـي قدماً للدفع
              </button>
              <div className="mt-8 space-y-4">
                 <p className="text-[9px] text-brand-muted text-center uppercase tracking-[0.25em] leading-relaxed italic opacity-60">
                  جميع الأسعار تتضمن ضريبة القيمة المضافة <br /> وتخضع لمعايير الجودة العالمية
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
