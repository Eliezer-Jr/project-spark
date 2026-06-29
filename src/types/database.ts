export type AppRole = "admin" | "artisan" | "customer";

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type QuoteStatus =
  | "draft"
  | "awaiting_response"
  | "changes_requested"
  | "approved"
  | "converted"
  | "archived";
export type WorkRequestStatus = "new" | "reviewing" | "scheduled" | "closed";
export type PaymentStatus = "pending" | "successful" | "failed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
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
        Insert: Omit<
          Database["public"]["Tables"]["service_categories"]["Row"],
          "id" | "created_at"
        >;
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
        Insert: Omit<
          Database["public"]["Tables"]["customers"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
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
          journey_status: "not_started" | "en_route" | "arrived";
          artisan_location_sharing: boolean;
          customer_location_sharing: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["appointments"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
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
      quotes: {
        Row: {
          id: string;
          artisan_id: string;
          customer_id: string | null;
          customer_user_id: string | null;
          appointment_id: string | null;
          title: string;
          description: string | null;
          amount: number;
          deposit_amount: number | null;
          status: QuoteStatus;
          requested_changes: string | null;
          valid_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["quotes"]["Row"],
          "id" | "created_at" | "updated_at" | "appointment_id"
        > & { appointment_id?: string | null };
        Update: Partial<Database["public"]["Tables"]["quotes"]["Insert"]>;
      };
      work_requests: {
        Row: {
          id: string;
          artisan_id: string | null;
          customer_user_id: string;
          title: string;
          description: string;
          preferred_date: string | null;
          status: WorkRequestStatus;
          response_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["work_requests"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["work_requests"]["Insert"]>;
      };
      payments: {
        Row: {
          id: string;
          quote_id: string | null;
          artisan_id: string;
          customer_user_id: string;
          amount: number;
          currency: string;
          phone: string;
          provider: "redde";
          provider_reference: string | null;
          checkout_url: string | null;
          status: PaymentStatus;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["payments"]["Row"],
          "id" | "provider" | "created_at" | "updated_at"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["payments"]["Row"],
              "id" | "provider" | "created_at" | "updated_at"
            >
          >;
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
      };
    };
    Enums: {
      app_role: AppRole;
      appointment_status: AppointmentStatus;
      quote_status: QuoteStatus;
      work_request_status: WorkRequestStatus;
      payment_status: PaymentStatus;
    };
    Functions: {
      has_role: {
        Args: { _user_id: string; _role: AppRole };
        Returns: boolean;
      };
    };
  };
}
