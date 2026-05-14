import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  auth,
  db
} from "../lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  PhoneAuthProvider,
  linkWithCredential,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  getDoc,
  serverTimestamp
} from "firebase/firestore";
import { EGYPT_GOVERNORATES } from "../constants/egyptData";
import { toast } from "sonner";
import {
  User,
  Lock,
  Mail,
  Phone,
  Check,
  ArrowLeft,
  Eye,
  EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const initialLoginState = { identifier: "", password: "" };
const initialRegisterState = {
  username: "",
  email: "",
  password: "",
  phoneNumber: "",
  fullName: "",
  governorate: "",
  city: "",
  address: "",
  verifyPhone: false
};

export default function Login() {
  const navigate = useNavigate();
  const [page, setPage] = useState<"login" | "register" | "verify" | "forgot">("login");
  const [loginData, setLoginData] = useState(initialLoginState);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [registerData, setRegisterData] = useState(initialRegisterState);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [phoneVerificationEnabled, setPhoneVerificationEnabled] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { getSiteSettings } = await import("../services/siteContent");
        const settings = await getSiteSettings();
        if (settings) {
          setPhoneVerificationEnabled(settings.enablePhoneVerification !== false);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (!phoneVerificationEnabled) {
      setRegisterData((prev) => ({ ...prev, verifyPhone: false }));
    }
  }, [phoneVerificationEnabled]);

  useEffect(() => {
    if (page === "verify") {
      const timer = setTimeout(() => {
        try {
          if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
          }
          window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
            size: "invisible"
          });
        } catch (error) {
          console.error("Recaptcha init error:", error);
        }
      }, 150);

      return () => {
        clearTimeout(timer);
        if (window.recaptchaVerifier) {
          try { window.recaptchaVerifier.clear(); } catch (e) {}
          window.recaptchaVerifier = null;
        }
      };
    }
  }, [page]);

  const normalizePhone = (raw: string) => {
    const digits = raw
      .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString())
      .replace(/[^0-9+]/g, "");

    if (digits.startsWith("+")) return digits;
    if (digits.startsWith("0")) return `+20${digits.slice(1)}`;
    return `+20${digits}`;
  };

  const resolveIdentifierToEmail = async (identifier: string) => {
    const trimmed = identifier.trim();
    if (!trimmed) throw new Error("يرجى إدخال اسم المستخدم أو البريد الإلكتروني");

    if (trimmed.includes("@")) return trimmed.toLowerCase();

    const lower = trimmed.toLowerCase();
    const usernameQuery = query(collection(db, "users"), where("username", "==", lower), limit(1));
    const usernameSnap = await getDocs(usernameQuery);
    if (!usernameSnap.empty) {
      const userData = usernameSnap.docs[0].data();
      if (userData.email) return userData.email;
    }

    const displayNameQuery = query(collection(db, "users"), where("displayName", "==", trimmed), limit(1));
    const displayNameSnap = await getDocs(displayNameQuery);
    if (!displayNameSnap.empty) {
      const userData = displayNameSnap.docs[0].data();
      if (userData.email) return userData.email;
    }

    throw new Error("لم يتم العثور على حساب بهذا الاسم أو البريد الإلكتروني");
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      const email = await resolveIdentifierToEmail(loginData.identifier);
      await signInWithEmailAndPassword(auth, email, loginData.password);
      toast.success("تم تسجيل الدخول بنجاح");
      navigate("/");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "فشل تسجيل الدخول. تأكد من بياناتك.");
    } finally {
      setLoading(false);
    }
  };

  const checkAccountExists = async () => {
    const lowerUsername = registerData.username.trim().toLowerCase();
    const lowerEmail = registerData.email.trim().toLowerCase();

    if (!lowerUsername || !lowerEmail) return;

    const usernameQuery = query(collection(db, "users"), where("username", "==", lowerUsername), limit(1));
    const emailQuery = query(collection(db, "users"), where("email", "==", lowerEmail), limit(1));

    const [usernameSnap, emailSnap] = await Promise.all([getDocs(usernameQuery), getDocs(emailQuery)]);
    if (!usernameSnap.empty) throw new Error("اسم المستخدم مستخدم من قبل. اختر اسماً آخر.");
    if (!emailSnap.empty) throw new Error("البريد الإلكتروني مسجل بالفعل. استخدم بريدًا آخر.");
  };

  const createUserDocument = async (userId: string, phoneVerified = false) => {
    await setDoc(doc(db, "users", userId), {
      username: registerData.username.trim().toLowerCase(),
      displayName: registerData.fullName.trim(),
      email: registerData.email.trim().toLowerCase(),
      phoneNumber: registerData.phoneNumber.trim(),
      governorate: registerData.governorate,
      city: registerData.city,
      address: registerData.address,
      role: "user",
      phoneVerified,
      createdAt: serverTimestamp()
    });
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      await checkAccountExists();
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        registerData.email.trim().toLowerCase(),
        registerData.password
      );

      if (registerData.verifyPhone) {
        if (!window.recaptchaVerifier) {
          window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
            size: "invisible"
          });
        }
        const provider = new PhoneAuthProvider(auth);
        const verificationId = await provider.verifyPhoneNumber(normalizePhone(registerData.phoneNumber), window.recaptchaVerifier);
        setVerificationId(verificationId);
        setPage("verify");
        toast.success("تم إرسال رمز التحقق إلى رقم الموبايل");
      } else {
        await createUserDocument(userCredential.user.uid, false);
        toast.success("تم التسجيل بنجاح");
        navigate("/");
      }
    } catch (error: any) {
      console.error("Register error:", error);
      toast.error(error.message || "فشل التسجيل. يرجى التحقق من البيانات.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!verificationId) return;

    try {
      setLoading(true);
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      if (!auth.currentUser) throw new Error("لم يتم العثور على المستخدم.");
      await linkWithCredential(auth.currentUser, credential);
      await createUserDocument(auth.currentUser.uid, true);
      toast.success("تم تأكيد رقم الموبايل وتفعيل الحساب");
      navigate("/");
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      toast.error(error.message || "رمز التحقق غير صحيح.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipVerification = async () => {
    try {
      setLoading(true);
      if (!auth.currentUser) throw new Error("لم يتم العثور على المستخدم.");
      await createUserDocument(auth.currentUser.uid, false);
      toast.success("تم إكمال التسجيل بدون التحقق من الهاتف");
      navigate("/");
    } catch (error: any) {
      console.error("Skip verification error:", error);
      toast.error(error.message || "حدث خطأ أثناء إكمال التسجيل.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      const email = await resolveIdentifierToEmail(forgotIdentifier);
      await sendPasswordResetEmail(auth, email);
      toast.success("تم إرسال رابط استعادة الحساب إلى البريد الإلكتروني المسجل");
      setPage("login");
      setForgotIdentifier("");
      setLoginData({ ...loginData, identifier: email });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      toast.error(error.message || "فشل إرسال رسالة الاستعادة. تحقق من البيانات وحاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore, if not create document
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          username: user.displayName?.toLowerCase().replace(/\s+/g, '') || user.email?.split('@')[0],
          displayName: user.displayName || user.email?.split('@')[0],
          email: user.email?.toLowerCase(),
          phoneNumber: user.phoneNumber || "",
          governorate: "",
          city: "",
          address: "",
          role: user.email === "abd.musallam@gmail.com" ? "admin" : "user",
          phoneVerified: false,
          createdAt: serverTimestamp()
        });
      }

      toast.success("تم تسجيل الدخول بنجاح عبر Google");
      navigate("/");
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      toast.error(error.message || "فشل تسجيل الدخول عبر Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-iron overflow-hidden relative" dir="rtl">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-iron via-brand-surface to-brand-iron opacity-50" />
      <div className="absolute top-0 right-0 w-[460px] h-[460px] bg-brand-gold/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-3xl mx-6 bg-brand-surface border border-brand-border shadow-3xl p-10 md:p-16"
      >
        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-10">
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex p-5 bg-brand-iron border border-brand-border mb-6 rounded-full">
                <User className="w-10 h-10 text-brand-gold" />
              </div>
              <h1 className="font-serif text-4xl font-bold text-brand-text italic">IRON WOOD</h1>
              <p className="mt-2 text-sm text-brand-muted uppercase tracking-[0.35em]">تسجيل الدخول والتسجيل</p>
            </div>

            <div className="flex gap-3 rounded-full border border-brand-border overflow-hidden bg-brand-iron/10">
              <button
                type="button"
                onClick={() => setPage("login")}
                className={`w-full py-4 text-sm font-bold uppercase tracking-[0.2em] transition ${page === "login" ? "bg-brand-gold text-brand-iron" : "text-brand-muted hover:text-brand-gold"}`}
              >
                تسجيل دخول
              </button>
              <button
                type="button"
                onClick={() => setPage("register")}
                className={`w-full py-4 text-sm font-bold uppercase tracking-[0.2em] transition ${page === "register" ? "bg-brand-gold text-brand-iron" : "text-brand-muted hover:text-brand-gold"}`}
              >
                تسجيل جديد
              </button>
            </div>

            <AnimatePresence mode="wait">
              {page === "login" && (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  onSubmit={handleLogin}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold">اسم المستخدم أو البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        type="text"
                        value={loginData.identifier}
                        onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                        className="w-full pr-4 pl-12 bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold"
                        placeholder="user123 أو example@mail.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold">كلمة المرور</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="w-full pr-12 pl-12 bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(prev => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted"
                      >
                        {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-gold text-brand-iron font-bold uppercase tracking-[0.2em] py-4 hover:bg-white transition-all disabled:opacity-50"
                  >
                    {loading ? "جاري الدخول..." : "دخول"}
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-brand-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase tracking-widest">
                      <span className="bg-brand-iron px-2 text-brand-muted">أو</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full bg-white text-gray-900 font-bold uppercase tracking-[0.2em] py-4 hover:bg-gray-100 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {loading ? "جاري الدخول..." : "دخول عبر Google"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPage("forgot");
                      setForgotIdentifier(loginData.identifier);
                    }}
                    className="w-full text-[10px] uppercase tracking-widest text-brand-muted hover:text-brand-gold transition-colors"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </motion.form>
              )}

              {page === "register" && (
                <motion.form
                  key="register"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  onSubmit={handleRegister}
                  className="space-y-5"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold">اسم المستخدم</label>
                      <input
                        required
                        type="text"
                        value={registerData.username}
                        onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                        className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold"
                        placeholder="user123"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold">البريد الإلكتروني</label>
                      <input
                        required
                        type="email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold"
                        placeholder="example@mail.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold">كلمة المرور</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        required
                        type={showRegisterPassword ? "text" : "password"}
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        className="w-full pr-12 pl-12 bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(prev => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted"
                      >
                        {showRegisterPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold">رقم الهاتف</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        required
                        type="tel"
                        value={registerData.phoneNumber}
                        onChange={(e) => setRegisterData({ ...registerData, phoneNumber: e.target.value })}
                        className="w-full pr-4 pl-12 bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold"
                        placeholder="010XXXXXXXX"
                      />
                    </div>
                  </div>

                  {phoneVerificationEnabled ? (
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-brand-gold font-bold">
                        <input
                          type="checkbox"
                          checked={registerData.verifyPhone}
                          onChange={(e) => setRegisterData({ ...registerData, verifyPhone: e.target.checked })}
                          className="h-4 w-4 accent-brand-gold"
                        />
                        تحقق عبر الموبايل (اختياري)
                      </label>
                      <p className="text-[11px] text-brand-muted leading-relaxed">يمكنك التحقق برقم الموبايل الآن أو تسجيل الحساب فقط والعودة لاحقاً.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 p-4 bg-brand-gold/5 border border-brand-gold/20">
                      <p className="text-[10px] text-brand-muted italic">تم تعطيل التحقق من الموبايل من لوحة التحكم. سيتم إنشاء الحساب بدون التحقق.</p>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold">الاسم الكامل</label>
                      <input
                        required
                        type="text"
                        value={registerData.fullName}
                        onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                        className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold"
                        placeholder="محمد أحمد"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold">المحافظة</label>
                      <select
                        required
                        value={registerData.governorate}
                        onChange={(e) => setRegisterData({ ...registerData, governorate: e.target.value, city: "" })}
                        className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold appearance-none"
                      >
                        <option value="" disabled>اختر المحافظة</option>
                        {EGYPT_GOVERNORATES.map((gov) => (
                          <option key={gov.id} value={gov.name}>{gov.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold">المدينة / المنطقة</label>
                    <select
                      required
                      disabled={!registerData.governorate}
                      value={registerData.city}
                      onChange={(e) => setRegisterData({ ...registerData, city: e.target.value })}
                      className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold appearance-none disabled:opacity-50"
                    >
                      <option value="" disabled>اختر المدينة</option>
                      {EGYPT_GOVERNORATES.find((gov) => gov.name === registerData.governorate)?.cities.map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold">العنوان التفصيلي</label>
                    <textarea
                      required
                      value={registerData.address}
                      onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
                      className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold h-24"
                      placeholder="رقم المنزل، اسم الشارع..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-gold text-brand-iron font-bold uppercase tracking-[0.2em] py-4 hover:bg-white transition-all disabled:opacity-50"
                  >
                    {loading ? "جاري التسجيل..." : "إنشاء حساب"}
                  </button>
                </motion.form>
              )}

              {page === "forgot" && (
                <motion.form
                  key="forgot"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  onSubmit={handleForgotPassword}
                  className="space-y-5"
                >
                  <div className="space-y-4 text-center">
                    <h3 className="text-2xl font-serif font-bold text-brand-text">استعادة كلمة المرور</h3>
                    <p className="text-[11px] text-brand-muted">أدخل اسم المستخدم أو البريد الإلكتروني المسجل لإرسال رابط التحقق.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold">اسم المستخدم أو البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        type="text"
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        className="w-full pr-4 pl-12 bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold"
                        placeholder="user123 أو example@mail.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-gold text-brand-iron font-bold uppercase tracking-[0.2em] py-4 hover:bg-white transition-all disabled:opacity-50"
                  >
                    {loading ? "جاري الإرسال..." : "إرسال رابط الاستعادة"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPage("login")}
                    className="w-full text-[10px] uppercase tracking-widest text-brand-muted hover:text-brand-gold transition-colors"
                  >
                    <ArrowLeft className="inline-block w-3 h-3 mr-2" /> العودة لتسجيل الدخول
                  </button>
                </motion.form>
              )}

              {page === "verify" && (
                <motion.form
                  key="verify"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  onSubmit={handleVerifyOtp}
                  className="space-y-5"
                >
                  <div className="space-y-4 text-center">
                    <Check className="mx-auto w-14 h-14 text-brand-gold" />
                    <p className="text-sm text-brand-text font-bold">تحقق من رقم الموبايل</p>
                    <p className="text-[11px] text-brand-muted">أدخل رمز التحقق الذي تم إرساله إلى {normalizePhone(registerData.phoneNumber)}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-brand-gold font-bold">رمز التحقق</label>
                    <input
                      required
                      type="text"
                      value={otp}
                      maxLength={6}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full bg-brand-iron border border-brand-border p-4 text-brand-text outline-none focus:border-brand-gold text-center tracking-[0.35em]"
                      placeholder="000000"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-gold text-brand-iron font-bold uppercase tracking-[0.2em] py-4 hover:bg-white transition-all disabled:opacity-50"
                  >
                    {loading ? "جاري التحقق..." : "تأكيد الرمز"}
                  </button>

                  <button
                    type="button"
                    onClick={handleSkipVerification}
                    disabled={loading}
                    className="w-full border border-brand-border text-brand-muted uppercase tracking-[0.2em] py-4 hover:text-brand-gold transition-all"
                  >
                    إكمال التسجيل بدون التحقق
                  </button>

                  <button
                    type="button"
                    onClick={() => setPage("register")}
                    className="w-full text-[10px] uppercase tracking-widest text-brand-muted hover:text-brand-gold transition-colors"
                  >
                    <ArrowLeft className="inline-block w-3 h-3 mr-2" /> العودة لتعديل البيانات
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <div className="rounded-3xl bg-brand-iron/10 p-8 border border-brand-border hidden lg:block">
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-3xl font-bold text-brand-text">مرحبا بك في IRON WOOD</h2>
                <p className="mt-4 text-sm text-brand-muted leading-relaxed">استخدم اسم المستخدم أو البريد الإلكتروني للدخول بسرعة. يمكنك أيضاً إنشاء حساب جديد مع رقم الموبايل وتفعيل التحقق حسب اختيارك.</p>
              </div>
              <div className="space-y-4 text-sm text-brand-text/80">
                <p className="flex items-center gap-3"><Check className="w-4 h-4 text-brand-gold" /> تسجيل دخول بالبريد أو اسم المستخدم</p>
                <p className="flex items-center gap-3"><Check className="w-4 h-4 text-brand-gold" /> تسجيل دخول سريع عبر Google</p>
                <p className="flex items-center gap-3"><Check className="w-4 h-4 text-brand-gold" /> إنشاء حساب جديد بكلمة مرور قوية</p>
                <p className="flex items-center gap-3"><Check className="w-4 h-4 text-brand-gold" /> تحقق اختياري برقم الموبايل</p>
                <p className="flex items-center gap-3"><Check className="w-4 h-4 text-brand-gold" /> إنهاء الحساب بدون انتظار التحقق</p>
              </div>
            </div>
          </div>
        </div>

        <div id="recaptcha-container"></div>
      </motion.div>
    </div>
  );
}

declare global { interface Window { recaptchaVerifier: any; } }
