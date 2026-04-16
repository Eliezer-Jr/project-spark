export type AppRole = "admin" | "artisan" | "customer";

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          location: string | null;
          specialization: string | null;
          bio: string | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: AppRole;
        };
        Insert: Omit<Database["public"]["Tables"]["user_roles"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["user_roles"]["Insert"]>;
      };
      service_categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          icon: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["service_categories"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["service_categories"]["Insert"]>;
      };
      customers: {
        Row: {
          id: string;
          artisan_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["customers"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
      };
      service_records: {
        Row: {
          id: string;
          artisan_id: string;
          customer_id: string;
          category_id: string | null;
          description: string;
          cost: number | null;
          status: string;
          service_date: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["service_records"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["service_records"]["Insert"]>;
      };
      appointments: {
        Row: {
          id: string;
          artisan_id: string;
          customer_id: string | null;
          customer_user_id: string | null;
          category_id: string | null;
          title: string;
          description: string | null;
          scheduled_date: string;
          scheduled_time: string;
          status: AppointmentStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["appointments"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["appointments"]["Insert"]>;
      };
      feedback: {
        Row: {
          id: string;
          artisan_id: string;
          customer_user_id: string;
          appointment_id: string | null;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["feedback"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["feedback"]["Insert"]>;
      };
    };
    Enums: {
      app_role: AppRole;
      appointment_status: AppointmentStatus;
    };
    Functions: {
      has_role: {
        Args: { _user_id: string; _role: AppRole };
        Returns: boolean;
      };
    };
  };
}
