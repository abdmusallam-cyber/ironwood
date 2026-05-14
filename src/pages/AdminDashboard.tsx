import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, orderBy, limit, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { Product, Order, OperationType, ShippingRate, UserProfile } from "../types";
import { handleFirestoreError, cn } from "../lib/utils";
import { seedDatabase } from "../lib/seedData";
import { getHomeHighlights, getPortfolioItems, updateHomeHighlight, updatePortfolioItem, HomeHighlight, PortfolioItem, Testimonial, SiteSettings, getTestimonials, getSiteSettings, updateTestimonial, updateSiteSettings } from "../services/siteContent";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useTranslation } from "react-i18next";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Plus, 
  Trash2, 
  Edit, 
  TrendingUp, 
  Users,
  Box,
  Database,
  Lightbulb,
  Save,
  Search,
  X,
  Settings,
  Printer,
  FileText,
  Calendar,
  Clock,
  History,
  CheckCircle2,
  Filter,
  Image as ImageIcon,
  Truck,
  MapPin,
  CreditCard,
  DollarSign,
  Shield
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line 
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import html2pdf from "html2pdf.js";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "orders" | "marketing" | "content" | "shipping" | "users" | "security" | "site">("overview");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const { t } = useTranslation();
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editingRate, setEditingRate] = useState<Partial<ShippingRate> & { id?: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [highlights, setHighlights] = useState<HomeHighlight[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [siteSettings, setSiteSettings] = useState<(SiteSettings & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  
  // Advanced Order Management State
  const [orderSearch, setOrderSearch] = useState("");
  const [orderDateFilter, setOrderDateFilter] = useState("");
  const [orderStatusTab, setOrderStatusTab] = useState<"pending" | "active" | "shipped" | "completed">("pending");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const pSnap = await getDocs(query(collection(db, "products"), orderBy("createdAt", "desc")));
        const oSnap = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc")));
        const hSnap = await getHomeHighlights();
        const portSnap = await getPortfolioItems();
        const tSnap = await getTestimonials();
        const sSnap = await getSiteSettings();
        
        setProducts(pSnap.docs.map(d => ({ ...d.data(), id: d.id } as Product)));
        setOrders(oSnap.docs.map(d => ({ ...d.data(), id: d.id } as Order)));
        setHighlights(hSnap);
        setPortfolio(portSnap);
        setTestimonials(tSnap);
        setSiteSettings(sSnap);

        const rsSnap = await getDocs(collection(db, "shippingRates"));
        setShippingRates(rsSnap.docs.map(d => ({ ...d.data(), id: d.id } as any)));
        
        const uSnap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
        setUsers(uSnap.docs.map(d => ({ ...d.data(), id: d.id } as UserProfile)));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "dashboard/init");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab]);

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      setProducts(prev => prev.filter(p => p.id !== id));
      setSelectedProductIds(prev => prev.filter(pId => pId !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const handleBulkDeleteProducts = async () => {
    if (selectedProductIds.length === 0) return;
    if (!window.confirm(`هل أنت متأكد من حذف ${selectedProductIds.length} منتجات؟`)) return;
    
    try {
      setLoading(true);
      await Promise.all(
        selectedProductIds.map(id => deleteDoc(doc(db, "products", id)))
      );
      setProducts(prev => prev.filter(p => !selectedProductIds.includes(p.id)));
      setSelectedProductIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "products/bulk");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordStatus(null);

    if (!auth.currentUser || !auth.currentUser.email) {
      setPasswordStatus({ type: 'error', message: 'لم يتم العثور على مستخدم حالياً.' });
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'يرجى ملء جميع حقول كلمة المرور.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'كلمة المرور الجديدة غير متطابقة.' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' });
      return;
    }

    try {
      setPasswordUpdating(true);
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      setPasswordStatus({ type: 'success', message: 'تم تحديث كلمة المرور بنجاح.' });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error('Password update error:', error);
      setPasswordStatus({ type: 'error', message: error?.message || 'فشل تحديث كلمة المرور. تحقق من كلمة المرور الحالية.' });
    } finally {
      setPasswordUpdating(false);
    }
  };

  const toggleProductSelection = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const toggleSelectAllProducts = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      setIsSaving(true);
      // Remove id and createdAt from data to update
      const { id, createdAt, ...data } = editingProduct;
      
      // Clean undefined fields
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );

      if (id) {
        await updateDoc(doc(db, "products", id), {
          ...cleanData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, "products"), {
          ...cleanData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          rating: 5.0
        });
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
      // Re-fetch products
      const pSnap = await getDocs(query(collection(db, "products"), orderBy("createdAt", "desc")));
      setProducts(pSnap.docs.map(d => ({ ...d.data(), id: d.id } as Product)));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "products");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePortfolioItem = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا العمل؟")) return;
    try {
      await deleteDoc(doc(db, "portfolio", id));
      setPortfolio(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `portfolio/${id}`);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as Order['status'] } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus as Order['status'] });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Status filtering
      const isNewOrder = ["pending", "vodafone_cash", "instapay", "cod", "paid"].includes(o.status);
      const isProcessed = ["confirmed", "processing"].includes(o.status);
      const isShipped = o.status === "shipped";
      const isCompleted = o.status === "delivered";

      const matchesStatus = 
        (orderStatusTab === "pending" && isNewOrder) ||
        (orderStatusTab === "active" && isProcessed) ||
        (orderStatusTab === "shipped" && isShipped) ||
        (orderStatusTab === "completed" && isCompleted);

      if (!matchesStatus) return false;

      // Search filtering
      const searchLower = orderSearch.toLowerCase();
      const matchesSearch = 
        !orderSearch ||
        o.id.toLowerCase().includes(searchLower) ||
        o.shippingInfo?.name?.toLowerCase().includes(searchLower) ||
        o.shippingInfo?.phone?.includes(orderSearch) ||
        o.shippingInfo?.city?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Date filtering
      if (orderDateFilter) {
        const orderDate = new Date(o.createdAt?.seconds * 1000).toISOString().split('T')[0];
        if (orderDate !== orderDateFilter) return false;
      }

      return true;
    }).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }, [orders, orderStatusTab, orderSearch, orderDateFilter]);

  const handleDeleteTestimonial = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الرأي؟")) return;
    try {
      await deleteDoc(doc(db, "testimonials", id));
      setTestimonials(prev => prev.filter(t => t.id !== id));
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `testimonials/${id}`);
    }
  };

  const handleDeleteHighlight = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا القسم؟")) return;
    try {
      await deleteDoc(doc(db, "homeHighlights", id));
      setHighlights(prev => prev.filter(h => h.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `homeHighlights/${id}`);
    }
  };

  const handleUpdateHighlight = async (h: HomeHighlight) => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      await updateHomeHighlight(h);
      setSaveStatus({ type: 'success', message: 'تم تحديث بيانات الصفحة الرئيسية بنجاح' });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `homeHighlights/${h.id}`);
      setSaveStatus({ type: 'error', message: 'حدث خطأ أثناء التحديث' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmOrder = async (order: Order) => {
    try {
      await handleUpdateOrderStatus(order.id, 'confirmed');
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveShippingRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRate) return;
    try {
      setIsSaving(true);
      const { id, ...data } = editingRate;
      if (id) {
        await updateDoc(doc(db, "shippingRates", id), data);
      } else {
        await addDoc(collection(db, "shippingRates"), data);
      }
      setIsRateModalOpen(false);
      setEditingRate(null);
      const rsSnap = await getDocs(collection(db, "shippingRates"));
      setShippingRates(rsSnap.docs.map(d => ({ ...d.data(), id: d.id } as any)));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "shippingRates");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteShippingRate = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف سعر الشحن هذا؟")) return;
    try {
      await deleteDoc(doc(db, "shippingRates", id));
      setShippingRates(prev => prev.filter(r => (r as any).id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `shippingRates/${id}`);
    }
  };

  const totalSales = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (startDate || endDate) {
      const productDate = p.createdAt?.seconds ? new Date(p.createdAt.seconds * 1000) : null;
      if (!productDate) return false;
      
      if (startDate) {
        const start = new Date(startDate);
        if (productDate < start) return false;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (productDate > end) return false;
      }
    }
    
    return true;
  });

  const generatePDFReport = async () => {
    const element = document.getElementById('report-template');
    if (!element) {
      console.error("Report template element not found");
      return;
    }
    
    try {
      setLoading(true);
      
      // Temporary make it visible for the library to capture
      element.style.display = 'block';
      element.style.visibility = 'visible';
      element.style.position = 'static';
      element.style.left = '0';
      element.style.top = '0';
      
      // Wait for reflow and rendering
      await new Promise(r => setTimeout(r, 500));
      
      const opt: any = {
        margin: [10, 10],
        filename: `iron-wood-report-${new Date().getTime()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          letterRendering: true,
          logging: true
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().from(element).set(opt).save();
      
    } catch (error) {
      console.error("PDF Generation Detailed Error:", error);
      alert("عذراً، حدث خطأ أثناء إعداد التقرير. يرجى التأكد من استقرار الاتصال والمحاولة مرة أخرى.");
    } finally {
      // Restore hidden state
      element.style.display = 'none';
      element.style.visibility = 'hidden';
      element.style.position = 'fixed';
      element.style.left = '-9999px';
      setLoading(false);
    }
  };

  const chartData = [
    { name: "يناير", sales: 4000 },
    { name: "فبراير", sales: 3000 },
    { name: "مارس", sales: 2000 },
    { name: "أبريل", sales: 2780 },
    { name: "مايو", sales: 1890 },
  ];

  const sidebarItems = [
    { id: "overview", label: t('admin.overview'), icon: LayoutDashboard },
    { id: "products", label: t('admin.products'), icon: Package },
    { id: "orders", label: t('admin.orders'), icon: ShoppingCart },
    { id: "shipping", label: t('admin.shipping'), icon: Truck },
    { id: "users", label: t('admin.users'), icon: Users },
    { id: "site", label: t('admin.site'), icon: Box },
    { id: "security", label: t('admin.security'), icon: Shield },
    { id: "content", label: t('admin.content'), icon: Settings },
    { id: "marketing", label: t('admin.marketing'), icon: Lightbulb },
  ];

  const MarketingAdvisor = () => {
    const [advice, setAdvice] = useState<string>("");
    const [loadingAI, setLoadingAI] = useState(false);

    const getAdvice = async () => {
      try {
        setLoadingAI(true);
        const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
        const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(`بصفتك خبير تسويق لشركة IRON WOOD للأثاث الفاخر (خشب ومعدن)، اقترح 3 أفكار تسويقية مبتكرة لزيادة المبيعات للمنتجات التالية: ${products.map(p => p.title).join(", ")}. اجعل الاقتراحات باللغة العربية وبأسلوب احترافي وفاخر.`);
        const response = await result.response;
        setAdvice(response.text() || "");
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAI(false);
      }
    };

    return (
      <div className="bg-brand-surface p-12 border border-brand-border shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-brand-gold/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="flex items-center justify-between mb-12 relative z-10">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="p-4 bg-brand-iron border border-brand-border">
              <Lightbulb className="w-8 h-8 text-brand-gold animate-pulse" />
            </div>
            <div>
              <h3 className="font-serif text-3xl font-bold tracking-tight">مستشار التسويق الذكي</h3>
              <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted mt-1">AI-Powered Strategic Insights</p>
            </div>
          </div>
          <button 
            onClick={getAdvice}
            disabled={loadingAI}
            className="bg-brand-gold text-brand-iron px-10 py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white transition-all disabled:opacity-50 shadow-2xl"
          >
            {loadingAI ? "جاري التحليل..." : "توليد استراتيجية جديدة"}
          </button>
        </div>
        <div className="prose prose-invert max-w-none relative z-10">
          <div className="bg-brand-iron/40 p-10 border border-brand-border italic font-serif text-xl leading-loose text-brand-text/90 whitespace-pre-wrap">
            {advice || "انقر على الزر أعلاه للحصول على توصيات تسويقية مخصصة ومبتكرة تعتمد على مخزونك الحالي وتوجهات السوق الفاخر."}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-20 text-center animate-pulse">جاري التحميل...</div>;

  return (
    <div className="flex h-screen bg-brand-iron text-brand-text overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <aside className="w-72 bg-brand-surface border-l border-brand-border hidden lg:flex flex-col">
        <div className="p-8 border-b border-brand-border">
          <h2 className="font-serif text-2xl font-bold tracking-widest text-brand-gold">لوحة التحكم</h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted mt-2 font-bold italic">IRON WOOD ADMIN</p>
        </div>
        
        <nav className="flex-1 p-6 space-y-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center space-x-4 space-x-reverse px-6 py-4 text-[10px] font-bold uppercase tracking-widest transition-all border-l-2",
                activeTab === item.id 
                  ? "bg-brand-iron text-brand-gold border-brand-gold" 
                  : "text-brand-muted border-transparent hover:bg-brand-iron/50 hover:text-brand-text"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-brand-border bg-brand-iron/20">
          <div className="bg-brand-surface p-6 border border-brand-border shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1 h-full bg-brand-gold" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-brand-gold mb-3 flex items-center gap-2 font-bold italic">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              نظام المساعدة نشط
            </p>
            <p className="text-[10px] text-brand-muted italic leading-relaxed">
              3 عملاء ينتظرون الرد في المحادثة المباشرة حالياً.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-brand-iron">
        <header className="h-20 bg-brand-surface border-b border-brand-border flex items-center justify-between px-10">
          <h1 className="font-serif text-2xl font-bold tracking-tight">
            {sidebarItems.find(i => i.id === activeTab)?.label}
          </h1>
          <div className="flex items-center space-x-6 space-x-reverse">
            <button 
              onClick={async () => {
                await seedDatabase();
                window.location.reload();
              }}
              className="flex items-center space-x-3 space-x-reverse bg-brand-iron border border-brand-border hover:border-brand-gold px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-brand-gold transition-all shadow-xl"
            >
              <Database className="w-4 h-4" />
              <span>تهيئة البيانات</span>
            </button>
            <div className="h-8 w-px bg-brand-border" />
            <span className="text-xs text-brand-muted italic">أهلاً بك، <span className="text-brand-text font-bold uppercase tracking-widest text-[10px]">بدر</span></span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-12 bg-gradient-to-br from-brand-iron to-brand-surface">
          {activeTab === "overview" && (
            <div className="space-y-12">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                  { label: "إجمالي المبيعات", value: `${totalSales} ج.م`, icon: TrendingUp, color: "text-green-500" },
                  { label: "إجمالي الطلبات", value: orders.length, icon: ShoppingCart, color: "text-brand-gold" },
                  { label: "عدد المنتجات", value: products.length, icon: Box, color: "text-blue-500" },
                  { label: "الزوار النشطين", value: "128", icon: Users, color: "text-purple-500" },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-brand-surface p-8 border border-brand-border shadow-2xl group hover:border-brand-gold transition-colors"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-4 bg-brand-iron border border-brand-border group-hover:border-brand-gold transition-colors">
                        <stat.icon className={cn("w-6 h-6", stat.color)} />
                      </div>
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted mb-2 font-bold">{stat.label}</p>
                    <p className="text-3xl font-serif font-bold text-brand-text tracking-tight">{stat.value}</p>
                  </motion.div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-brand-surface p-10 border border-brand-border shadow-2xl">
                  <h3 className="font-serif text-2xl font-bold mb-10 flex items-center text-brand-gold">
                    <BarChart3 className="w-6 h-6 ml-3 text-brand-gold" />
                    تحليل المبيعات
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a1a1a" />
                        <XAxis dataKey="name" stroke="#808080" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#808080" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#0f0f0f", border: "1px solid #2a2a2a", borderRadius: "0" }}
                          itemStyle={{ color: "#d4af37", fontSize: "10px", textTransform: "uppercase" }}
                        />
                        <Bar dataKey="sales" fill="#d4af37" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-brand-surface p-10 border border-brand-border shadow-2xl">
                  <h3 className="font-serif text-2xl font-bold mb-10 flex items-center text-brand-gold">
                    <TrendingUp className="w-6 h-6 ml-3 text-brand-gold" />
                    نمو المشروع
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a1a1a" />
                        <XAxis dataKey="name" stroke="#808080" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#808080" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#0f0f0f", border: "1px solid #2a2a2a", borderRadius: "0" }}
                          itemStyle={{ color: "#d4af37", fontSize: "10px", textTransform: "uppercase" }}
                        />
                        <Line type="monotone" dataKey="sales" stroke="#d4af37" strokeWidth={3} dot={{ fill: "#d4af37", r: 4 }} activeDot={{ r: 6, stroke: "#fff" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "products" && (
            <div className="bg-brand-surface border border-brand-border shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-brand-border bg-brand-iron/20 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 w-full xl:w-auto">
                  <h3 className="font-serif text-2xl font-bold whitespace-nowrap">إدارة المخزون</h3>
                  <div className="flex flex-wrap items-center gap-4 w-full">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                      <input 
                        type="text"
                        placeholder="بحث عن منتج بالاسم أو التصنيف..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-brand-iron border border-brand-border px-12 py-3 text-[10px] font-bold uppercase tracking-widest text-brand-text outline-none focus:border-brand-gold transition-all"
                      />
                    </div>
                    <div className="flex items-center gap-2 bg-brand-iron border border-brand-border px-4 py-2">
                       <span className="text-[8px] font-bold uppercase tracking-widest text-brand-muted">من:</span>
                       <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent text-[10px] text-brand-text outline-none focus:text-brand-gold transition-all"
                       />
                    </div>
                    <div className="flex items-center gap-2 bg-brand-iron border border-brand-border px-4 py-2">
                       <span className="text-[8px] font-bold uppercase tracking-widest text-brand-muted">إلى:</span>
                       <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent text-[10px] text-brand-text outline-none focus:text-brand-gold transition-all"
                       />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                  <button 
                    onClick={generatePDFReport}
                    className="bg-brand-iron border border-brand-gold text-brand-gold px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-brand-gold hover:text-brand-iron transition-all shadow-xl flex items-center justify-center flex-1 md:flex-none"
                  >
                    <ImageIcon className="w-4 h-4 ml-3" />
                    تحميل تقرير PDF
                  </button>
                  {selectedProductIds.length > 0 && (
                    <button 
                      onClick={handleBulkDeleteProducts}
                      className="bg-red-900 text-white px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-red-800 transition-all shadow-xl flex items-center justify-center flex-1 md:flex-none"
                    >
                      <Trash2 className="w-4 h-4 ml-3" />
                      حذف المحدد ({selectedProductIds.length})
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setEditingProduct({ title: "", price: 0, stock: 0, category: "wood", description: "", imageUrl: "" } as Product);
                      setIsProductModalOpen(true);
                    }}
                    className="bg-brand-gold text-brand-iron px-8 py-3 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white transition-all shadow-xl flex items-center justify-center flex-1 md:flex-none"
                  >
                    <Plus className="w-4 h-4 ml-3" />
                    إضافة قطعة جديدة
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="bg-brand-iron border-b border-brand-border text-xs uppercase tracking-widest text-[#d4af37]">
                      <th className="px-8 py-5 w-10">
                        <input 
                          type="checkbox" 
                          checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                          onChange={toggleSelectAllProducts}
                          className="accent-brand-gold w-4 h-4 bg-brand-iron border-brand-border"
                        />
                      </th>
                      <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-brand-gold">المنتج</th>
                      <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-brand-gold">التصنيف</th>
                      <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-brand-gold">تاريخ الإضافة</th>
                      <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-brand-gold">السعر</th>
                      <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-brand-gold">المخزون</th>
                      <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-brand-gold text-left">العمليات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className={cn(
                        "hover:bg-brand-iron/40 transition-colors",
                        selectedProductIds.includes(p.id) && "bg-brand-gold/5"
                      )}>
                        <td className="px-8 py-6">
                           <input 
                            type="checkbox" 
                            checked={selectedProductIds.includes(p.id)}
                            onChange={() => toggleProductSelection(p.id)}
                            className="accent-brand-gold w-4 h-4 bg-brand-iron border-brand-border"
                          />
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center space-x-4 space-x-reverse">
                            <div className="w-14 h-14 bg-brand-iron border border-brand-border p-1 shadow-2xl overflow-hidden">
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt="" className="w-full h-full object-cover brightness-75 transition-all duration-500" />
                              ) : (
                                <div className="w-full h-full bg-brand-surface flex items-center justify-center">
                                  <ImageIcon className="w-4 h-4 text-brand-muted opacity-20" />
                                </div>
                              )}
                            </div>
                            <span className="font-bold text-brand-text tracking-tight">{p.title}</span>
                            {p.isNew && <span className="mr-2 bg-brand-gold text-brand-iron px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest leading-none">NEW</span>}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-brand-muted uppercase text-[10px] tracking-widest italic">{p.category}</td>
                        <td className="px-8 py-6 text-brand-muted text-[10px] tracking-widest">
                          {p.createdAt?.seconds ? new Date(p.createdAt.seconds * 1000).toLocaleDateString("ar-EG") : "غير متوفر"}
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            {p.discountPrice ? (
                              <>
                                <span className="font-serif font-bold text-brand-gold text-lg">{p.discountPrice} ج.م</span>
                                <span className="text-[10px] text-brand-muted line-through opacity-50">{p.price} ج.م</span>
                              </>
                            ) : (
                              <span className="font-serif font-bold text-brand-gold text-lg">{p.price} ج.م</span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={cn(
                            "px-3 py-1 text-[10px] font-bold uppercase tracking-widest border",
                            p.stock < 5 ? "border-red-900 bg-red-900/10 text-red-500" : "border-green-900 bg-green-900/10 text-green-500"
                          )}>
                            {p.stock} متوفر
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center space-x-3 space-x-reverse">
                            <button 
                              onClick={() => {
                                setEditingProduct(p);
                                setIsProductModalOpen(true);
                              }}
                              className="p-2 border border-brand-border hover:bg-brand-gold hover:text-brand-iron transition-all text-brand-muted shadow-xl"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-2 border border-brand-border hover:bg-red-900 hover:text-white transition-all text-brand-muted shadow-xl"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <div className="space-y-8">
              {/* Order Tabs & Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { id: "pending", label: "طلبات جديدة", icon: Clock, count: orders.filter(o => ["pending", "vodafone_cash", "instapay", "cod", "paid"].includes(o.status)).length },
                  { id: "active", label: "قيد التنفيذ", icon: History, count: orders.filter(o => ["confirmed", "processing"].includes(o.status)).length },
                  { id: "shipped", label: "تم الشحن", icon: Truck, count: orders.filter(o => o.status === "shipped").length },
                  { id: "completed", label: "تم الاستلام", icon: CheckCircle2, count: orders.filter(o => o.status === "delivered").length }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setOrderStatusTab(tab.id as any)}
                    className={cn(
                      "p-8 border shadow-xl transition-all duration-500 flex items-center justify-between group",
                      orderStatusTab === tab.id 
                        ? "bg-brand-surface border-brand-gold ring-1 ring-brand-gold/30" 
                        : "bg-brand-surface/50 border-brand-border hover:border-brand-gold/50"
                    )}
                  >
                    <div className="flex items-center gap-6">
                      <div className={cn(
                        "w-12 h-12 flex items-center justify-center border transition-colors",
                        orderStatusTab === tab.id ? "bg-brand-gold border-brand-gold text-brand-iron" : "border-brand-border bg-brand-iron text-brand-muted group-hover:text-brand-gold"
                      )}>
                        <tab.icon className="w-6 h-6" />
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-[10px] uppercase font-bold tracking-[0.2em] mb-1",
                          orderStatusTab === tab.id ? "text-brand-gold" : "text-brand-muted"
                        )}>{tab.label}</p>
                        <p className="text-3xl font-serif font-bold text-brand-text">{tab.count}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Filters Bar */}
              <div className="bg-brand-surface border border-brand-border p-6 shadow-2xl flex flex-col md:flex-row gap-6">
                <div className="relative flex-grow">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                  <input 
                    type="text" 
                    placeholder="بحث باسم العميل، الهاتف، أو رقم الطلب..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full bg-brand-iron border border-brand-border px-12 py-4 text-sm outline-none focus:border-brand-gold transition-colors"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                  <input 
                    type="date" 
                    value={orderDateFilter}
                    onChange={(e) => setOrderDateFilter(e.target.value)}
                    className="bg-brand-iron border border-brand-border pr-12 pl-4 py-4 text-sm outline-none focus:border-brand-gold transition-colors text-brand-text"
                  />
                </div>
                <button 
                  onClick={() => {
                    setOrderSearch("");
                    setOrderDateFilter("");
                  }}
                  className="px-6 py-4 border border-brand-border text-brand-muted hover:text-brand-gold transition-all flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-bold tracking-widest">إعادة تعيين</span>
                </button>
              </div>

              {/* Orders Table */}
              <div className="bg-brand-surface border border-brand-border shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead>
                      <tr className="bg-brand-iron border-b border-brand-border text-[10px] uppercase tracking-widest text-[#d4af37]">
                        <th className="px-8 py-5">رقم الطلب</th>
                        <th className="px-8 py-5">العميل والتواصل</th>
                        <th className="px-8 py-5">المدينة والعنوان</th>
                        <th className="px-8 py-5">المنتجات</th>
                        <th className="px-8 py-5">الإجمالي</th>
                        <th className="px-8 py-5">الحالة</th>
                        <th className="px-8 py-5 text-left">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {filteredOrders.length > 0 ? filteredOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-brand-iron/40 transition-colors">
                          <td className="px-8 py-6 font-mono text-[10px] uppercase text-brand-muted italic">#ID-{o.id.slice(0, 8)}</td>
                          <td className="px-8 py-6">
                             <div className="flex flex-col">
                                <span className="font-bold text-brand-text">{o.shippingInfo?.name || "عميل مجهول"}</span>
                                <span className="text-[10px] text-brand-muted mt-1 font-mono">{o.shippingInfo?.phone}</span>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex flex-col">
                                <span className="text-xs text-brand-text font-bold">{o.shippingInfo?.governorate || o.shippingInfo?.city}</span>
                                <span className="text-xs text-brand-muted">{o.shippingInfo?.city}</span>
                                <span className="text-[10px] text-brand-muted mt-1 truncate max-w-[150px] italic">{o.shippingInfo?.address}</span>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-2">
                                {o.items.slice(0, 2).map((item, idx) => (
                                  <div key={idx} className="w-8 h-8 border border-brand-border p-0.5 bg-brand-iron">
                                     <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                                  </div>
                                ))}
                                {o.items.length > 2 && (
                                  <span className="text-[10px] text-brand-muted">+{o.items.length - 2}</span>
                                )}
                             </div>
                          </td>
                          <td className="px-8 py-6 font-serif font-bold text-brand-gold text-lg">{o.total} ج.م</td>
                          <td className="px-8 py-6">
                            <select 
                              value={o.status}
                              onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                              className={cn(
                                "px-3 py-1 text-[10px] font-bold uppercase tracking-widest border bg-brand-iron outline-none cursor-pointer min-w-[150px]",
                                o.status === "paid" ? "border-green-900 text-green-500" : 
                                o.status === "confirmed" ? "border-brand-gold text-brand-gold" :
                                o.status === "shipped" ? "border-blue-900 text-blue-500" :
                                o.status === "vodafone_cash" ? "border-red-900 text-red-500" :
                                o.status === "instapay" ? "border-purple-900 text-purple-500" :
                                o.status === "cod" ? "border-yellow-900 text-yellow-500" :
                                o.status === "delivered" ? "border-green-600 text-green-600" :
                                "border-gray-900 text-gray-500"
                              )}
                            >
                              <option value="pending">طلب جديد</option>
                              <option value="vodafone_cash">فودافون كاش</option>
                              <option value="instapay">انستا باي</option>
                              <option value="cod">دفع عند الشحن</option>
                              <option value="confirmed">تم التأكيد</option>
                              <option value="shipped">تم الشحن</option>
                              <option value="delivered">تم الاستلام</option>
                            </select>
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-2">
                               {o.status === 'pending' && (
                                 <button 
                                   onClick={async () => {
                                      await handleUpdateOrderStatus(o.id, 'confirmed');
                                   }}
                                   className="bg-brand-gold text-brand-iron px-3 py-1 text-[8px] font-bold uppercase tracking-widest hover:bg-white transition-all shadow-xl"
                                 >
                                   تأكيد الطلب
                                 </button>
                               )}
                               <button 
                                 onClick={() => {
                                   setSelectedOrder(o);
                                   setIsOrderModalOpen(true);
                                 }}
                                 className="p-2 border border-brand-border text-brand-muted hover:text-brand-gold hover:border-brand-gold transition-all"
                                 title="عرض التفاصيل"
                                >
                                 <FileText className="w-4 h-4" />
                               </button>
                               <button 
                                 onClick={() => {
                                   setSelectedOrder(o);
                                   setIsInvoiceModalOpen(true);
                                 }}
                                 className="p-2 border border-brand-border text-brand-muted hover:text-brand-gold hover:border-brand-gold transition-all"
                                 title="طباعة تقرير / فاتورة"
                               >
                                 <Printer className="w-4 h-4" />
                               </button>
                             </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={7} className="py-32 text-center">
                             <div className="opacity-30">
                               <Box className="w-20 h-20 text-brand-gold mx-auto mb-6" />
                               <p className="font-serif text-2xl italic text-brand-muted">لا توجد طلبات في هذا القسم حالياً</p>
                             </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "shipping" && (
            <div className="space-y-12">
              <div className="bg-brand-surface border border-brand-border shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-brand-border bg-brand-iron/20 flex justify-between items-center text-right">
                  <div>
                    <h3 className="font-serif text-2xl font-bold italic tracking-tight">إدارة تكاليف الشحن</h3>
                    <p className="text-[10px] uppercase tracking-widest text-brand-muted mt-1">Shipping Rates by Governorate</p>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingRate({ governorate: "", rate: 0 });
                      setIsRateModalOpen(true);
                    }}
                    className="bg-brand-gold text-brand-iron px-8 py-3 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white transition-all shadow-xl flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4 ml-3" />
                    إضافة سعر شحن
                  </button>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {shippingRates.map((rs: any) => (
                      <div key={rs.id} className="p-6 border border-brand-border bg-brand-iron/5 space-y-4 hover:border-brand-gold transition-all group">
                         <div className="flex justify-between items-start">
                            <div className="w-10 h-10 bg-brand-iron border border-brand-border flex items-center justify-center text-brand-gold">
                               <Truck className="w-5 h-5" />
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button 
                                onClick={() => {
                                  setEditingRate(rs);
                                  setIsRateModalOpen(true);
                                }}
                                className="p-2 text-brand-muted hover:text-brand-gold"
                               >
                                 <Edit className="w-4 h-4" />
                               </button>
                               <button 
                                onClick={() => handleDeleteShippingRate(rs.id)}
                                className="p-2 text-brand-muted hover:text-red-500"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                            </div>
                         </div>
                         <div>
                            <h4 className="text-xl font-bold text-brand-text">{rs.governorate}</h4>
                            <p className="text-2xl font-serif text-brand-gold mt-2 font-bold">{rs.rate} ج.م</p>
                         </div>
                      </div>
                    ))}
                    {shippingRates.length === 0 && (
                      <div className="col-span-full py-20 text-center text-brand-muted italic">
                        لا توجد أسعار شحن مضافة حتى الآن. ابدأ بإضافة أسعار للمحافظات.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "marketing" && (
            <MarketingAdvisor />
          )}

          {activeTab === "users" && (
            <div className="bg-brand-surface border border-brand-border shadow-2xl overflow-hidden">
               <div className="p-8 border-b border-brand-border bg-brand-iron/20 flex justify-between items-center">
                  <div>
                    <h3 className="font-serif text-2xl font-bold italic tracking-tight">إدارة مستخدمي النادي</h3>
                    <p className="text-[10px] uppercase tracking-widest text-brand-muted mt-1">Member Access & Permissions</p>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="bg-brand-iron border border-brand-border px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-brand-gold">
                        إجمالي الأعضاء: {users.length}
                     </div>
                  </div>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-right text-sm">
                   <thead>
                     <tr className="bg-brand-iron border-b border-brand-border text-[10px] uppercase tracking-widest text-brand-gold">
                       <th className="px-8 py-5">المستخدم</th>
                       <th className="px-8 py-5">البريد الإلكتروني</th>
                       <th className="px-8 py-5">رقم الهاتف</th>
                       <th className="px-8 py-5">المكان</th>
                       <th className="px-8 py-5">تاريخ الانضمام</th>
                       <th className="px-8 py-5">الرتبة</th>
                       <th className="px-8 py-5 text-left">الإجراءات</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-brand-border">
                     {users.map((u) => (
                       <tr key={u.id} className="hover:bg-brand-iron/40 transition-colors">
                         <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-brand-iron border border-brand-border flex items-center justify-center text-brand-gold font-bold">
                                  {u.displayName?.substring(0, 1).toUpperCase() || "?"}
                               </div>
                               <span className="font-bold text-brand-text">{u.displayName}</span>
                            </div>
                         </td>
                         <td className="px-8 py-6 font-mono text-xs text-brand-muted">{u.email || "—"}</td>
                         <td className="px-8 py-6 font-mono text-xs text-brand-muted">{u.phoneNumber || "—"}</td>
                         <td className="px-8 py-6 text-xs text-brand-muted italic max-w-[200px] truncate" title={u.address}>
                            {u.city ? `${u.city} - ${u.address}` : "—"}
                         </td>
                         <td className="px-8 py-6 text-[10px] text-brand-muted uppercase tracking-widest italic">
                           {u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000).toLocaleDateString("ar-EG") : "—"}
                         </td>
                         <td className="px-8 py-6">
                           <span className={cn(
                             "px-3 py-1 text-[8px] font-bold uppercase tracking-[0.2em] border",
                             u.role === 'admin' ? "border-brand-gold bg-brand-gold/10 text-brand-gold" : "border-brand-border text-brand-muted"
                           )}>
                             {u.role === 'admin' ? "المشرف العام" : "عضو النادي"}
                           </span>
                         </td>
                         <td className="px-8 py-6">
                            <div className="flex items-center gap-2">
                               <button 
                                 onClick={async () => {
                                   if (!window.confirm(`هل أنت متأكد من تغيير رتبة ${u.displayName}؟`)) return;
                                   const newRole = u.role === 'admin' ? 'user' : 'admin';
                                   await updateDoc(doc(db, "users", u.id), { role: newRole });
                                   setUsers(prev => prev.map(user => user.id === u.id ? { ...user, role: newRole } : user));
                                 }}
                                 className="p-2 border border-brand-border text-brand-muted hover:text-brand-gold hover:border-brand-gold transition-all"
                                 title="تغيير الرتبة (Admin/User)"
                               >
                                 <Shield className="w-4 h-4" />
                               </button>
                            </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === "site" && siteSettings && (
            <div className="space-y-12 pb-20">
              <div className="bg-brand-surface border border-brand-border shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-brand-border bg-brand-iron/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h3 className="font-serif text-2xl font-bold italic tracking-tight">{t('admin.siteStructure')}</h3>
                    <p className="text-[10px] uppercase tracking-widest text-brand-muted mt-1">{t('admin.siteDescription')}</p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        setIsSaving(true);
                        await updateSiteSettings(siteSettings.id, siteSettings);
                        setSaveStatus({ type: 'success', message: t('admin.success') });
                        setTimeout(() => setSaveStatus(null), 3000);
                      } catch (error) {
                        setSaveStatus({ type: 'error', message: t('admin.error') });
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    disabled={isSaving}
                    className="bg-brand-gold text-brand-iron px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white transition-all shadow-xl disabled:opacity-50"
                  >
                    {isSaving ? t('admin.saving') : t('admin.saveSiteSettings')}
                  </button>
                </div>

                <div className="p-12 space-y-12">
                  <div className="space-y-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                      <div>
                        <h4 className="font-bold text-lg text-brand-text">{t('admin.navLinks')}</h4>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted mt-1">{t('admin.navLinksDesc')}</p>
                      </div>
                      <button
                        onClick={() => setSiteSettings({
                          ...siteSettings,
                          navigationLinks: [
                            ...(siteSettings.navigationLinks || []),
                            { label: 'رابط جديد', path: '/' }
                          ]
                        })}
                        className="bg-brand-iron border border-brand-border text-brand-gold px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] hover:border-brand-gold transition-all"
                      >{t('admin.addLink')}</button>
                    </div>

                    <div className="space-y-4">
                      {(siteSettings.navigationLinks || []).map((link, index) => (
                        <div key={`${link.label}-${index}`} className="grid grid-cols-12 gap-4 items-center">
                          <input
                            value={link.label}
                            onChange={(e) => {
                              const next = [...(siteSettings.navigationLinks || [])];
                              next[index] = { ...next[index], label: e.target.value };
                              setSiteSettings({ ...siteSettings, navigationLinks: next });
                            }}
                            className="col-span-5 bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold"
                            placeholder="نص الرابط"
                          />
                          <input
                            value={link.path}
                            onChange={(e) => {
                              const next = [...(siteSettings.navigationLinks || [])];
                              next[index] = { ...next[index], path: e.target.value };
                              setSiteSettings({ ...siteSettings, navigationLinks: next });
                            }}
                            className="col-span-5 bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold"
                            placeholder="الرابط /path"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...(siteSettings.navigationLinks || [])];
                              next.splice(index, 1);
                              setSiteSettings({ ...siteSettings, navigationLinks: next });
                            }}
                            className="col-span-2 bg-red-900 text-white p-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-red-800 transition-all"
                          >حذف</button>
                        </div>
                      ))}
                      {(siteSettings.navigationLinks || []).length === 0 && (
                        <p className="text-sm text-brand-muted">{t('admin.noLinks')}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                      <div>
                        <h4 className="font-bold text-lg text-brand-text">{t('admin.footerLinks')}</h4>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted mt-1">{t('admin.footerLinksDesc')}</p>
                      </div>
                      <button
                        onClick={() => setSiteSettings({
                          ...siteSettings,
                          footerLinks: [
                            ...(siteSettings.footerLinks || []),
                            { label: 'رابط جديد', url: '/' }
                          ]
                        })}
                        className="bg-brand-iron border border-brand-border text-brand-gold px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] hover:border-brand-gold transition-all"
                      >{t('admin.addLink')}</button>
                    </div>

                    <div className="space-y-4">
                      {(siteSettings.footerLinks || []).map((link, index) => (
                        <div key={`${link.label}-${index}`} className="grid grid-cols-12 gap-4 items-center">
                          <input
                            value={link.label}
                            onChange={(e) => {
                              const next = [...(siteSettings.footerLinks || [])];
                              next[index] = { ...next[index], label: e.target.value };
                              setSiteSettings({ ...siteSettings, footerLinks: next });
                            }}
                            className="col-span-5 bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold"
                            placeholder="نص الرابط"
                          />
                          <input
                            value={link.url}
                            onChange={(e) => {
                              const next = [...(siteSettings.footerLinks || [])];
                              next[index] = { ...next[index], url: e.target.value };
                              setSiteSettings({ ...siteSettings, footerLinks: next });
                            }}
                            className="col-span-5 bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold"
                            placeholder="الرابط /url"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...(siteSettings.footerLinks || [])];
                              next.splice(index, 1);
                              setSiteSettings({ ...siteSettings, footerLinks: next });
                            }}
                            className="col-span-2 bg-red-900 text-white p-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-red-800 transition-all"
                          >حذف</button>
                        </div>
                      ))}
                      {(siteSettings.footerLinks || []).length === 0 && (
                        <p className="text-sm text-brand-muted">{t('admin.noLinks')}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold">{t('admin.privacyUrl')}</label>
                      <input
                        type="text"
                        value={siteSettings.privacyPolicyUrl || ""}
                        onChange={(e) => setSiteSettings({ ...siteSettings, privacyPolicyUrl: e.target.value })}
                        className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold">{t('admin.termsUrl')}</label>
                      <input
                        type="text"
                        value={siteSettings.termsUrl || ""}
                        onChange={(e) => setSiteSettings({ ...siteSettings, termsUrl: e.target.value })}
                        className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="bg-brand-surface border border-brand-border shadow-2xl p-10 space-y-8">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                  <h3 className="font-serif text-2xl font-bold italic tracking-tight">الأمان وتغيير كلمة المرور</h3>
                  <p className="text-[10px] uppercase tracking-widest text-brand-muted mt-1">تحكم في حسابك من داخل لوحة التحكم.</p>
                </div>
                <div className="rounded-full border border-brand-border px-4 py-2 text-[10px] uppercase tracking-widest text-brand-gold">
                  بريدك المسجل: {auth.currentUser?.email || "غير متوفر"}
                </div>
              </div>

              <form onSubmit={handleUpdatePassword} className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-2 lg:col-span-3">
                  <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold">كلمة المرور الحالية</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold"
                    placeholder="أدخل كلمة المرور الحالية"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold"
                    placeholder="كلمة المرور الجديدة"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold">تأكيد كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold"
                    placeholder="أعد إدخال كلمة المرور"
                  />
                </div>

                <div className="lg:col-span-3 flex flex-col gap-4">
                  {passwordStatus && (
                    <div className={cn(
                      "p-4 border text-sm",
                      passwordStatus.type === 'success' ? "border-green-900 bg-green-900/10 text-green-500" : "border-red-900 bg-red-900/10 text-red-500"
                    )}>
                      {passwordStatus.message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={passwordUpdating}
                    className="w-full bg-brand-gold text-brand-iron font-bold uppercase tracking-[0.2em] py-4 hover:bg-white transition-all disabled:opacity-50"
                  >
                    {passwordUpdating ? "جاري التحديث..." : "تحديث كلمة المرور"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "content" && (
            <div className="space-y-12 pb-20">
              {/* Home Highlights Management */}
              <div className="bg-brand-surface border border-brand-border shadow-2xl">
                <div className="p-8 border-b border-brand-border bg-brand-iron/20 flex justify-between items-center">
                  <div>
                    <h3 className="font-serif text-2xl font-bold italic tracking-tight">إدارة الصفحة الرئيسية</h3>
                    <p className="text-[10px] uppercase tracking-widest text-brand-muted mt-1">Highlighted Collections & Features</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {saveStatus && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "px-4 py-2 text-[10px] font-bold uppercase tracking-widest border",
                          saveStatus.type === 'success' ? "border-green-900 bg-green-900/10 text-green-500" : "border-red-900 bg-red-900/10 text-red-500"
                        )}
                      >
                        {saveStatus.message}
                      </motion.div>
                    )}
                    <button 
                      onClick={() => {
                        const newH = { id: `high-${Date.now()}`, title: "عنوان جديد", description: "وصف جديد...", category: "COLLECTION 2026", imageUrl: "" };
                        setHighlights([...highlights, newH]);
                      }}
                      className="bg-brand-iron border border-brand-border text-brand-gold px-6 py-2 text-[10px] font-bold uppercase tracking-widest hover:border-brand-gold transition-all"
                    >
                      إضافة قسم Hero
                    </button>
                  </div>
                </div>
                <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                  {highlights.map((h, index) => (
                    <div key={h.id} className="p-8 border border-brand-border bg-brand-surface space-y-6 group hover:border-brand-gold transition-all relative">
                      <div className="absolute top-4 left-4 z-20 flex gap-2">
                        {index !== 0 && (
                          <button 
                            onClick={() => handleUpdateHighlight({ ...h, createdAt: serverTimestamp() })}
                            className="p-2 bg-brand-gold/10 border border-brand-gold/30 text-brand-gold opacity-60 hover:opacity-100 transition-opacity hover:bg-brand-gold hover:text-brand-iron"
                            title="تعيين كواجهة أساسية (Hero)"
                          >
                            <TrendingUp className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteHighlight(h.id)}
                          className="p-2 bg-red-900/10 border border-red-900/30 text-red-500 opacity-60 hover:opacity-100 transition-opacity hover:bg-red-900 hover:text-white"
                          title="حذف هذا القسم"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {index === 0 && (
                        <div className="absolute top-4 right-4 z-20 bg-brand-gold text-brand-iron px-3 py-1 text-[8px] font-bold uppercase tracking-widest shadow-xl">
                          Hero Active
                        </div>
                      )}
                      <div className="aspect-video bg-brand-iron border border-brand-border overflow-hidden relative">
                        {h.imageUrl ? (
                          <img src={h.imageUrl} alt="" className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-all duration-700" />
                        ) : (
                          <div className="w-full h-full bg-brand-iron/50 flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-brand-muted opacity-20" />
                          </div>
                        )}
                        <div className="absolute bottom-4 right-4 bg-brand-iron/80 backdrop-blur px-3 py-1 text-[8px] font-mono border border-brand-border text-brand-gold">
                          PREVIEW
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold opacity-60 italic">النص العلوي (الذهبي)</label>
                          <input 
                            type="text" 
                            value={h.category} 
                            onChange={(e) => {
                              const newHighlights = highlights.map(item => item.id === h.id ? { ...item, category: e.target.value } : item);
                              setHighlights(newHighlights);
                            }}
                            className="w-full bg-brand-iron border border-brand-border p-4 text-xs text-brand-text outline-none focus:border-brand-gold"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold opacity-60 italic">العنوان الرئيسي</label>
                          <input 
                            type="text" 
                            value={h.title} 
                            onChange={(e) => {
                              const newHighlights = highlights.map(item => item.id === h.id ? { ...item, title: e.target.value } : item);
                              setHighlights(newHighlights);
                            }}
                            className="w-full bg-transparent border-b border-brand-border focus:border-brand-gold py-2 text-xl font-serif text-brand-text outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold opacity-60 italic">الوصف</label>
                          <textarea 
                            value={h.description}
                            onChange={(e) => {
                              const newHighlights = highlights.map(item => item.id === h.id ? { ...item, description: e.target.value } : item);
                              setHighlights(newHighlights);
                            }}
                            rows={3}
                            className="w-full bg-transparent border border-brand-border focus:border-brand-gold p-4 text-xs text-brand-muted outline-none italic h-32"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold opacity-60 italic">رابط خلفية الـ Hero (URL)</label>
                          <input 
                            type="text" 
                            value={h.imageUrl} 
                            onChange={(e) => {
                              const newHighlights = highlights.map(item => item.id === h.id ? { ...item, imageUrl: e.target.value } : item);
                              setHighlights(newHighlights);
                            }}
                            className="w-full bg-brand-iron border border-brand-border p-4 text-[10px] font-mono text-brand-muted outline-none focus:border-brand-gold"
                          />
                        </div>
                        <button 
                          onClick={() => handleUpdateHighlight(h)}
                          disabled={isSaving}
                          className="w-full bg-brand-gold text-brand-iron py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-all shadow-xl flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                          <span>{isSaving ? "جاري الحفظ..." : "حفظ التعديلات ونشرها"}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Portfolio Management */}
              <div className="bg-brand-surface border border-brand-border shadow-2xl">
                <div className="p-8 border-b border-brand-border bg-brand-iron/20 flex justify-between items-center">
                  <div>
                    <h3 className="font-serif text-2xl font-bold italic tracking-tight">إدارة أعمالنا (Portfolio)</h3>
                    <p className="text-[10px] uppercase tracking-widest text-brand-muted mt-1">Previous Custom Projects & Signature Pieces</p>
                  </div>
                  <button 
                    onClick={() => {
                        const newItem = { id: `port-${Date.now()}`, title: "مشروع جديد", year: "2024", category: "سكنية", imageUrl: "", description: "" };
                        setPortfolio([newItem, ...portfolio]);
                    }}
                    className="bg-brand-iron border border-brand-border text-brand-gold px-6 py-2 text-[10px] font-bold uppercase tracking-widest hover:border-brand-gold transition-all"
                  >
                    إضافة مشروع
                  </button>
                </div>
                <div className="p-10 divide-y divide-brand-border">
                  {portfolio.map((item) => (
                    <div key={item.id} className="py-8 flex flex-col md:flex-row gap-10 group">
                      <div className="w-full md:w-64 aspect-square bg-brand-iron border border-brand-border overflow-hidden">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-all duration-700" />
                        ) : (
                          <div className="w-full h-full bg-brand-iron flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-brand-muted opacity-10" />
                          </div>
                        )}
                      </div>
                      <div className="flex-grow space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-brand-muted font-bold italic opacity-60">اسم المشروع</label>
                            <input 
                              type="text" 
                              value={item.title} 
                              onChange={(e) => {
                                const newPort = portfolio.map(p => p.id === item.id ? { ...p, title: e.target.value } : p);
                                setPortfolio(newPort);
                              }}
                              className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold transition-colors"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-brand-muted font-bold italic opacity-60">السنة / التصنيف</label>
                            <div className="flex gap-4">
                              <input 
                                type="text" 
                                value={item.year} 
                                onChange={(e) => {
                                  const newPort = portfolio.map(p => p.id === item.id ? { ...p, year: e.target.value } : p);
                                  setPortfolio(newPort);
                                }}
                                className="w-1/3 bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold transition-colors"
                              />
                              <input 
                                type="text" 
                                value={item.category} 
                                onChange={(e) => {
                                  const newPort = portfolio.map(p => p.id === item.id ? { ...p, category: e.target.value } : p);
                                  setPortfolio(newPort);
                                }}
                                className="w-2/3 bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold transition-colors"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-brand-muted font-bold italic opacity-60">رابط الصورة (URL)</label>
                            <input 
                              type="text" 
                              value={item.imageUrl} 
                              onChange={(e) => {
                                const newPort = portfolio.map(p => p.id === item.id ? { ...p, imageUrl: e.target.value } : p);
                                setPortfolio(newPort);
                              }}
                              className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold transition-colors font-mono text-xs"
                            />
                        </div>
                        <div className="flex gap-6">
                            <button 
                              onClick={() => updatePortfolioItem(item)}
                              className="bg-brand-gold text-brand-iron px-10 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-all shadow-xl"
                            >
                              تحديث البيانات
                            </button>
                            <button 
                              onClick={() => handleDeletePortfolioItem(item.id)}
                              className="text-red-500 hover:text-white hover:bg-red-900 border border-transparent hover:border-red-900 px-6 py-3 transition-all text-[10px] font-bold"
                            >
                              إزالة المشروع
                            </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Testimonials Management */}
              <div className="bg-brand-surface border border-brand-border shadow-2xl">
                <div className="p-8 border-b border-brand-border bg-brand-iron/20 flex justify-between items-center">
                  <div>
                    <h3 className="font-serif text-2xl font-bold italic tracking-tight">شهادات العملاء</h3>
                    <p className="text-[10px] uppercase tracking-widest text-brand-muted mt-1">Client Voice & Trusted Testimonials</p>
                  </div>
                  <button 
                    onClick={() => {
                        const newT = { id: `test-${Date.now()}`, name: "عميل جديد", role: "منصب العميل", quote: "أدخل رأي العميل هنا..." };
                        setTestimonials([newT, ...testimonials]);
                    }}
                    className="bg-brand-iron border border-brand-border text-brand-gold px-6 py-2 text-[10px] font-bold uppercase tracking-widest hover:border-brand-gold transition-all"
                  >
                    إضافة شهادة
                  </button>
                </div>
                <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {testimonials.map((t) => (
                    <div key={t.id} className="p-8 border border-brand-border bg-brand-iron/5 space-y-6 relative group">
                       <textarea 
                          value={t.quote}
                          onChange={(e) => {
                            const newTests = testimonials.map(item => item.id === t.id ? { ...item, quote: e.target.value } : item);
                            setTestimonials(newTests);
                          }}
                          rows={4}
                          className="w-full bg-transparent border border-brand-border focus:border-brand-gold p-4 text-xs text-brand-muted outline-none italic leading-loose"
                        />
                        <div className="space-y-4">
                          <input 
                            type="text" 
                            value={t.name}
                            placeholder="الاسم"
                            onChange={(e) => {
                              const newTests = testimonials.map(item => item.id === t.id ? { ...item, name: e.target.value } : item);
                              setTestimonials(newTests);
                            }}
                            className="w-full bg-transparent border-b border-brand-border focus:border-brand-gold py-2 text-sm font-bold text-brand-gold outline-none"
                          />
                          <input 
                            type="text" 
                            value={t.role}
                            placeholder="المنصب"
                            onChange={(e) => {
                              const newTests = testimonials.map(item => item.id === t.id ? { ...item, role: e.target.value } : item);
                              setTestimonials(newTests);
                            }}
                            className="w-full bg-transparent border-b border-brand-border focus:border-brand-gold py-2 text-[10px] uppercase tracking-widest text-brand-muted outline-none italic"
                          />
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-brand-border opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => updateTestimonial(t)}
                            className="text-brand-gold hover:text-white transition-colors"
                          >
                            <Save className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteTestimonial(t.id)}
                            className="text-red-900 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Site Settings */}
              {siteSettings && (
                <div className="bg-brand-surface border border-brand-border shadow-2xl overflow-hidden">
                  <div className="p-8 border-b border-brand-border bg-brand-gold text-brand-iron">
                    <h3 className="font-serif text-2xl font-bold italic tracking-tight">إحداثيات المنصة ووسائل التواصل</h3>
                    <p className="text-[10px] uppercase tracking-widest opacity-80 mt-1 font-bold">Global Site Configuration & Social Presence</p>
                  </div>
                  <div className="p-12 space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-8">
                        <h4 className="text-[10px] uppercase tracking-[0.3em] text-brand-gold font-bold border-b border-brand-border pb-4">معلومات الاتصال الأساسية</h4>
                        <div className="space-y-6">
                           <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-brand-muted font-bold opacity-60">رقم الهاتف الرسمي</label>
                            <input 
                              type="text" 
                              value={siteSettings.phone} 
                              onChange={(e) => setSiteSettings({ ...siteSettings, phone: e.target.value })}
                              className="w-full bg-brand-iron border border-brand-border p-5 text-xl font-mono text-brand-text outline-none focus:border-brand-gold transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-brand-muted font-bold opacity-60">البريد الإلكتروني للعمليات</label>
                            <input 
                              type="email" 
                              value={siteSettings.email} 
                              onChange={(e) => setSiteSettings({ ...siteSettings, email: e.target.value })}
                              className="w-full bg-brand-iron border border-brand-border p-5 text-lg font-mono text-brand-text outline-none focus:border-brand-gold transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-brand-muted font-bold opacity-60">العنوان الفيزيائي / صالة العرض</label>
                            <input 
                              type="text" 
                              value={siteSettings.address} 
                              onChange={(e) => setSiteSettings({ ...siteSettings, address: e.target.value })}
                              className="w-full bg-brand-iron border border-brand-border p-5 text-brand-text outline-none focus:border-brand-gold transition-all"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-8">
                        <h4 className="text-[10px] uppercase tracking-[0.3em] text-brand-gold font-bold border-b border-brand-border pb-4">بيانات الدفع الإلكتروني</h4>
                        <div className="space-y-6">
                           <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-brand-muted font-bold opacity-60">رقم فودافون كاش</label>
                            <input 
                              type="text" 
                              value={siteSettings.vodafoneCashNumber || ""} 
                              onChange={(e) => setSiteSettings({ ...siteSettings, vodafoneCashNumber: e.target.value })}
                              className="w-full bg-brand-iron border border-brand-border p-5 text-lg font-mono text-brand-text outline-none focus:border-brand-gold transition-all"
                              placeholder="010XXXXXXXX"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-brand-muted font-bold opacity-60">عنوان انستا باي (VPA)</label>
                            <input 
                              type="text" 
                              value={siteSettings.instapayVpa || ""} 
                              onChange={(e) => setSiteSettings({ ...siteSettings, instapayVpa: e.target.value })}
                              className="w-full bg-brand-iron border border-brand-border p-5 text-lg font-mono text-brand-text outline-none focus:border-brand-gold transition-all"
                              placeholder="example@instapay"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-8">
                        <h4 className="text-[10px] uppercase tracking-[0.3em] text-brand-gold font-bold border-b border-brand-border pb-4">رسالة نجاح الطلب</h4>
                        <div className="space-y-6">
                           <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-brand-muted font-bold opacity-60">عنوان الرسالة</label>
                            <input 
                              type="text" 
                              value={siteSettings.successTitle || ""} 
                              onChange={(e) => setSiteSettings({ ...siteSettings, successTitle: e.target.value })}
                              className="w-full bg-brand-iron border border-brand-border p-5 text-xl font-bold text-brand-text outline-none focus:border-brand-gold transition-all"
                              placeholder="تم طلبك بنجاح!"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-brand-muted font-bold opacity-60">نص الرسالة</label>
                            <textarea 
                              rows={3}
                              value={siteSettings.successMessage || ""} 
                              onChange={(e) => setSiteSettings({ ...siteSettings, successMessage: e.target.value })}
                              className="w-full bg-brand-iron border border-brand-border p-5 text-brand-text outline-none focus:border-brand-gold transition-all resize-none"
                              placeholder="شكراً لثقتك في IRON WOOD. لقد بدأنا العمل على تجهيز طلبك وسيصلك قريباً."
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-brand-muted font-bold opacity-60">سرعة عرض شرائح الهيرو (بالثواني)</label>
                            <input
                              type="number"
                              min={3}
                              value={siteSettings.heroSlideDuration ?? 6}
                              onChange={(e) => setSiteSettings({ ...siteSettings, heroSlideDuration: Number(e.target.value) })}
                              className="w-full bg-brand-iron border border-brand-border p-5 text-lg font-mono text-brand-text outline-none focus:border-brand-gold transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-brand-muted font-bold opacity-60">حركة الانتقال في الهيرو</label>
                            <select
                              value={siteSettings.heroTransition || "fade"}
                              onChange={(e) => setSiteSettings({ ...siteSettings, heroTransition: e.target.value as "fade" | "slide" })}
                              className="w-full bg-brand-iron border border-brand-border p-5 text-lg font-mono text-brand-text outline-none focus:border-brand-gold transition-all"
                            >
                              <option value="fade">تلاشي (Fade)</option>
                              <option value="slide">انزلاق (Slide)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-8">
                        <h4 className="text-[10px] uppercase tracking-[0.3em] text-brand-gold font-bold border-b border-brand-border pb-4">إعدادات الأمان والميزات</h4>
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-brand-muted font-bold opacity-60">
                              <input
                                type="checkbox"
                                checked={siteSettings.enablePhoneVerification !== false}
                                onChange={(e) => setSiteSettings({ ...siteSettings, enablePhoneVerification: e.target.checked })}
                                className="h-4 w-4 accent-brand-gold"
                              />
                              تفعيل التحقق برقم الموبايل عند التسجيل
                            </label>
                            <p className="text-[10px] text-brand-muted italic ml-7">عند تعطيل هذا الخيار، سيختفي من صفحة التسجيل الجديد.</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-8">
                        <h4 className="text-[10px] uppercase tracking-[0.3em] text-brand-gold font-bold border-b border-brand-border pb-4">الروابط الافتراضية والمنصات</h4>
                        <div className="space-y-6">
                           <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-brand-muted font-bold opacity-60">Instagram Portfolio URL</label>
                            <input 
                              type="text" 
                              value={siteSettings.instagram} 
                              onChange={(e) => setSiteSettings({ ...siteSettings, instagram: e.target.value })}
                              className="w-full bg-brand-iron border border-brand-border p-5 text-sm font-mono text-brand-text outline-none focus:border-brand-gold transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-brand-muted font-bold opacity-60">Facebook Page URL</label>
                            <input 
                              type="text" 
                              value={siteSettings.facebook} 
                              onChange={(e) => setSiteSettings({ ...siteSettings, facebook: e.target.value })}
                              className="w-full bg-brand-iron border border-brand-border p-5 text-sm font-mono text-brand-text outline-none focus:border-brand-gold transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-brand-muted font-bold opacity-60">X (Twitter) URL</label>
                            <input 
                              type="text" 
                              value={siteSettings.twitter} 
                              onChange={(e) => setSiteSettings({ ...siteSettings, twitter: e.target.value })}
                              className="w-full bg-brand-iron border border-brand-border p-5 text-sm font-mono text-brand-text outline-none focus:border-brand-gold transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] uppercase tracking-[0.3em] text-brand-gold font-bold">بـيان الـعـلامة الـتـجارية (About Section)</label>
                      <textarea 
                        value={siteSettings.aboutText}
                        onChange={(e) => setSiteSettings({ ...siteSettings, aboutText: e.target.value })}
                        rows={5}
                        className="w-full bg-brand-iron border border-brand-border p-8 text-xl font-serif italic leading-relaxed text-brand-muted outline-none focus:border-brand-gold transition-all"
                      />
                    </div>
                    <button 
                      onClick={() => updateSiteSettings(siteSettings.id, siteSettings)}
                      className="w-full bg-brand-gold text-brand-iron py-8 text-xs font-bold uppercase tracking-[0.4em] hover:bg-white transition-all shadow-3xl"
                    >
                      تـزامن جـميع الإعـدادات مع قـاعدة الـبيانات
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Product Management Modal */}
      <AnimatePresence>
        {isProductModalOpen && editingProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsProductModalOpen(false)}
              className="absolute inset-0 bg-brand-iron/90 backdrop-blur-md" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-brand-surface border border-brand-border shadow-3xl overflow-hidden overflow-y-auto max-h-[90vh]"
            >
              <div className="p-8 border-b border-brand-border bg-brand-iron/30 flex justify-between items-center">
                <h3 className="font-serif text-3xl font-bold tracking-tight text-brand-gold">
                  {editingProduct.id ? "تعديل القطعة النادرة" : "إضافة تحفة جديدة"}
                </h3>
                <button onClick={() => setIsProductModalOpen(false)} className="text-brand-muted hover:text-brand-gold transition-colors">
                  <X className="w-8 h-8" />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="p-12 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-muted italic opacity-60">اسم القطعة</label>
                    <input 
                      required
                      value={editingProduct.title || ""}
                      onChange={(e) => setEditingProduct({...editingProduct, title: e.target.value})}
                      className="w-full bg-brand-iron border border-brand-border p-5 text-xl font-serif text-brand-text outline-none focus:border-brand-gold transition-all italic"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-muted italic opacity-60">التصنيف الفني</label>
                    <select 
                      value={editingProduct.category || "wood"}
                      onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value as any})}
                      className="w-full bg-brand-iron border border-brand-border p-5 text-brand-text outline-none focus:border-brand-gold transition-all appearance-none"
                    >
                      <option value="wood">Natural Wood / خشب طبيعي</option>
                      <option value="metal">Industrial Metal / حديد صناعي</option>
                      <option value="combined">Artistic Blend / مزيج فني</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-muted italic opacity-60">القيمة الاستثمارية (ج.م)</label>
                    <input 
                      required
                      type="number"
                      value={editingProduct.price || ""}
                      onChange={(e) => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                      className="w-full bg-brand-iron border border-brand-border p-5 font-serif text-2xl text-brand-gold outline-none focus:border-brand-gold transition-all"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-muted italic opacity-60">سعر العرض/الخصم (ج.م) - اختياري</label>
                    <input 
                      type="number"
                      value={editingProduct.discountPrice || ""}
                      onChange={(e) => setEditingProduct({...editingProduct, discountPrice: e.target.value ? Number(e.target.value) : undefined})}
                      className="w-full bg-brand-iron border border-brand-border p-5 font-serif text-2xl text-green-500 outline-none focus:border-brand-gold transition-all"
                      placeholder="اتركه فارغاً إذا لم يوجد خصم"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-muted italic opacity-60">الكمية المتاحة (المخزون)</label>
                    <input 
                      required
                      type="number"
                      value={editingProduct.stock || ""}
                      onChange={(e) => setEditingProduct({...editingProduct, stock: Number(e.target.value)})}
                      className="w-full bg-brand-iron border border-brand-border p-5 text-brand-text outline-none focus:border-brand-gold transition-all"
                    />
                  </div>
                  <div className="flex items-center space-x-4 space-x-reverse h-full pt-10">
                    <input 
                      type="checkbox"
                      id="isNew"
                      checked={editingProduct.isNew || false}
                      onChange={(e) => setEditingProduct({...editingProduct, isNew: e.target.checked})}
                      className="w-6 h-6 border-brand-border bg-brand-iron text-brand-gold focus:ring-brand-gold"
                    />
                    <label htmlFor="isNew" className="text-xs font-bold uppercase tracking-widest text-brand-text cursor-pointer">تمييز كمنتج جديد (New Arrival)</label>
                  </div>
                  <div className="space-y-4 col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-muted italic opacity-60">رابط الصورة السينمائية (URL)</label>
                    <div className="flex gap-6 items-center">
                       <input 
                        required
                        value={editingProduct.imageUrl || ""}
                        onChange={(e) => setEditingProduct({...editingProduct, imageUrl: e.target.value})}
                        className="flex-grow bg-brand-iron border border-brand-border p-5 text-xs text-brand-muted outline-none focus:border-brand-gold transition-all font-mono"
                      />
                      {editingProduct.imageUrl && (
                        <div className="w-20 h-20 border border-brand-border overflow-hidden p-1 shadow-2xl">
                          <img src={editingProduct.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4 col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-muted italic opacity-60">وصف الحرفية والتفاصيل</label>
                    <textarea 
                      rows={4}
                      value={editingProduct.description || ""}
                      onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                      className="w-full bg-brand-iron border border-brand-border p-6 text-brand-text outline-none focus:border-brand-gold transition-all font-serif italic text-lg leading-relaxed"
                      placeholder="صف العملية الحرفية، المواد المستخدمة، والروح الفنية لهذه القطعة..."
                    />
                  </div>

                  {/* Variants / Textures Section */}
                  <div className="space-y-6 col-span-2 border-t border-brand-border pt-8">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-muted italic opacity-60">خامات المنتج (Textures / Variants)</label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Current Variants */}
                      <div className="space-y-4">
                        <p className="text-[8px] uppercase tracking-widest text-brand-muted">الخامات الحالية</p>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                          {(editingProduct.variants || []).map((variant, idx) => (
                            <div key={idx} className="flex items-center gap-4 bg-brand-iron border border-brand-border p-3 group">
                              <div 
                                className="w-10 h-10 border border-brand-border bg-cover bg-center" 
                                style={{ 
                                  backgroundColor: variant.colorHex || '#1a1a1a',
                                  backgroundImage: variant.textureUrl ? `url(${variant.textureUrl})` : 'none'
                                }}
                              />
                              <div className="flex-grow">
                                <p className="text-xs font-bold text-brand-text">{variant.name}</p>
                                <p className="text-[8px] font-mono text-brand-muted truncate max-w-[150px]">
                                  {variant.textureUrl || variant.colorHex}
                                </p>
                              </div>
                              <button 
                                type="button"
                                onClick={() => {
                                  const newVariants = [...(editingProduct.variants || [])];
                                  newVariants.splice(idx, 1);
                                  setEditingProduct({ ...editingProduct, variants: newVariants });
                                }}
                                className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          {(editingProduct.variants || []).length === 0 && (
                            <p className="text-[10px] italic text-brand-muted opacity-40 py-4">لا توجد خامات مضافة...</p>
                          )}
                        </div>
                      </div>

                      {/* Add New Variant */}
                      <div className="space-y-4 bg-brand-iron/20 p-6 border border-brand-border/50">
                        <p className="text-[8px] uppercase tracking-widest text-brand-muted">إضافة خامة جديدة</p>
                        <div className="space-y-4">
                          <input 
                            type="text"
                            id="variant-name"
                            placeholder="اسم الخامة (مثلاً: بلوط داكن)"
                            className="w-full bg-brand-iron border border-brand-border p-3 text-xs text-brand-text outline-none focus:border-brand-gold"
                          />
                          <input 
                            type="text"
                            id="variant-value"
                            placeholder="رابط الصورة (Texture URL) أو كود اللون"
                            className="w-full bg-brand-iron border border-brand-border p-3 text-[10px] font-mono text-brand-muted outline-none focus:border-brand-gold"
                          />
                          <div className="flex gap-2">
                            <button 
                              type="button"
                              onClick={() => {
                                const nameInput = document.getElementById("variant-name") as HTMLInputElement;
                                const valueInput = document.getElementById("variant-value") as HTMLInputElement;
                                if (nameInput.value && valueInput.value) {
                                  const isColor = valueInput.value.startsWith('#');
                                  const newVariant: any = {
                                    name: nameInput.value,
                                  };
                                  if (isColor) {
                                    newVariant.colorHex = valueInput.value;
                                  } else {
                                    newVariant.textureUrl = valueInput.value;
                                  }
                                  
                                  setEditingProduct({
                                    ...editingProduct,
                                    variants: [...(editingProduct.variants || []), newVariant]
                                  });
                                  nameInput.value = "";
                                  valueInput.value = "";
                                }
                              }}
                              className="flex-grow bg-brand-gold text-brand-iron py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-all shadow-xl flex items-center justify-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              إضافة خامة
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-12 border-t border-brand-border flex gap-8">
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-grow bg-brand-gold text-brand-iron py-6 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-white transition-all shadow-3xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "جـاري الـتنسيق..." : (editingProduct.id ? "تـأكيد الـتعديلات الاسـتراتيجية" : "إدراج ضمن المـجموعة الفـاخرة")}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="px-12 border border-brand-border text-brand-muted hover:text-brand-gold transition-all font-bold uppercase tracking-widest text-[10px]"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Details Modal */}
      <AnimatePresence>
        {isOrderModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsOrderModalOpen(false)}
              className="absolute inset-0 bg-brand-iron/90 backdrop-blur-md" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-brand-surface border border-brand-border shadow-3xl overflow-hidden overflow-y-auto max-h-[90vh]"
            >
              <div className="p-8 border-b border-brand-border bg-brand-iron/30 flex justify-between items-center">
                <div>
                  <h3 className="font-serif text-3xl font-bold tracking-tight text-brand-gold">تفاصيل الطلب</h3>
                  <p className="text-[10px] uppercase font-mono mt-1 text-brand-muted">#INV-{selectedOrder.id}</p>
                </div>
                <button onClick={() => setIsOrderModalOpen(false)} className="text-brand-muted hover:text-brand-gold transition-colors">
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="p-12 space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   <div className="space-y-6">
                      <h4 className="text-[10px] uppercase tracking-widest text-brand-gold font-bold border-b border-brand-border pb-2">بيانات العميل</h4>
                      <div className="space-y-4">
                         <div className="flex justify-between">
                            <span className="text-[10px] text-brand-muted font-bold tracking-widest uppercase">الاسم الكامل:</span>
                            <span className="text-brand-text font-bold">{selectedOrder.shippingInfo.name}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-[10px] text-brand-muted font-bold tracking-widest uppercase">رقم الهاتف:</span>
                            <span className="text-brand-text font-mono" dir="ltr">{selectedOrder.shippingInfo.phone}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-[10px] text-brand-muted font-bold tracking-widest uppercase">المحافظة والمدينة:</span>
                            <span className="text-brand-text">{selectedOrder.shippingInfo.governorate} - {selectedOrder.shippingInfo.city}</span>
                         </div>
                         <div className="flex flex-col gap-2">
                            <span className="text-[10px] text-brand-muted font-bold tracking-widest uppercase">العنوان بالتفصيل:</span>
                            <span className="text-sm bg-brand-iron border border-brand-border p-4 text-brand-text leading-relaxed italic">{selectedOrder.shippingInfo.address}</span>
                         </div>
                         {selectedOrder.shippingInfo.location && (
                           <div className="flex flex-col gap-2">
                             <span className="text-[10px] text-brand-muted font-bold tracking-widest uppercase">الموقع على الخريطة:</span>
                             <a 
                              href={`https://www.google.com/maps?q=${selectedOrder.shippingInfo.location.lat},${selectedOrder.shippingInfo.location.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-brand-gold hover:underline flex items-center gap-2"
                             >
                               <MapPin className="w-3 h-3" />
                               فتح في خرائط جوجل
                             </a>
                           </div>
                         )}
                         <div className="flex justify-between">
                            <span className="text-[10px] text-brand-muted font-bold tracking-widest uppercase">وسيلة الدفع:</span>
                            <span className="text-brand-gold font-bold">
                              {selectedOrder.shippingInfo.paymentMethod === 'cod' ? 'دفع عند الاستلام' : 
                               selectedOrder.shippingInfo.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' :
                               selectedOrder.shippingInfo.paymentMethod === 'instapay' ? 'انستا باي' :
                               selectedOrder.shippingInfo.paymentMethod === 'card' ? 'بطاقة ائتمان' : 'تحويل بنكي'}
                            </span>
                         </div>
                      </div>
                   </div>
                   <div className="space-y-6">
                      <h4 className="text-[10px] uppercase tracking-widest text-brand-gold font-bold border-b border-brand-border pb-2">ملخص الدفع</h4>
                      <div className="space-y-4">
                         <div className="flex justify-between">
                            <span className="text-[10px] text-brand-muted font-bold tracking-widest uppercase">تاريخ الطلب:</span>
                            <span className="text-brand-text">{new Date(selectedOrder.createdAt?.seconds * 1000).toLocaleDateString("ar-EG")}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-[10px] text-brand-muted font-bold tracking-widest uppercase">عدد المنتجات:</span>
                            <span className="text-brand-text">{selectedOrder.items.length} قطع</span>
                         </div>
                         <div className="flex justify-between items-center p-6 bg-brand-iron border border-brand-border">
                            <span className="text-[10px] text-brand-gold font-bold tracking-widest uppercase">الإجمالي الكلي:</span>
                            <span className="text-3xl font-serif font-bold text-brand-gold">{selectedOrder.total} ج.م</span>
                         </div>
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] text-brand-muted font-bold tracking-widest uppercase">حالة الطلب الحالية:</span>
                            <span className={cn(
                              "px-3 py-1 text-[10px] font-bold uppercase tracking-widest border",
                              selectedOrder.status === "paid" ? "border-green-900 text-green-500" : "border-brand-gold text-brand-gold"
                            )}>
                              {selectedOrder.status}
                            </span>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[10px] uppercase tracking-widest text-brand-gold font-bold border-b border-brand-border pb-2">المنتجات المطلوبة</h4>
                  <div className="space-y-4">
                     {selectedOrder.items.map((item, idx) => (
                       <div key={idx} className="flex items-center gap-6 p-4 bg-brand-iron border border-brand-border group">
                          <div className="w-20 h-20 border border-brand-border p-1 bg-brand-surface overflow-hidden flex-shrink-0">
                             <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-grow">
                             <h5 className="font-bold text-brand-text mb-1 uppercase tracking-tight">{item.title}</h5>
                             <div className="flex flex-wrap gap-4 text-[10px] text-brand-muted italic">
                                {item.selectedVariant && (
                                  <div className="flex items-center gap-2">
                                     <span>الخامة:</span>
                                     <span className="text-brand-gold font-bold">{item.selectedVariant.name}</span>
                                  </div>
                                )}
                                <span>الكمية: {item.quantity}</span>
                                <span>سعر الوحدة: {item.price} ج.م</span>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-brand-gold font-serif font-bold">{item.price * item.quantity} ج.م</p>
                          </div>
                       </div>
                     ))}
                  </div>
                </div>

                <div className="pt-8 flex gap-4">
                   <button 
                    onClick={() => {
                      setIsOrderModalOpen(false);
                      setIsInvoiceModalOpen(true);
                    }}
                    className="flex-grow bg-brand-gold text-brand-iron font-bold uppercase tracking-widest text-[10px] py-4 hover:bg-white transition-all shadow-3xl flex items-center justify-center gap-3"
                   >
                     <Printer className="w-4 h-4" />
                     إصدار تقرير الطباعة A4
                   </button>
                   {selectedOrder.status === 'pending' && (
                     <button 
                      onClick={() => {
                        handleConfirmOrder(selectedOrder);
                        setIsOrderModalOpen(false);
                      }}
                      className="px-10 bg-brand-iron border border-brand-gold text-brand-gold font-bold uppercase tracking-widest text-[10px] hover:bg-brand-gold hover:text-brand-iron transition-all"
                     >
                       تأكيد الطلب الآن
                     </button>
                   )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice/Report Print Modal */}
      <AnimatePresence>
        {isInvoiceModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsInvoiceModalOpen(false)}
              className="absolute inset-0 bg-brand-iron/95 backdrop-blur-xl" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-[210mm] bg-white text-[#1a1a1a] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-y-auto max-h-[95vh] p-[20mm]"
              dir="rtl"
              id="order-invoice"
            >
              <div className="absolute top-8 left-8 flex gap-4 no-print">
                 <button 
                  onClick={() => {
                    window.print();
                  }}
                  className="bg-[#d4af37] text-white p-4 shadow-2xl rounded-none"
                 >
                   <Printer className="w-6 h-6" />
                 </button>
                 <button 
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="bg-black text-white p-4 shadow-2xl rounded-none"
                 >
                   <X className="w-6 h-6" />
                 </button>
              </div>

              {/* Invoice Content */}
              <style>{`
                @media print {
                  .no-print { display: none !important; }
                  body * { visibility: hidden !important; }
                  #order-invoice, #order-invoice * { visibility: visible !important; }
                  #order-invoice { 
                    position: fixed !important; 
                    left: 0 !important; 
                    top: 0 !important; 
                    width: 210mm !important; 
                    height: auto !important; 
                    min-height: 297mm !important;
                    padding: 20mm !important; 
                    box-shadow: none !important; 
                    margin: 0 !important;
                    background: white !important;
                    z-index: 10000 !important;
                  }
                  @page { size: A4; margin: 0; }
                }
              `}</style>
              
              <div className="flex justify-between items-start border-b-[3px] border-[#d4af37] pb-10 mb-12">
                 <div>
                    <h1 className="text-5xl font-bold tracking-tighter mb-2">IRON WOOD</h1>
                    <p className="text-xs uppercase tracking-[0.4em] text-gray-500 font-bold">LUXURY CRAFTSMANSHIP</p>
                 </div>
                 <div className="text-left font-serif" dir="ltr">
                    <h2 className="text-2xl font-bold uppercase mb-2">INVOICE / REPORT</h2>
                    <p className="text-sm text-gray-500">ID: #INV-{selectedOrder.id.slice(0, 12)}</p>
                    <p className="text-sm text-gray-500">Date: {new Date(selectedOrder.createdAt?.seconds * 1000).toLocaleDateString("en-GB")}</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-20 mb-16">
                 <div>
                    <h3 className="text-[10px] border-b border-gray-200 pb-2 mb-4 font-bold uppercase tracking-widest text-gray-400">بيانات العميل (Customer)</h3>
                    <p className="text-xl font-bold mb-1">{selectedOrder.shippingInfo.name}</p>
                    <p className="text-gray-600 mb-1">{selectedOrder.shippingInfo.phone}</p>
                    <p className="text-gray-600">{selectedOrder.shippingInfo.city}</p>
                    <p className="text-gray-500 mt-4 text-xs leading-relaxed italic">{selectedOrder.shippingInfo.address}</p>
                 </div>
                 <div>
                    <h3 className="text-[10px] border-b border-gray-200 pb-2 mb-4 font-bold uppercase tracking-widest text-gray-400">بيانات المتجر (Provider)</h3>
                    <p className="text-xl font-bold mb-1">IRON WOOD DESIGN</p>
                    <p className="text-gray-600 mb-1">+20 123 456 789</p>
                    <p className="text-gray-600">office@ironwood.eg</p>
                    <p className="text-gray-500 mt-4 text-xs">القاهرة، مدينة نصر، المنطقة الصناعية</p>
                 </div>
              </div>

              <div className="mb-16">
                 <table className="w-full text-right">
                    <thead>
                       <tr className="bg-gray-50 text-[10px] uppercase font-bold tracking-widest border-b-2 border-black">
                          <th className="py-4 px-2">المنتج والوصف</th>
                          <th className="py-4 px-2 text-center">الكمية</th>
                          <th className="py-4 px-2 text-center">السعر</th>
                          <th className="py-4 px-2 text-left">الإجمالي</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                       {selectedOrder.items.map((item, idx) => (
                         <tr key={idx}>
                            <td className="py-6 px-2">
                               <p className="font-bold text-lg">{item.title}</p>
                               {item.selectedVariant && (
                                 <p className="text-[10px] text-gray-500 italic mt-1">الخامة: {item.selectedVariant.name}</p>
                               )}
                            </td>
                            <td className="py-6 px-2 text-center">{item.quantity}</td>
                            <td className="py-6 px-2 text-center">{item.price} ج.م</td>
                            <td className="py-6 px-2 text-left font-bold">{item.price * item.quantity} ج.م</td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>

              <div className="flex justify-end mb-20">
                 <div className="w-1/2 space-y-4">
                    <div className="flex justify-between text-gray-500 text-sm">
                       <span>المجموع الفرعي:</span>
                       <span>{selectedOrder.total} ج.م</span>
                    </div>
                    <div className="flex justify-between text-gray-500 text-sm">
                       <span>ضريبة القيمة المضافة (0%):</span>
                       <span>0 ج.م</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t-2 border-black">
                       <span className="font-bold text-lg uppercase tracking-widest">الإجمالي النهائي:</span>
                       <span className="text-3xl font-bold text-[#d4af37]">{selectedOrder.total} ج.م</span>
                    </div>
                 </div>
              </div>

              <div className="border-t border-gray-100 pt-10 text-center space-y-6">
                 <p className="text-[10px] text-gray-400 italic">هذا التقرير تم توليده بواسطة نظام IRON WOOD الإداري. جميع القطع مصنوعة يدوياً وبأعلى معايير الجودة.</p>
                 <div className="flex justify-center gap-20 py-10 opacity-40">
                    <div className="w-1 h-20 bg-gray-200" />
                    <div className="flex flex-col items-center">
                       <div className="w-24 h-24 border-4 border-gray-200 flex items-center justify-center mb-4">
                          <span className="text-[8px] uppercase tracking-widest font-bold">Official Seal</span>
                       </div>
                       <p className="text-[8px] uppercase font-bold tracking-widest">توقيع المدير المسؤول</p>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Shipping Rate Modal */}
      <AnimatePresence>
        {isRateModalOpen && editingRate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsRateModalOpen(false)}
              className="absolute inset-0 bg-brand-iron/90 backdrop-blur-md" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-brand-surface border border-brand-border shadow-3xl overflow-hidden"
            >
              <div className="p-8 border-b border-brand-border bg-brand-iron/30 flex justify-between items-center">
                <h3 className="font-serif text-2xl font-bold tracking-tight text-brand-gold">
                  {editingRate.id ? "تعديل سعر الشحن" : "إضافة سعر شحن جديد"}
                </h3>
                <button onClick={() => setIsRateModalOpen(false)} className="text-brand-muted hover:text-brand-gold transition-colors">
                  <X className="w-8 h-8" />
                </button>
              </div>

              <form onSubmit={handleSaveShippingRate} className="p-10 space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-muted italic opacity-60">المحافظة</label>
                  <input 
                    required
                    value={editingRate.governorate || ""}
                    onChange={(e) => setEditingRate({...editingRate, governorate: e.target.value})}
                    placeholder="مثال: القاهرة"
                    className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold transition-all"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-muted italic opacity-60">قيمة الشحن (ج.م)</label>
                  <input 
                    required
                    type="number"
                    value={editingRate.rate || ""}
                    onChange={(e) => setEditingRate({...editingRate, rate: Number(e.target.value)})}
                    className="w-full bg-brand-iron border border-brand-border p-4 font-serif text-2xl text-brand-gold outline-none focus:border-brand-gold transition-all"
                  />
                </div>

                <div className="pt-8 flex gap-4">
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-grow bg-brand-gold text-brand-iron py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-all shadow-xl"
                  >
                    {isSaving ? "جاري الحفظ..." : "حفظ السعر"}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsRateModalOpen(false)}
                    className="px-8 border border-brand-border text-brand-muted hover:text-brand-gold transition-all font-bold uppercase tracking-widest text-[10px]"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ReportTemplate products={filteredProducts} />
    </div>
  );
}

{/* Hidden Report Template */}
function ReportTemplate({ products }: { products: Product[] }) {
  return (
    <div 
      id="report-template" 
      className="bg-white text-[#1a1a1a] p-12" 
      dir="rtl"
      style={{ 
        position: 'fixed', 
        left: '-9999px', 
        top: '-9999px', 
        width: '210mm', 
        zIndex: -1000,
        display: 'none',
        visibility: 'hidden',
        pointerEvents: 'none'
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
        #report-template {
          font-family: 'Amiri', serif !important;
          line-height: 1.6;
        }
        #report-template table {
          border-collapse: collapse;
          width: 100%;
          margin-top: 20px;
        }
        #report-template th, #report-template td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: right;
          word-break: break-word;
        }
        #report-template th {
          background-color: #f8f8f8;
          color: #333;
          font-weight: bold;
        }
        .pdf-header {
           border-bottom: 3px solid #d4af37;
           padding-bottom: 20px;
           margin-bottom: 30px;
           display: flex;
           justify-content: space-between;
           align-items: center;
        }
        .pdf-title {
          font-size: 32px;
          color: #000;
          margin: 0;
        }
        .pdf-subtitle {
          font-size: 14px;
          color: #888;
          margin-top: 5px;
        }
        .stat-box {
          background: #f9f9f9;
          padding: 15px;
          border-right: 4px solid #d4af37;
        }
      `}</style>
      
      <div className="pdf-header">
        <div>
          <h1 className="pdf-title">IRON WOOD</h1>
          <p className="pdf-subtitle">تقرير حالة المخزون - الأثاث الفاخر</p>
        </div>
        <div style={{ textAlign: 'left' }} dir="ltr">
          <p style={{ margin: 0, fontWeight: 'bold' }}>{new Date().toLocaleDateString('ar-EG')}</p>
          <p style={{ margin: 0, fontSize: '10px', color: '#888' }}>REPORT GENERATED AUTOMATICALLY</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <div className="stat-box">
          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>إجمالي القطع في المخزون</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '24px', fontWeight: 'bold' }}>{products.length} منتج</p>
        </div>
        <div className="stat-box" style={{ borderRightColor: '#1a1a1a' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>القيمة الكلية التقديرية</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '24px', fontWeight: 'bold' }}>{products.reduce((sum, p) => sum + (p.price * p.stock), 0).toLocaleString()} ج.م</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style={{ width: '15%' }}>الصورة</th>
            <th style={{ width: '40%' }}>المنتج</th>
            <th style={{ width: '15%' }}>التصنيف</th>
            <th style={{ width: '15%' }}>السعر</th>
            <th style={{ width: '15%' }}>المخزون</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id}>
              <td style={{ textAlign: 'center' }}>
                {p.imageUrl ? (
                  <img 
                    src={p.imageUrl} 
                    alt="" 
                    style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                    crossOrigin="anonymous"
                  />
                ) : (
                  <span style={{ fontSize: '10px', color: '#ccc' }}>بدون صورة</span>
                )}
              </td>
              <td style={{ fontWeight: 'bold' }}>{p.title}</td>
              <td>{p.category}</td>
              <td style={{ color: '#d4af37', fontWeight: 'bold' }}>
                {p.discountPrice ? (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{p.discountPrice.toLocaleString()} ج.م</span>
                    <span style={{ fontSize: '10px', color: '#999', textDecoration: 'line-through' }}>{p.price.toLocaleString()} ج.م</span>
                  </div>
                ) : (
                  <span>{p.price.toLocaleString()} ج.م</span>
                )}
              </td>
              <td style={{ textAlign: 'center' }}>{p.stock}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #eee', textAlign: 'center' }}>
        <p style={{ fontSize: '10px', color: '#999', letterSpacing: '2px' }}>© {new Date().getFullYear()} IRON WOOD - LUXURY CRAFTSMANSHIP</p>
      </div>
    </div>
  );
}
