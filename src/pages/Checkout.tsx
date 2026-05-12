import { useState, useEffect, useRef } from "react";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { OperationType, ShippingRate, ProductVariant } from "../types";
import { handleFirestoreError, cn } from "../lib/utils";
import { ShieldCheck, Truck, CreditCard, CheckCircle2, MapPin, DollarSign, Wallet } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { EGYPT_GOVERNORATES } from "../constants/egyptData";
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { getSiteSettings, SiteSettings } from "../services/siteContent";
import { useAuth } from "../App";

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY);

export default function Checkout() {
  const { cart, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [shippingCost, setShippingCost] = useState(0);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [formData, setFormData] = useState({
    name: user?.displayName || "",
    address: user?.address || "",
    governorate: user?.governorate || "",
    city: user?.city || "",
    phone: user?.phoneNumber || "",
    paymentMethod: "cod" as "cod" | "card" | "vodafone_cash" | "instapay",
    location: null as { lat: number, lng: number } | null,
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.displayName || prev.name,
        address: user.address || prev.address,
        governorate: user.governorate || prev.governorate,
        city: user.city || prev.city,
        phone: user.phoneNumber || prev.phone,
      }));
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      const q = collection(db, "shippingRates");
      const snap = await getDocs(q);
      setShippingRates(snap.docs.map(d => d.data() as ShippingRate));
      
      const settings = await getSiteSettings();
      setSiteSettings(settings);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const rate = shippingRates.find(r => r.governorate === formData.governorate)?.rate || 0;
    setShippingCost(rate);
  }, [formData.governorate, shippingRates]);

  const totalSavings = cart.reduce((sum, item) => sum + ((item.originalPrice - item.price) * item.quantity), 0);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      setLoading(true);
      await addDoc(collection(db, "orders"), {
        userId: auth.currentUser.uid,
        items: cart,
        total: total + shippingCost,
        shippingCost: shippingCost,
        status: formData.paymentMethod === "cod" ? "cod" : 
                formData.paymentMethod === "vodafone_cash" ? "vodafone_cash" :
                formData.paymentMethod === "instapay" ? "instapay" : "paid",
        shippingInfo: formData,
        createdAt: serverTimestamp(),
      });
      
      setSuccess(true);
      clearCart();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "orders");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb] px-4" dir="rtl">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-white p-12 text-center shadow-2xl border border-brand-iron/5"
        >
          <CheckCircle2 className="w-20 h-20 text-brand-gold mx-auto mb-8" />
          <h2 className="font-serif text-4xl font-bold mb-4">
            {siteSettings?.successTitle || "تم طلبك بنجاح!"}
          </h2>
          <p className="text-gray-500 mb-10 leading-relaxed">
            {siteSettings?.successMessage || "شكراً لثقتك في IRON WOOD. لقد بدأنا العمل على تجهيز طلبك وسيصلك قريباً."}
          </p>
          <button 
            onClick={() => navigate("/")}
            className="w-full bg-brand-iron text-white py-4 font-bold uppercase tracking-widest hover:bg-brand-gold hover:text-brand-iron transition-all"
          >
            العودة للرئيسية
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-brand-iron min-h-screen py-24 px-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <header className="mb-20">
          <h1 className="font-serif text-5xl md:text-7xl font-bold mb-4 text-brand-text tracking-tighter italic">إتـمام الاسـتثمار</h1>
          <p className="text-brand-gold font-sans uppercase tracking-[0.4em] text-[10px] font-bold italic opacity-80">SECURE ENCRYPTED CHECKOUT PROCESS</p>
        </header>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          {/* Shipping Form */}
          <div className="space-y-16">
            <section className="space-y-10">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-gold flex items-center bg-brand-gold/5 px-6 py-2 border border-brand-gold/20 w-fit italic">
                <Truck className="ml-3 w-4 h-4" />
                تـفاصيل الشـحن الفـاخر
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-right">
                <div className="space-y-3 col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-muted italic opacity-60">الاسم الكامل للمستلم</label>
                  <input 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    type="text" 
                    className="w-full border-b border-brand-border focus:border-brand-gold bg-transparent py-4 text-xl text-brand-text outline-none transition-all placeholder:text-brand-muted/30 font-serif italic"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-muted italic opacity-60">رقم الجوال الشخصي</label>
                  <input 
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    type="tel" 
                    className="w-full border-b border-brand-border focus:border-brand-gold bg-transparent py-4 text-xl text-brand-text outline-none transition-all font-mono"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-muted italic opacity-60">المحافظة</label>
                  <select 
                    required
                    value={formData.governorate}
                    onChange={(e) => setFormData({...formData, governorate: e.target.value, city: ""})}
                    className="w-full border-b border-brand-border focus:border-brand-gold bg-transparent py-4 text-xl text-brand-text outline-none transition-all font-serif italic appearance-none"
                  >
                    <option value="" disabled className="bg-brand-iron">اختر المحافظة...</option>
                    {EGYPT_GOVERNORATES.map(gov => (
                      <option key={gov.id} value={gov.name} className="bg-brand-iron">{gov.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-muted italic opacity-60">المدينة / المنطقة</label>
                  <select 
                    required
                    disabled={!formData.governorate}
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full border-b border-brand-border focus:border-brand-gold bg-transparent py-4 text-xl text-brand-text outline-none transition-all font-serif italic appearance-none disabled:opacity-30"
                  >
                    <option value="" disabled className="bg-brand-iron">اختر المدينة...</option>
                    {EGYPT_GOVERNORATES.find(g => g.name === formData.governorate)?.cities.map(city => (
                      <option key={city} value={city} className="bg-brand-iron">{city}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-muted italic opacity-60">العنوان بالتفصيل (رقم المبنى، الشقة، اسم الشارع)</label>
                  <input 
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    type="text" 
                    className="w-full border-b border-brand-border focus:border-brand-gold bg-transparent py-4 text-xl text-brand-text outline-none transition-all font-serif italic"
                  />
                </div>

                <div className="space-y-3 col-span-2">
                   <div className="flex justify-between items-center mb-4">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-muted italic opacity-60">تحديد الموقع الدقيق (اختياري)</label>
                      {formData.location && <span className="text-[8px] text-brand-gold uppercase tracking-widest font-bold flex items-center gap-2"><CheckCircle2 className="w-3 h-3" /> تم تحديد الموقع</span>}
                   </div>
                   <div className="h-64 md:h-80 border border-brand-border bg-brand-iron overflow-hidden relative group">
                      {hasValidKey ? (
                        <APIProvider apiKey={API_KEY} version="weekly">
                          <Map
                            defaultCenter={{ lat: 30.0444, lng: 31.2357 }}
                            defaultZoom={12}
                            mapId="CHECKOUT_MAP"
                            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                            onClick={(e) => {
                              if (e.detail.latLng) {
                                setFormData({...formData, location: e.detail.latLng});
                              }
                            }}
                            className="w-full h-full"
                          >
                            {formData.location && (
                               <AdvancedMarker position={formData.location}>
                                  <div className="p-1 bg-brand-gold border border-brand-iron">
                                     <MapPin className="w-4 h-4 text-brand-iron" />
                                  </div>
                               </AdvancedMarker>
                            )}
                          </Map>
                        </APIProvider>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-brand-surface/50">
                           <MapPin className="w-12 h-12 text-brand-muted mb-4 opacity-20" />
                           <p className="text-[10px] text-brand-muted uppercase tracking-widest leading-relaxed">يرجى إضافة مفتاح Google Maps في الإعدادات لتفعيل الخريطة</p>
                        </div>
                      )}
                      {!formData.location && hasValidKey && (
                        <div className="absolute inset-0 bg-brand-iron/40 pointer-events-none flex items-center justify-center">
                           <p className="bg-brand-iron border border-brand-gold px-6 py-2 text-[8px] font-bold uppercase tracking-widest text-brand-gold shadow-2xl">انقر على الخريطة لتحديد موقعك</p>
                        </div>
                      )}
                   </div>
                </div>
              </div>
            </section>

            <section className="space-y-10 group">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-gold flex items-center italic bg-brand-gold/5 px-6 py-2 border border-brand-gold/20 w-fit">
                <Wallet className="ml-3 w-4 h-4" />
                طـريقة الـدفع المـثالية
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <button 
                  type="button"
                  onClick={() => setFormData({...formData, paymentMethod: 'cod'})}
                  className={cn(
                    "p-6 border shadow-xl transition-all duration-500 text-right relative overflow-hidden group/btn",
                    formData.paymentMethod === 'cod' ? "bg-brand-surface border-brand-gold ring-1 ring-brand-gold/30" : "bg-brand-iron border-brand-border grayscale opacity-60 hover:grayscale-0 hover:opacity-100"
                  )}
                 >
                    <div className={cn(
                       "absolute top-0 right-0 w-1 h-full bg-brand-gold transition-transform duration-500",
                       formData.paymentMethod === 'cod' ? "translate-y-0" : "translate-y-full"
                    )} />
                    <DollarSign className={cn("w-5 h-5 mb-3 transition-colors", formData.paymentMethod === 'cod' ? "text-brand-gold" : "text-brand-muted")} />
                    <h4 className="font-serif font-bold text-sm text-brand-text">عند الاستلام</h4>
                    <p className="text-[8px] text-brand-muted uppercase tracking-widest mt-1">C.O.D</p>
                 </button>

                 <button 
                  type="button"
                  onClick={() => setFormData({...formData, paymentMethod: 'vodafone_cash'})}
                  className={cn(
                    "p-6 border shadow-xl transition-all duration-500 text-right relative overflow-hidden group/btn",
                    formData.paymentMethod === 'vodafone_cash' ? "bg-brand-surface border-[#e11d1e] ring-1 ring-[#e11d1e]/30" : "bg-brand-iron border-brand-border grayscale opacity-60 hover:grayscale-0 hover:opacity-100"
                  )}
                 >
                    <div className={cn(
                       "absolute top-0 right-0 w-1 h-full bg-[#e11d1e] transition-transform duration-500",
                       formData.paymentMethod === 'vodafone_cash' ? "translate-y-0" : "translate-y-full"
                    )} />
                    <div className="w-5 h-5 mb-3 flex items-center justify-center bg-[#e11d1e] text-white rounded-full font-bold text-[8px]">V</div>
                    <h4 className="font-serif font-bold text-sm text-brand-text">فودافون كاش</h4>
                    <p className="text-[8px] text-brand-muted uppercase tracking-widest mt-1">Vodafone Cash</p>
                 </button>

                 <button 
                  type="button"
                  onClick={() => setFormData({...formData, paymentMethod: 'instapay'})}
                  className={cn(
                    "p-6 border shadow-xl transition-all duration-500 text-right relative overflow-hidden group/btn",
                    formData.paymentMethod === 'instapay' ? "bg-brand-surface border-[#4b2d89] ring-1 ring-[#4b2d89]/30" : "bg-brand-iron border-brand-border grayscale opacity-60 hover:grayscale-0 hover:opacity-100"
                  )}
                 >
                    <div className={cn(
                       "absolute top-0 right-0 w-1 h-full bg-[#4b2d89] transition-transform duration-500",
                       formData.paymentMethod === 'instapay' ? "translate-y-0" : "translate-y-full"
                    )} />
                    <div className="w-5 h-5 mb-3 flex items-center justify-center bg-[#4b2d89] text-white rounded-full font-bold text-[8px]">I</div>
                    <h4 className="font-serif font-bold text-sm text-brand-text">انستا باي</h4>
                    <p className="text-[8px] text-brand-muted uppercase tracking-widest mt-1">Instapay</p>
                 </button>

                 <button 
                  type="button"
                  onClick={() => setFormData({...formData, paymentMethod: 'card'})}
                  className={cn(
                    "p-6 border shadow-xl transition-all duration-500 text-right relative overflow-hidden group/btn",
                    formData.paymentMethod === 'card' ? "bg-brand-surface border-brand-gold ring-1 ring-brand-gold/30" : "bg-brand-iron border-brand-border grayscale opacity-60 hover:grayscale-0 hover:opacity-100"
                  )}
                 >
                    <div className={cn(
                       "absolute top-0 right-0 w-1 h-full bg-brand-gold transition-transform duration-500",
                       formData.paymentMethod === 'card' ? "translate-y-0" : "translate-y-full"
                    )} />
                    <CreditCard className={cn("w-5 h-5 mb-3 transition-colors", formData.paymentMethod === 'card' ? "text-brand-gold" : "text-brand-muted")} />
                    <h4 className="font-serif font-bold text-sm text-brand-text">بطاقة ائتمان</h4>
                    <p className="text-[8px] text-brand-muted uppercase tracking-widest mt-1">Credit Card</p>
                 </button>
              </div>

              {formData.paymentMethod === 'vodafone_cash' && (
                <div className="p-8 bg-[#e11d1e]/5 border border-[#e11d1e]/20 animate-in fade-in slide-in-from-top-4">
                   <p className="text-[10px] text-[#e11d1e] text-center italic tracking-widest leading-relaxed font-bold">يرجى تحويل المبلغ إلى الرقم: <span className="font-mono underline">{siteSettings?.vodafoneCashNumber || "010XXXXXXXX"}</span> وإرفاق صورة التحويل عند التواصل.</p>
                </div>
              )}

              {formData.paymentMethod === 'instapay' && (
                <div className="p-8 bg-[#4b2d89]/5 border border-[#4b2d89]/20 animate-in fade-in slide-in-from-top-4">
                   <p className="text-[10px] text-[#4b2d89] text-center italic tracking-widest leading-relaxed font-bold">يرجى التحويل عبر انستا باي على: <span className="font-mono underline">{siteSettings?.instapayVpa || "ironwood@instapay"}</span></p>
                </div>
              )}

              {formData.paymentMethod === 'card' && (
                <div className="p-8 bg-brand-gold/5 border border-brand-gold/20 animate-in fade-in slide-in-from-top-4">
                   <p className="text-[10px] text-brand-gold text-center italic tracking-widest leading-relaxed">سيتم توجيهك لبوابة الدفع الآمنة "Stripe" بعد الضغط على زر التأكيد.</p>
                </div>
              )}
            </section>
          </div>

          {/* Order Summary */}
          <div className="bg-brand-surface border border-brand-border p-12 shadow-3xl relative overflow-hidden h-fit sticky top-32">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-gold/5 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3 pointer-events-none" />
            
            <div className="relative z-10 space-y-12">
              <h3 className="font-serif text-3xl font-bold border-b border-brand-border pb-8 uppercase tracking-[0.2em] italic text-brand-text/90">تـفاصيل الاسـتثمار</h3>
              
              <div className="space-y-8 max-h-[250px] overflow-y-auto pr-6 custom-scrollbar">
                {cart.map((item) => (
                  <div key={`${item.productId}-${item.selectedVariant?.name || 'default'}`} className="flex justify-between items-center group">
                    <div className="flex items-center gap-6">
                      <span className="text-brand-gold font-bold font-serif text-lg italic opacity-80">{item.quantity}x</span>
                      <div className="flex flex-col">
                        <span className="text-brand-text font-serif italic text-lg tracking-tight group-hover:text-brand-gold transition-colors">{item.title}</span>
                        {item.selectedVariant && (
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[8px] text-brand-muted uppercase tracking-widest font-bold opacity-60">الخامة:</span>
                            <div 
                              className="w-4 h-4 border border-brand-border bg-cover bg-center" 
                              style={{ 
                                backgroundColor: item.selectedVariant.colorHex || '#1a1a1a',
                                backgroundImage: item.selectedVariant.textureUrl ? `url(${item.selectedVariant.textureUrl})` : 'none'
                               }}
                            />
                            <span className="text-[9px] text-brand-muted font-serif italic">{item.selectedVariant.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-brand-text font-mono text-sm tracking-widest">{item.price * item.quantity} ج.م</span>
                  </div>
                ))}
              </div>

              <div className="space-y-6 pt-10 border-t border-brand-border">
                <div className="flex justify-between text-brand-muted uppercase tracking-[0.2em] text-[10px] italic">
                  <span>قيمة المنتجات</span>
                  <span className="font-bold text-brand-text">{total} ج.م</span>
                </div>
                <div className="flex justify-between text-brand-muted uppercase tracking-[0.2em] text-[10px] italic">
                  <span>اللـوجستيات والشحن</span>
                  <span className="text-brand-gold font-bold tracking-[0.1em] uppercase italic">{shippingCost > 0 ? `${shippingCost} ج.م` : 'مجاني لفترة محدودة'}</span>
                </div>
                {totalSavings > 0 && (
                  <div className="flex justify-between text-red-500 uppercase tracking-[0.2em] text-[10px] italic animate-pulse">
                    <span>قيمة الوفورات (الخصم)</span>
                    <span className="font-bold">-{totalSavings} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-6">
                  <span className="font-serif text-xl font-bold text-brand-text italic">الإجمالي النهائي</span>
                  <span className="text-5xl font-serif font-bold text-brand-gold tracking-tighter drop-shadow-[0_0_20px_rgba(212,175,55,0.2)]">{total + shippingCost} ج.م</span>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-brand-gold text-brand-iron py-6 font-bold uppercase tracking-[0.3em] hover:bg-white transition-all shadow-3xl disabled:opacity-50 disabled:cursor-not-allowed text-xs relative overflow-hidden group/btn"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                <span className="relative z-10">{loading ? "جاري معالجة المعاملة..." : "تـأكيد الاسـتثمار والدفـع"}</span>
              </button>

              <div className="flex items-center justify-center gap-4 opacity-40 group hover:opacity-100 transition-opacity">
                <ShieldCheck className="w-5 h-5 text-brand-gold" />
                <span className="text-[9px] uppercase tracking-[0.4em] font-bold italic">SSL 256-BIT MILITARY GRADE ENCRYPTION</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
