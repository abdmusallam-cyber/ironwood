import { motion } from "motion/react";
import { ArrowRight, Star, Shield, Truck, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Product } from "../types";
import { getHomeHighlights, HomeHighlight, getTestimonials, Testimonial } from "../services/siteContent";

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [highlights, setHighlights] = useState<HomeHighlight[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pSnap = await getDocs(query(collection(db, "products"), limit(3)));
        setFeaturedProducts(pSnap.docs.map(d => ({ ...d.data(), id: d.id } as Product)));
        
        const hSnap = await getHomeHighlights();
        setHighlights(hSnap);

        const tSnap = await getTestimonials();
        setTestimonials(tSnap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const hero = highlights[0] || {
    title: "جمال يدوم للأبد",
    description: "قطع أثاث مصنوعة يدوياً تعكس مهارة الحرفية السعودية، نجمع بين متانة الحديد ودفء الخشب الطبيعي.",
    imageUrl: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=2000",
    category: "SUMMER COLLECTION 2026"
  };

  if (loading) return <div className="p-20 text-center animate-pulse">جاري التحميل...</div>;

  return (
    <div className="bg-brand-iron min-h-screen" dir="rtl">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center overflow-hidden bg-gradient-to-r from-brand-surface to-brand-iron">
        <div className="absolute inset-0 z-0">
          {hero.imageUrl ? (
            <img 
              src={hero.imageUrl} 
              alt="Hero Background"
              className="w-full h-full object-cover brightness-[0.3]"
            />
          ) : (
            <div className="w-full h-full bg-brand-iron" />
          )}
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-brand-text">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <span className="uppercase tracking-[0.4em] text-brand-gold text-xs font-bold block mb-4 italic">
              {hero.category}
            </span>
            <h1 className="font-serif text-6xl md:text-8xl font-medium leading-tight mb-8">
              {hero.title}
            </h1>
            <p className="text-lg text-brand-muted mb-10 leading-relaxed max-w-md">
              {hero.description}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link 
                to="/products"
                className="bg-brand-gold text-brand-iron px-10 py-5 font-bold uppercase tracking-widest hover:bg-white transition-all flex items-center group"
              >
                اكتشف التحف
                <ArrowRight className="mr-2 group-hover:translate-x-[-4px] transition-transform" />
              </Link>
              <Link 
                to="/portfolio"
                className="border border-brand-gold text-brand-gold px-10 py-5 font-bold uppercase tracking-widest hover:bg-brand-gold hover:text-brand-iron transition-all"
              >
                أعمالنا السابقة
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Floating Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/40 animate-bounce">
          <div className="w-px h-16 bg-gradient-to-b from-brand-gold to-transparent mx-auto" />
        </div>
      </section>

      {/* Stats/Benefits */}
      <section className="py-20 border-b border-brand-border bg-brand-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {[
              { icon: Shield, label: "جودة مضمونة", sub: "ضمان لمدة 10 سنوات" },
              { icon: Truck, label: "شحن سريع", sub: "لكل محافظات مصر" },
              { icon: Clock, label: "صناعة يدوية", sub: "اهتمام بأدق التفاصيل" },
              { icon: Star, label: "تصميم خاص", sub: "حسب طلبك وقياسك" },
            ].map((item, i) => (
              <div key={i} className="space-y-4">
                <div className="flex justify-center">
                  <item.icon className="w-8 h-8 text-brand-gold/70" />
                </div>
                <h3 className="font-serif text-xl font-bold">{item.label}</h3>
                <p className="text-[10px] text-brand-muted uppercase tracking-widest">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 bg-brand-iron">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-16">
            <div className="space-y-4">
              <span className="uppercase tracking-widest text-xs text-brand-gold font-bold italic">مختاراتنا لك</span>
              <h2 className="font-serif text-4xl md:text-5xl text-brand-text">أحدث التصاميم</h2>
            </div>
            <Link to="/products" className="text-xs font-bold uppercase tracking-widest border-b border-brand-gold pb-1 hover:text-brand-gold transition-colors text-brand-muted">
              عرض الكل
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {featuredProducts.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group cursor-pointer bg-brand-surface p-4 border border-brand-border"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-brand-iron mb-6">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.title}
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-brand-surface" />
                  )}
                  <div className="absolute inset-0 bg-brand-iron/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Link 
                    to={`/product/${product.id}`}
                    className="absolute bottom-6 right-6 left-6 bg-brand-gold text-brand-iron py-4 text-center text-xs font-bold uppercase tracking-widest opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-2xl"
                  >
                    تفاصيل المنتج
                  </Link>
                </div>
                <h3 className="font-serif text-xl mb-2 group-hover:text-brand-gold transition-colors">{product.title}</h3>
                <div className="flex items-center gap-3">
                  {product.discountPrice ? (
                    <>
                      <p className="text-brand-gold font-serif">{product.discountPrice} ج.م</p>
                      <p className="text-brand-muted font-serif text-xs line-through opacity-50">{product.price} ج.م</p>
                    </>
                  ) : (
                    <p className="text-brand-gold font-serif">{product.price} ج.م</p>
                  )}
                </div>
                <p className="text-[10px] text-brand-muted uppercase tracking-widest mt-2">Steel & Oak</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 bg-brand-surface border-y border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-brand-text">
          <div className="space-y-4 mb-20 text-center">
            <span className="uppercase tracking-widest text-xs text-brand-gold font-bold italic italic">ماذا يقول عملاؤنا</span>
            <h2 className="font-serif text-4xl md:text-5xl">شهادات نعتز بها</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                className="bg-brand-surface p-12 border border-brand-border shadow-2xl space-y-6 relative"
              >
                <span className="text-brand-gold text-6xl font-serif absolute top-4 right-8 opacity-20">"</span>
                <p className="font-serif text-lg italic leading-relaxed text-brand-text/80">"{t.quote}"</p>
                <div className="pt-6 border-t border-brand-border">
                  <p className="font-bold text-brand-gold">{t.name}</p>
                  <p className="text-[10px] uppercase tracking-widest text-brand-muted mt-1 italic">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 bg-brand-iron text-brand-text overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-brand-surface skew-x-12 translate-x-1/2 opacity-20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <div className="space-y-10">
              <span className="uppercase tracking-widest text-xs text-brand-gold font-bold italic">خدمة التصميم الخاص</span>
              <h2 className="font-serif text-5xl md:text-7xl leading-[1.2]">هل لديك فكرة <br /> <span className="italic text-brand-gold">تصميم خاص؟</span></h2>
              <p className="text-brand-muted text-lg max-w-lg font-serif italic">
                نحن متخصصون في تحويل أفكارك إلى واقع. سواء كان لمنزلك أو مكتبك، فريقنا جاهز للتصنيع حسب طلبك.
              </p>
              <button className="border border-brand-gold text-brand-gold px-12 py-6 font-bold uppercase tracking-widest hover:bg-brand-gold hover:text-brand-iron transition-all shadow-2xl">
                اطلب استشارة مجانية
              </button>
            </div>
            <div className="relative group">
              <div className="absolute inset-0 border border-brand-gold translate-x-4 translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-700" />
              <img 
                src="https://images.unsplash.com/photo-1581428982868-e410dd047a90?auto=format&fit=crop&q=80&w=1000" 
                alt="Workshop"
                className="w-full aspect-square object-cover rounded-none transition-all duration-1000 relative z-10"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
