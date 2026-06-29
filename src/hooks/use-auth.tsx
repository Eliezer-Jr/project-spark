import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AppRole } from "@/types/database";
import { db, type AuthSession, type AuthUser } from "@/lib/app-db";

interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  business_name: string | null;
  artisan_category: string | null;
  location: string | null;
  address: string | null;
  region: string | null;
  city: string | null;
  digital_address: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_location_at: string | null;
  specialization: string | null;
  years_experience: number | null;
  bio: string | null;
  id_type: string | null;
  id_number: string | null;
  id_card_url: string | null;
  portfolio_urls: string[];
  price_range: string | null;
  availability: string | null;
  working_days: string[];
  working_hours: string | null;
  whatsapp_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  payment_account_name: string | null;
  momo_number: string | null;
  preferred_payment_method: string | null;
  avatar_url: string | null;
  notify_email: boolean;
  notify_sms: boolean;
  is_active: boolean;
}

export interface ArtisanSignupDetails {
  location?: string;
  specialization?: string;
  bio?: string;
  gender?: string;
  dateOfBirth?: string;
  avatarUrl?: string;
  businessName?: string;
  artisanCategory?: string;
  yearsExperience?: number;
  address?: string;
  region?: string;
  city?: string;
  digitalAddress?: string;
  idType?: string;
  idNumber?: string;
  idCardUrl?: string;
  portfolioUrls?: string[];
  priceRange?: string;
  availability?: string;
  workingDays?: string[];
  workingHours?: string;
  whatsappNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  paymentAccountName?: string;
  momoNumber?: string;
  preferredPaymentMethod?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  role: AppRole | null;
  profile: Profile | null;
  loading: boolean;
  requestOtp: (phone: string, purpose: "login" | "signup") => Promise<{ error: Error | null }>;
  signUp: (
    phone: string,
    otpcode: string,
    fullName: string,
    role: AppRole,
    email?: string,
    details?: ArtisanSignupDetails,
  ) => Promise<{ error: Error | null }>;
  signIn: (phone: string, otpcode: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      const [roleRes, profileRes] = await Promise.all([
        db.from("user_roles").select("role").eq("user_id", userId).single(),
        db.from("profiles").select("*").eq("id", userId).single(),
      ]);
      setRole(roleRes.data?.role ?? null);
      setProfile(profileRes.data ?? null);
    } catch (e) {
      console.error("Error fetching user data:", e);
    }
  };

  useEffect(() => {
    db.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setRole(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const requestOtp = async (phone: string, purpose: "login" | "signup") => {
    const { error } = await db.auth.requestOtp({ phone, purpose });
    return { error };
  };

  const signUp = async (
    phone: string,
    otpcode: string,
    fullName: string,
    selectedRole: AppRole,
    email?: string,
    details?: ArtisanSignupDetails,
  ) => {
    const { error } = await db.auth.signUpWithOtp({
      phone,
      otpcode,
      email,
      options: {
        data: {
          full_name: fullName,
          role: selectedRole,
          location: details?.location,
          specialization: details?.specialization,
          bio: details?.bio,
          ...details,
        },
      },
    });
    if (!error) setRole(selectedRole);
    return { error };
  };

  const signIn = async (phone: string, otpcode: string) => {
    const { error } = await db.auth.signInWithOtp({ phone, otpcode });
    return { error };
  };

  const signOut = async () => {
    await db.auth.signOut();
    setRole(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchUserData(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        profile,
        loading,
        requestOtp,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
