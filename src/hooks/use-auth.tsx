import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AppRole } from "@/types/database";
import { db, type AuthSession, type AuthUser } from "@/lib/app-db";

interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  location: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_location_at: string | null;
  specialization: string | null;
  bio: string | null;
  avatar_url: string | null;
  notify_email: boolean;
  notify_sms: boolean;
  is_active: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  role: AppRole | null;
  profile: Profile | null;
  loading: boolean;
  requestOtp: (
    phone: string,
    purpose: "login" | "signup",
  ) => Promise<{ error: Error | null }>;
  signUp: (
    phone: string,
    otpcode: string,
    fullName: string,
    role: AppRole,
    email?: string,
    details?: {
      location?: string;
      specialization?: string;
      bio?: string;
    },
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

  useEffect(() => {
    if (!user || role !== "artisan" || !navigator.geolocation) return;

    let lastSentAt = 0;
    let bestAccuracy = Number.POSITIVE_INFINITY;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        // Network-based desktop fixes can be kilometres away. Keep the saved address
        // fallback until the browser provides a reasonably precise GPS reading.
        if (position.coords.accuracy > 500) return;

        const now = Date.now();
        const accuracyImproved = position.coords.accuracy < bestAccuracy;
        const refreshDue = now - lastSentAt >= 30_000;
        if (!accuracyImproved && !refreshDue) return;

        bestAccuracy = Math.min(bestAccuracy, position.coords.accuracy);
        lastSentAt = now;
        void db.updateMyLocation(
          position.coords.latitude,
          position.coords.longitude,
          new Date(position.timestamp).toISOString(),
        ).catch((error) => console.error("Could not update artisan location:", error));
      },
      (error) => console.error("Could not read artisan location:", error.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [role, user]);

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
    details?: {
      location?: string;
      specialization?: string;
      bio?: string;
    },
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
