import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { getSiteSettings, SiteSettings } from "../services/siteContent";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    getSiteSettings().then(setSettings);
  }, []);

  const data = settings || {
    phone: "+20 100 000 0000",
    email: "info@ironwood.eg",
    address: "القاهرة، مصر",
    instagram: "#",
    facebook: "#",
    twitter: "#",
    aboutText: "تجارة وتصنيع الأثاث الخشبي والمعدني الفاخر. نجمع بين قوة المعدن وجمال الخشب لنصنع قطعاً فنية تدوم طويلاً.",
    footerLinks: [
      { label: "الرئيسية", url: "/" },
      { label: "منتجاتنا", url: "/products" },
      { label: "أعمالنا", url: "/portfolio" },
      { label: "حسابي", url: "/login" }
    ],
    privacyPolicyUrl: "#/privacy",
    termsUrl: "#/terms"
  };

  const quickLinks = data.footerLinks?.length ? data.footerLinks : [
    { label: "الرئيسية", url: "/" },
    { label: "منتجاتنا", url: "/products" },
    { label: "أعمالنا", url: "/portfolio" },
    { label: "حسابي", url: "/login" }
  ];

  return (
    <footer className="bg-brand-iron text-brand-text pt-16 pb-8 border-t border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-6">
            <h2 className="font-serif text-3xl font-bold tracking-widest text-brand-gold">
              IRON WOOD
            </h2>
            <p className="text-brand-muted text-sm leading-relaxed">
              {data.aboutText}
            </p>
          </div>

          {/* Links */}
          <div className="space-y-6">
            <h3 className="font-medium uppercase tracking-widest text-xs text-brand-gold">{t('footer.quickLinks')}</h3>
            <ul className="space-y-4 text-sm text-brand-muted">
              {quickLinks.map((link) => (
                <li key={link.url}>
                  <a href={link.url} className="hover:text-brand-gold transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-6">
            <h3 className="font-medium uppercase tracking-widest text-xs text-brand-gold">{t('footer.contact')}</h3>
            <ul className="space-y-4 text-sm text-brand-muted">
              <li className="flex items-center space-x-3 space-x-reverse">
                <Phone className="w-4 h-4 text-brand-gold" />
                <span>{data.phone}</span>
              </li>
              <li className="flex items-center space-x-3 space-x-reverse">
                <Mail className="w-4 h-4 text-brand-gold" />
                <span>{data.email}</span>
              </li>
              <li className="flex items-center space-x-3 space-x-reverse">
                <MapPin className="w-4 h-4 text-brand-gold" />
                <span>{data.address}</span>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div className="space-y-6">
            <h3 className="font-medium uppercase tracking-widest text-xs text-brand-gold">{t('footer.followUs')}</h3>
            <div className="flex space-x-4 space-x-reverse">
              <a href={data.instagram} className="p-2 bg-white/5 rounded-full hover:bg-brand-gold hover:text-brand-iron transition-all border border-brand-border">
                <Instagram className="w-5 h-5" />
              </a>
              <a href={data.facebook} className="p-2 bg-white/5 rounded-full hover:bg-brand-gold hover:text-brand-iron transition-all border border-brand-border">
                <Facebook className="w-5 h-5" />
              </a>
              <a href={data.twitter} className="p-2 bg-white/5 rounded-full hover:bg-brand-gold hover:text-brand-iron transition-all border border-brand-border">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
            <div className="pt-4">
              <p className="text-[10px] uppercase tracking-widest text-brand-muted mb-2 italic">{t('footer.newsletter')}</p>
              <div className="flex">
                <input 
                  type="email" 
                  placeholder={t('footer.emailPlaceholder')} 
                  className="bg-brand-surface border border-brand-border px-4 py-2 text-sm focus:outline-none focus:border-brand-gold w-full text-right"
                />
                <button className="bg-brand-gold text-brand-iron px-4 py-2 text-xs font-bold uppercase tracking-widest">
                  {t('footer.join')}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-brand-border flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-[10px] uppercase tracking-widest text-brand-muted">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
          <div className="flex space-x-6 space-x-reverse text-[10px] uppercase tracking-widest text-brand-muted">
            <a href={data.privacyPolicyUrl || "#/privacy"} className="hover:text-white transition-colors">{t('footer.privacy')}</a>
            <a href={data.termsUrl || "#/terms"} className="hover:text-white transition-colors">{t('footer.terms')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
