import { auth, db } from "../lib/firebase";
import { signInWithPopup, GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { User, LogIn, Phone, ArrowLeft, Shield, MapPin, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { EGYPT_GOVERNORATES } from "../constants/egyptData";

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"method" | "phone" | "otp" | "register">("method");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [regData, setRegData] = useState({ displayName: "", address: "", governorate: "", city: "" });
  const [tempUser, setTempUser] = useState<any>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (step === "phone") {
      const initRecaptcha = () => {
        try {
          if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
          }
          const container = document.getElementById('recaptcha-container');
          if (container) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
              'size': 'invisible'
            });
          }
        } catch (error) {
          console.error("Recaptcha init error:", error);
        }
      };
      const timer = setTimeout(initRecaptcha, 150);
      return () => {
        clearTimeout(timer);
        if (window.recaptchaVerifier) {
          try { window.recaptchaVerifier.clear(); } catch(e) {}
          window.recaptchaVerifier = null;
        }
      };
    }
  }, [step]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setTempUser(result.user);
        setStep("register");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Login failed:", error);
      toast.error("فشل تسجيل الدخول بجوجل");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    const trimmedPhone = phoneNumber.trim();
    if (!trimmedPhone) return toast.error("يرجى إدخال رقم الهاتف");
    
    const cleanPhone = trimmedPhone.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString())
                                     .replace(/[0-9]/g, d => d);
    
    const onlyDigits = cleanPhone.replace(/[^\d+]/g, '');

    try {
      setLoading(true);
      const container = document.getElementById('recaptcha-container');
      if (!container) throw new Error("عذراً، حدث خطأ في تهيئة النظام");

      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible'
        });
      }
      
      const appVerifier = window.recaptchaVerifier;
      const formattedNumber = onlyDigits.startsWith('+') ? onlyDigits : `+20${onlyDigits.startsWith('0') ? onlyDigits.substring(1) : onlyDigits}`;
      
      const result = await signInWithPhoneNumber(auth, formattedNumber, appVerifier);
      setConfirmationResult(result);
      setStep("otp");
      toast.success("تم إرسال رمز التحقق بنجاح");
    } catch (error: any) {
      console.error("SMS failed:", error);
      toast.error("فشل إرسال رمز التحقق. يرجى التأكد من الرقم");
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch(e) {}
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !confirmationResult) return;
    try {
      setLoading(true);
      const result = await confirmationResult.confirm(otp);
      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setTempUser(result.user);
        setStep("register");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("OTP failed:", error);
      toast.error("رمز التحقق غير صحيح");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUser) return;
    try {
      setLoading(true);
      const userRef = doc(db, "users", tempUser.uid);
      await setDoc(userRef, {
        displayName: regData.displayName,
        address: regData.address,
        governorate: regData.governorate,
        city: regData.city,
        phoneNumber: tempUser.phoneNumber || phoneNumber || "",
        email: tempUser.email || "",
        role: "user",
        createdAt: serverTimestamp(),
      });
      toast.success("تم بنجاح! أهلاً بك في فخر الصناعة المصرية");
      navigate("/");
    } catch (error) {
      console.error("Registration failed:", error);
      toast.error("حدث خطأ أثناء حفظ البيانات");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-iron overflow-hidden relative" dir="rtl">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-iron via-brand-surface to-brand-iron opacity-50" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-gold/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full mx-6 bg-brand-surface p-12 md:p-16 border border-brand-border shadow-3xl relative z-10"
      >
        <div className="text-center mb-12">
          <div className="inline-flex p-6 border border-brand-gold/20 bg-brand-iron mb-10 shadow-2xl relative">
            <User className="w-10 h-10 text-brand-gold relative z-10" />
          </div>
          <h2 className="font-serif text-4xl font-bold mb-4 text-brand-text italic tracking-tighter">IRON WOOD</h2>
          <p className="text-brand-gold uppercase tracking-[0.4em] text-[10px] font-bold italic opacity-70">
            {step === "method" ? "SOPHISTICATED ACCESS" : step === "phone" ? "MOBILE VERIFICATION" : step === "otp" ? "SECURITY CLEARANCE" : "ESTABLISHING IDENTITY"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === "method" && (
            <motion.div key="method" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <button onClick={handleGoogleLogin} disabled={loading} className="w-full flex items-center justify-center space-x-6 space-x-reverse bg-white text-brand-iron py-5 px-8 font-bold uppercase tracking-[0.2em] hover:bg-brand-gold transition-all shadow-xl group/btn">
                <LogIn className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                <span>الاستمرار بجوجل</span>
              </button>
              <div className="flex items-center gap-4 py-4">
                <div className="flex-grow h-px bg-brand-border opacity-30" />
                <span className="text-[10px] text-brand-muted uppercase tracking-widest font-bold opacity-50">أو</span>
                <div className="flex-grow h-px bg-brand-border opacity-30" />
              </div>
              <button onClick={() => setStep("phone")} disabled={loading} className="w-full flex items-center justify-center space-x-6 space-x-reverse bg-transparent border border-brand-gold/30 text-brand-gold py-5 px-8 font-bold uppercase tracking-[0.2em] hover:bg-brand-gold/10 transition-all shadow-xl">
                <Phone className="w-5 h-5" />
                <span>عبر رقم الموبايل</span>
              </button>
            </motion.div>
          )}

          {step === "phone" && (
            <motion.div key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold">رقم الموبايل</label>
                <div className="relative">
                   <input type="tel" placeholder="01XXXXXXXXX" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full bg-brand-iron border border-brand-border p-5 text-xl font-mono text-brand-text outline-none focus:border-brand-gold transition-all text-center tracking-widest" />
                   <div className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-muted opacity-50 font-mono">+20</div>
                </div>
              </div>
              <div className="space-y-4">
                <button onClick={handleSendOtp} disabled={loading} className="w-full bg-brand-gold text-brand-iron py-5 px-8 font-bold uppercase tracking-[0.2em] hover:bg-white transition-all shadow-3xl disabled:opacity-50">
                  {loading ? "جاري الإرسال..." : "إرسال رمز التحقق"}
                </button>
                <button onClick={() => setStep("method")} className="w-full flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-brand-muted hover:text-brand-gold transition-colors font-bold">
                  <ArrowLeft className="w-3 h-3" /> العودة للاختيار
                </button>
              </div>
              <div id="recaptcha-container"></div>
            </motion.div>
          )}

          {step === "otp" && (
            <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="space-y-4 text-center">
                <Shield className="w-12 h-12 text-brand-gold mx-auto mb-6 animate-pulse" />
                <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold">أدخل الرمز المكون من 6 أرقام</label>
                <input type="text" maxLength={6} placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full bg-brand-iron border border-brand-border p-6 text-4xl font-mono text-brand-text outline-none focus:border-brand-gold transition-all text-center tracking-[0.5em]" />
              </div>
              <button onClick={handleVerifyOtp} disabled={loading} className="w-full bg-brand-gold text-brand-iron py-5 px-8 font-bold uppercase tracking-[0.2em] hover:bg-white transition-all shadow-3xl disabled:opacity-50">
                {loading ? "جاري التحقق..." : "تأكيد والـدخول"}
              </button>
            </motion.div>
          )}

          {step === "register" && (
            <motion.form key="register" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onSubmit={handleCompleteRegistration} className="space-y-6">
               <div className="space-y-6">
                 <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gold">الاسم بالكامل</label>
                   <input required type="text" value={regData.displayName} onChange={e => setRegData({...regData, displayName: e.target.value})} className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold mb-4" placeholder="الاسم ثلاثي..." />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gold">المحافظة</label>
                    <select 
                      required 
                      value={regData.governorate} 
                      onChange={e => setRegData({...regData, governorate: e.target.value, city: ""})} 
                      className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold appearance-none"
                    >
                      <option value="" disabled>اختر...</option>
                      {EGYPT_GOVERNORATES.map(gov => (
                        <option key={gov.id} value={gov.name}>{gov.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gold">المدينة / المنطقة</label>
                    <select 
                      required 
                      disabled={!regData.governorate}
                      value={regData.city} 
                      onChange={e => setRegData({...regData, city: e.target.value})} 
                      className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold appearance-none disabled:opacity-50"
                    >
                      <option value="" disabled>اختر...</option>
                      {EGYPT_GOVERNORATES.find(g => g.name === regData.governorate)?.cities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-brand-gold">العنوان بالتفصيل</label>
                   <textarea required value={regData.address} onChange={e => setRegData({...regData, address: e.target.value})} className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold h-20" placeholder="رقم المبنى، اسم الشارع..." />
                 </div>
               </div>
               <button type="submit" disabled={loading} className="w-full bg-brand-gold text-brand-iron py-5 font-bold uppercase tracking-[0.2em] hover:bg-white transition-all">
                 {loading ? "جاري الحفظ..." : "إكمال التسجيل والدخول"}
               </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-16 pt-12 border-t border-brand-border">
          <p className="text-[9px] text-brand-muted uppercase tracking-[0.3em] leading-relaxed italic opacity-50 text-center">
            بـالدخول إلى مجتمعنا، أنت توافق على <br /> ميثاق التميز واحترام الخصوصية
          </p>
        </div>
      </motion.div>
    </div>
  );
}

declare global { interface Window { recaptchaVerifier: any; } }
