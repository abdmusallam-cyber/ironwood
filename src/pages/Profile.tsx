import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { useAuth } from "../App";
import { Order, UserProfile, OperationType } from "../types";
import { handleFirestoreError, cn } from "../lib/utils";
import { Package, Truck, CheckCircle, Clock, MapPin, Phone, User as UserIcon, LogOut, ChevronLeft, Globe } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { EGYPT_GOVERNORATES } from "../constants/egyptData";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || "",
    address: user?.address || "",
    governorate: user?.governorate || "",
    city: user?.city || "",
    phoneNumber: user?.phoneNumber || ""
  });

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || "",
        address: user.address || "",
        governorate: user.governorate || "",
        city: user.city || "",
        phoneNumber: user.phoneNumber || ""
      });
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, "orders"),
        where("userId", "==", user.id),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setOrders(snap.docs.map(d => ({ ...d.data(), id: d.id } as Order)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "user/orders");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setLoading(true);
      const userRef = doc(db, "users", user.id);
      await updateDoc(userRef, {
        displayName: formData.displayName,
        address: formData.address,
        governorate: formData.governorate,
        city: formData.city,
        phoneNumber: formData.phoneNumber
      });
      
      setUser({
        ...user,
        ...formData
      });
      
      setIsEditing(false);
      toast.success("تم تحديث الملف الشخصي بنجاح");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "users/" + user.id);
    } finally {
      setLoading(false);
    }
  };

  const statusMap: Record<string, { label: string; icon: any; color: string }> = {
    pending: { label: "قيد المراجعة", icon: Clock, color: "text-amber-500" },
    confirmed: { label: "تم التأكيد", icon: CheckCircle, color: "text-blue-500" },
    processing: { label: "جاري التجهيز", icon: Package, color: "text-indigo-500" },
    shipped: { label: "تم الشحن", icon: Truck, color: "text-brand-gold" },
    delivered: { label: "تم التوصيل", icon: CheckCircle, color: "text-green-500" },
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-brand-iron/10 py-20 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Profile Section */}
        <section className="bg-brand-surface border border-brand-border overflow-hidden">
          <div className="p-8 border-b border-brand-border bg-brand-iron/20 flex justify-between items-center">
            <div>
              <h1 className="font-serif text-3xl font-bold italic text-brand-text">ملفي الشخصي</h1>
              <p className="text-[10px] uppercase tracking-widest text-brand-muted mt-1">Management & Details</p>
            </div>
            <button 
              onClick={() => auth.signOut()}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
          </div>
          
          <div className="p-8">
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.form 
                  key="edit-form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleUpdateProfile} 
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gold">الاسم الكامل</label>
                    <input 
                      type="text" 
                      required
                      value={formData.displayName}
                      onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text focus:border-brand-gold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gold">رقم الهاتف</label>
                    <input 
                      type="tel" 
                      required
                      value={formData.phoneNumber}
                      onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text focus:border-brand-gold outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:col-span-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gold">المحافظة</label>
                      <select 
                        required 
                        value={formData.governorate} 
                        onChange={e => setFormData({ ...formData, governorate: e.target.value, city: "" })}
                        className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text focus:border-brand-gold outline-none appearance-none"
                      >
                        <option value="" disabled>اختر المحافظة...</option>
                        {EGYPT_GOVERNORATES.map(gov => (
                          <option key={gov.id} value={gov.name}>{gov.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gold">المدينة / المنطقة</label>
                      <select 
                        required 
                        disabled={!formData.governorate}
                        value={formData.city} 
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text focus:border-brand-gold outline-none appearance-none disabled:opacity-50"
                      >
                        <option value="" disabled>اختر المدينة...</option>
                        {EGYPT_GOVERNORATES.find(g => g.name === formData.governorate)?.cities.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gold">العنوان بالتفصيل</label>
                    <textarea 
                      required
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text focus:border-brand-gold outline-none h-24"
                    />
                  </div>
                  <div className="md:col-span-2 flex gap-4 pt-4">
                    <button 
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-brand-gold text-brand-iron font-bold uppercase tracking-widest py-4 transition-all hover:bg-white hover:text-black disabled:opacity-50"
                    >
                      {loading ? "جاري الحفظ..." : "حفظ التعديلات"}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 border border-brand-border text-brand-muted font-bold uppercase tracking-widest py-4 hover:bg-brand-iron"
                    >
                      إلغاء
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.div 
                  key="info-display"
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-brand-iron border border-brand-border text-brand-gold">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-brand-muted">الاسم</p>
                      <p className="font-bold text-lg">{user.displayName || "غير مسجل"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-brand-iron border border-brand-border text-brand-gold">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-brand-muted">رقم الهاتف</p>
                      <p className="font-bold text-lg">{user.phoneNumber || "غير مسجل"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 md:col-span-2">
                    <div className="p-3 bg-brand-iron border border-brand-border text-brand-gold">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-brand-muted">العنوان</p>
                      <p className="font-bold text-lg">
                        {user.governorate ? `${user.governorate} - ${user.city} - ${user.address}` : (user.address ? `${user.city} - ${user.address}` : "عنوانك غير مسجل")}
                      </p>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="w-full md:w-auto px-12 py-4 bg-brand-iron border border-brand-border text-brand-gold font-bold uppercase tracking-widest hover:border-brand-gold transition-all"
                    >
                      تعديل البيانات الأساسية
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Orders Section */}
        <section className="space-y-6">
          <div className="flex justify-between items-end border-b border-brand-border pb-4">
            <div>
              <h2 className="font-serif text-2xl font-bold italic">طلباتي الأخيرة</h2>
              <p className="text-[10px] uppercase tracking-widest text-brand-muted mt-1">Order Tracking & History</p>
            </div>
            <div className="text-brand-gold text-xs font-bold uppercase tracking-widest">
              ({orders.length}) طلبات
            </div>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center border border-brand-border">
               <div className="w-12 h-12 border-2 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center border border-brand-border bg-brand-surface">
              <Package className="w-12 h-12 mx-auto text-brand-iron mb-4" />
              <p className="text-brand-muted italic">لا يوجد لديك طلبات سابقة حتى الآن</p>
              <button 
                onClick={() => window.location.href = '/shop'}
                className="mt-6 px-10 py-3 bg-brand-gold text-brand-iron font-bold uppercase tracking-widest"
              >
                تصفح المتجر
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const status = statusMap[order.status] || statusMap.pending;
                const StatusIcon = status.icon;

                return (
                  <motion.div 
                    layout
                    key={order.id}
                    className="bg-brand-surface border border-brand-border overflow-hidden hover:border-brand-gold/50 transition-colors"
                  >
                    <div className="p-6 flex flex-wrap items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-iron flex items-center justify-center font-bold text-brand-gold">
                           #{order.id.substring(0, 4)}
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-brand-muted">رقم الطلب</p>
                          <p className="font-mono text-xs">{order.id}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                         <div className={cn("p-2 bg-brand-iron border border-brand-border", status.color)}>
                            <StatusIcon className="w-5 h-5" />
                         </div>
                         <div>
                            <p className="text-[10px] uppercase tracking-widest text-brand-muted">الحالة</p>
                            <p className={cn("font-bold", status.color)}>{status.label}</p>
                         </div>
                      </div>

                      <div className="text-right">
                         <p className="text-[10px] uppercase tracking-widest text-brand-muted">الإجمالي بالعربون</p>
                         <p className="text-xl font-bold text-brand-gold">{(order.total + order.shippingCost).toLocaleString()} ج.م</p>
                      </div>

                      <button className="p-3 border border-brand-border text-brand-muted hover:text-brand-gold transition-colors">
                         <ChevronLeft className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Timeline visualization */}
                    <div className="px-6 py-4 bg-brand-iron/30 border-t border-brand-border flex justify-between">
                       <div className="flex gap-4">
                          {order.items.slice(0, 3).map((item: any, i: number) => (
                             <div key={i} className="w-10 h-10 border border-brand-border overflow-hidden bg-white">
                                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                             </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="w-10 h-10 bg-brand-iron border border-brand-border flex items-center justify-center text-[10px] font-bold">
                               +{order.items.length - 3}
                            </div>
                          )}
                       </div>
                       <div className="text-[10px] text-brand-muted uppercase tracking-widest italic flex items-center">
                          بتاريخ: {new Date((order.createdAt as any)?.seconds * 1000).toLocaleDateString("ar-EG")}
                       </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
