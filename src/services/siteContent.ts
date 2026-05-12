import { collection, getDocs, doc, setDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface HomeHighlight {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  createdAt?: any;
}

export interface PortfolioItem {
  id: string;
  title: string;
  year: string;
  category: string;
  imageUrl: string;
  description: string;
  createdAt?: any;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
}

export interface SiteSettings {
  phone: string;
  email: string;
  address: string;
  instagram: string;
  facebook: string;
  twitter: string;
  aboutText: string;
  vodafoneCashNumber?: string;
  instapayVpa?: string;
  successTitle?: string;
  successMessage?: string;
}

export const getHomeHighlights = async () => {
  const snap = await getDocs(query(collection(db, "homeHighlights"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as HomeHighlight));
};

export const getPortfolioItems = async () => {
  const snap = await getDocs(query(collection(db, "portfolio"), orderBy("year", "desc")));
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as PortfolioItem));
};

export const getTestimonials = async () => {
  const snap = await getDocs(collection(db, "testimonials"));
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as Testimonial));
};

export const getSiteSettings = async () => {
  const snap = await getDocs(collection(db, "settings"));
  if (snap.empty) return null;
  return { ...snap.docs[0].data(), id: snap.docs[0].id } as SiteSettings & { id: string };
};

export const updateHomeHighlight = async (highlight: any) => {
  const docRef = doc(db, "homeHighlights", highlight.id);
  const data = { ...highlight };
  delete data.id; // Don't save the ID inside the document
  if (!data.createdAt) {
    data.createdAt = serverTimestamp();
  }
  await setDoc(docRef, data, { merge: true });
};

export const updatePortfolioItem = async (item: PortfolioItem) => {
  await setDoc(doc(db, "portfolio", item.id), item);
};

export const updateTestimonial = async (testimonial: Testimonial) => {
  await setDoc(doc(db, "testimonials", testimonial.id), testimonial);
};

export const updateSiteSettings = async (id: string, settings: SiteSettings) => {
  await setDoc(doc(db, "settings", id), settings);
};
