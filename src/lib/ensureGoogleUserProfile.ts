import type { User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

const ADMIN_EMAIL = "abd.musallam@gmail.com";

/** Creates `users/{uid}` on first Google sign-in (popup or redirect). */
export async function ensureGoogleUserProfileFirestore(user: User): Promise<void> {
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (userDoc.exists()) return;

  const emailLower = (user.email ?? "").toLowerCase();
  const fallbackLabel = emailLower.split("@")[0] || user.uid.slice(0, 8);
  const displayName = user.displayName || fallbackLabel;
  const username = (user.displayName?.toLowerCase().replace(/\s+/g, "") || fallbackLabel).toLowerCase();

  await setDoc(doc(db, "users", user.uid), {
    username,
    displayName,
    email: emailLower,
    phoneNumber: user.phoneNumber ?? "",
    governorate: "",
    city: "",
    address: "",
    role: emailLower === ADMIN_EMAIL.toLowerCase() ? "admin" : "user",
    phoneVerified: false,
    createdAt: serverTimestamp()
  });
}
