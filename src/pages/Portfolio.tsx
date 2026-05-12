import { motion } from "motion/react";
import { ExternalLink, Camera } from "lucide-react";
import { useState, useEffect } from "react";
import { getPortfolioItems, PortfolioItem } from "../services/siteContent";

export default function Portfolio() {
  const [projects, setProjects] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const items = await getPortfolioItems();
        setProjects(items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, []);

  if (loading) return <div className="p-20 text-center animate-pulse">جاري التحميل...</div>;

  return (
    <div className="bg-brand-iron min-h-screen pb-32" dir="rtl">
      {/* Hero */}
      <section className="bg-brand-surface text-brand-text py-32 px-4 text-center overflow-hidden relative border-b border-brand-border">
        <div className="absolute inset-0 opacity-10 scale-110 pointer-events-none">
          <img src="https://images.unsplash.com/photo-1541944743827-e04bb645d993?auto=format&fit=crop&q=80&w=2000" alt="" className="w-full h-full object-cover" />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-4xl mx-auto"
        >
          <Camera className="w-16 h-16 text-brand-gold mx-auto mb-10 opacity-30 animate-pulse" />
          <h1 className="font-serif text-6xl md:text-8xl font-bold mb-8 tracking-tighter">سجـل الإبـداع</h1>
          <p className="text-brand-gold uppercase tracking-[0.5em] text-[10px] font-bold italic opacity-80">CURATED PORTFOLIO OF MASTERPIECES</p>
        </motion.div>
      </section>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {projects.map((project, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group bg-brand-surface border border-brand-border shadow-2xl hover:border-brand-gold/50 transition-all overflow-hidden"
            >
              <div className="aspect-[16/10] overflow-hidden relative">
                {project.imageUrl ? (
                  <img 
                    src={project.imageUrl} 
                    alt={project.title}
                    className="w-full h-full object-cover transition-all duration-[1.5s] group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-brand-iron" />
                )}
                <div className="absolute inset-0 bg-brand-iron/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center backdrop-blur-sm">
                      <ExternalLink className="w-6 h-6 text-white" />
                   </div>
                </div>
              </div>
              <div className="p-12 space-y-6 bg-brand-surface/50 backdrop-blur-xl">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-brand-gold bg-brand-gold/5 px-4 py-1.5 border border-brand-gold/20 italic">{project.category}</span>
                  <span className="text-brand-muted text-[10px] font-mono opacity-50">#PROJECT-00{i+1}</span>
                </div>
                <h3 className="font-serif text-4xl font-bold text-brand-text group-hover:text-brand-gold transition-colors tracking-tight">{project.title}</h3>
                <p className="text-brand-muted leading-relaxed text-lg font-serif italic opacity-70">{project.description}</p>
                <div className="pt-10 border-t border-brand-border">
                  <button className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-gold border-b border-brand-gold/30 hover:border-brand-gold hover:text-white transition-all pb-2 italic">
                    استكشاف الأبعاد المعمارية للمشروع
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Featured Quote */}
      <section className="mt-48 max-w-5xl mx-auto px-4 text-center">
        <div className="w-32 h-[1px] bg-brand-gold mx-auto mb-16 opacity-30" />
        <motion.div
           initial={{ opacity: 0 }}
           whileInView={{ opacity: 1 }}
           className="relative"
        >
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-9xl text-brand-gold/5 font-serif pointer-events-none">"</div>
          <p className="font-serif text-4xl md:text-6xl italic text-brand-text leading-[1.3] font-light">
            "نحن لا نصنع أثاثاً فحسب، بل نصنع قصصاً ترويها جدران منزلك. كل قطعة هي استثمار في الجمال والزمن."
          </p>
        </motion.div>
        <p className="mt-12 uppercase tracking-[0.4em] text-[10px] font-bold text-brand-gold opacity-80 italic">— فريق مصممي IRON WOOD المبدع</p>
      </section>
    </div>
  );
}
