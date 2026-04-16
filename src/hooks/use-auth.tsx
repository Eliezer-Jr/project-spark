import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AppRole } from "@/types/database";
import { db, type AuthSession, type AuthUser } from "@/lib/app-db";

interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  location: string | null;
  specialization: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  role: AppRole | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: AppRole) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
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

    const { data: { subscription } } = db.auth.onAuthStateChange((_event, session) => {
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

  const signUp = async (email: string, password: string, fullName: string, selectedRole: AppRole) => {
    const { error } = await db.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: selectedRole } },
    });
    if (!error) setRole(selectedRole);
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await db.auth.signInWithPassword({ email, password });
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
    <AuthContext.Provider value={{ user, session, role, profile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
