import { db } from "./firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, limit } from "firebase/firestore";

const products = [
  {
    title: "طاولة طعام راقية من خشب الجوز",
    description: "طاولة طعام مصنوعة يدوياً من خشب الجوز الطبيعي مع أرجل معدنية مطلية باللون الأسود المطفي. تجمع بين الفخامة والعملانية.",
    price: 4800,
    discountPrice: 4200,
    stock: 5,
    category: "combined",
    imageUrl: "https://images.unsplash.com/photo-1577145745727-42b77dc1290a?auto=format&fit=crop&q=80&w=800",
    rating: 4.9,
    variants: [
      { name: "خشب جوز طبيعي", textureUrl: "https://images.unsplash.com/photo-1610505466030-9971bc393ea6?auto=format&fit=crop&q=80&w=200" },
      { name: "خشب سنديان داكن", textureUrl: "https://images.unsplash.com/photo-1517400384501-4475df864016?auto=format&fit=crop&q=80&w=200" }
    ],
    createdAt: serverTimestamp(),
  },
  {
    title: "مكتب خشبي كلاسيكي",
    description: "مكتب مصنوع من خشب البلوط الصلب، مصمم ليوفر راحة قصوى أثناء العمل مع لمسة جمالية كلاسيكية.",
    price: 3200,
    discountPrice: 2800,
    stock: 8,
    category: "wood",
    imageUrl: "https://images.unsplash.com/photo-1544450175-570a2f4da851?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    variants: [
      { name: "بلوط فاتح", textureUrl: "https://images.unsplash.com/photo-1622393450280-c12e83f2a1da?auto=format&fit=crop&q=80&w=200" },
      { name: "بلوط رمادي", colorHex: "#808080" }
    ],
    createdAt: serverTimestamp(),
  },
  {
    title: "أرفف جدارية صناعية",
    description: "أرفف جدارية قوية مصنوعة من خشب الصنوبر وإطارات حديدية، مثالية لعرض الكتب والتحف.",
    price: 950,
    stock: 12,
    category: "metal",
    imageUrl: "https://images.unsplash.com/photo-1594913785162-e6785b483ac7?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    createdAt: serverTimestamp(),
  },
  {
    title: "كرسي معدني عصري",
    description: "كرسي بتصميم هندسي فريد مصنوع بالكامل من الفولاذ المقاوم للصدأ، يضيف لمسة عصرية لأي غرفة.",
    price: 1200,
    stock: 15,
    category: "metal",
    imageUrl: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?auto=format&fit=crop&q=80&w=800",
    rating: 4.9,
    createdAt: serverTimestamp(),
  },
  {
    title: "خزانة خشبية يدوية",
    description: "خزانة جانبية بمقابض نحاسية وأرجل خشبية نحيلة، توفر مساحة تخزين واسعة بأسلوب فني.",
    price: 2600,
    stock: 3,
    category: "wood",
    imageUrl: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&q=80&w=800",
    rating: 4.6,
    createdAt: serverTimestamp(),
  }
];

const portfolio = [
  {
    title: "قصر سكني - القاهرة",
    category: "تصاميم مخصصة",
    year: "2024",
    imageUrl: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=1200",
    description: "تجهيز كامل للمجالس وغرف الطعام بالأخشاب الطبيعية والمعادن الفاخرة.",
    createdAt: serverTimestamp(),
  },
  {
    title: "مكتب شركة تقنية - دبي",
    category: "مشاريع تجارية",
    year: "2023",
    imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200",
    description: "طاولات اجتماعات فولاذية ومكاتب خشبية بنظام صناعي حديث.",
    createdAt: serverTimestamp(),
  }
];

const homeHighlights = [
  {
    title: "جمال يدوم للأبد",
    description: "قطع أثاث مصنوعة يدوياً تعكس مهارة الحرفية السعودية، نجمع بين متانة الحديد ودفء الخشب الطبيعي.",
    imageUrl: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=2000",
    category: "SUMMER COLLECTION 2026",
    createdAt: serverTimestamp(),
  }
];

export async function seedDatabase() {
  const productsCol = collection(db, "products");
  const portfolioCol = collection(db, "portfolio");
  const highlightsCol = collection(db, "homeHighlights");
  const testimonialsCol = collection(db, "testimonials");
  const settingsCol = collection(db, "settings");

  // Simple check to prevent basic duplicates - only seed if products or highlights are empty
  const pCheck = await getDocs(query(productsCol, limit(1)));
  const hCheck = await getDocs(query(highlightsCol, limit(1)));
  
  if (!pCheck.empty || !hCheck.empty) {
    console.log("Database already seeded");
    return;
  }

  for (const product of products) {
    await addDoc(productsCol, product);
  }

  for (const item of portfolio) {
    await addDoc(portfolioCol, item);
  }

  for (const h of homeHighlights) {
    await addDoc(highlightsCol, h);
  }

  const testimonials = [
    { name: "عبدالله العتيبي", role: "CEO TechFront", quote: "جودة الخشب لا توصف. القطعة التي طلبتها أصبحت حجر الزاوية في غرفة المعيشة." },
    { name: "سارة الجدوع", role: "Interior Designer", quote: "دقة التنفيذ في المعادن مذهلة. فريق IRON WOOD يفهم تماماً لغة التصميم الحديثة." },
    { name: "خالد المنصور", role: "Project Manager", quote: "التزام بالمواعيد وجودة عالمية. أنصح بهم بشدة لأي مشروع تجاري أو سكني فاخر." },
  ];
  for (const t of testimonials) {
    await addDoc(testimonialsCol, t);
  }

  await addDoc(settingsCol, {
    phone: "+20 100 000 0000",
    email: "info@ironwood.eg",
    address: "القاهرة، مصر",
    instagram: "https://instagram.com",
    facebook: "https://facebook.com",
    twitter: "https://twitter.com",
    aboutText: "تجارة وتصنيع الأثاث الخشبي والمعدني الفاخر. نجمع بين قوة المعدن وجمال الخشب لنصنع قطعاً فنية تدوم طويلاً.",
    heroSlideDuration: 6,
    heroTransition: "fade",
    enablePhoneVerification: true,
    navigationLinks: [
      { label: "الرئيسية", path: "/" },
      { label: "وصل حديثاً", path: "/new-arrivals" },
      { label: "المنتجات", path: "/products" },
      { label: "أعمالنا", path: "/portfolio" }
    ],
    footerLinks: [
      { label: "الرئيسية", url: "/" },
      { label: "منتجاتنا", url: "/products" },
      { label: "أعمالنا", url: "/portfolio" },
      { label: "حسابي", url: "/login" }
    ],
    privacyPolicyUrl: "#/privacy",
    termsUrl: "#/terms"
  });
}
