export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      matches: {
        Row: {
          court_booked: boolean
          court_location: string
          created_at: string
          creator_id: string
          date_time: string
          desired_max_rating: number | null
          desired_min_rating: number | null
          id: string
          match_type: Database["public"]["Enums"]["match_type"]
          message: string | null
          opponent_id: string | null
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
        }
        Insert: {
          court_booked?: boolean
          court_location: string
          created_at?: string
          creator_id: string
          date_time: string
          desired_max_rating?: number | null
          desired_min_rating?: number | null
          id?: string
          match_type: Database["public"]["Enums"]["match_type"]
          message?: string | null
          opponent_id?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
        }
        Update: {
          court_booked?: boolean
          court_location?: string
          created_at?: string
          creator_id?: string
          date_time?: string
          desired_max_rating?: number | null
          desired_min_rating?: number | null
          id?: string
          match_type?: Database["public"]["Enums"]["match_type"]
          message?: string | null
          opponent_id?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          availability: string[]
          bio: string | null
          created_at: string
          current_rating: number | null
          email: string
          id: string
          initial_rating: number | null
          level: number | null
          losses: number
          name: string
          onboarded: boolean
          phone: string | null
          photo_url: string | null
          preferred_courts: string[]
          provisional: boolean
          rated_matches: number
          updated_at: string
          wins: number
        }
        Insert: {
          availability?: string[]
          bio?: string | null
          created_at?: string
          current_rating?: number | null
          email?: string
          id: string
          initial_rating?: number | null
          level?: number | null
          losses?: number
          name?: string
          onboarded?: boolean
          phone?: string | null
          photo_url?: string | null
          preferred_courts?: string[]
          provisional?: boolean
          rated_matches?: number
          updated_at?: string
          wins?: number
        }
        Update: {
          availability?: string[]
          bio?: string | null
          created_at?: string
          current_rating?: number | null
          email?: string
          id?: string
          initial_rating?: number | null
          level?: number | null
          losses?: number
          name?: string
          onboarded?: boolean
          phone?: string | null
          photo_url?: string | null
          preferred_courts?: string[]
          provisional?: boolean
          rated_matches?: number
          updated_at?: string
          wins?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          availability: string[] | null
          bio: string | null
          created_at: string | null
          current_rating: number | null
          id: string | null
          initial_rating: number | null
          level: number | null
          losses: number | null
          name: string | null
          onboarded: boolean | null
          photo_url: string | null
          preferred_courts: string[] | null
          provisional: boolean | null
          rated_matches: number | null
          wins: number | null
        }
        Insert: {
          availability?: string[] | null
          bio?: string | null
          created_at?: string | null
          current_rating?: number | null
          id?: string | null
          initial_rating?: number | null
          level?: number | null
          losses?: number | null
          name?: string | null
          onboarded?: boolean | null
          photo_url?: string | null
          preferred_courts?: string[] | null
          provisional?: boolean | null
          rated_matches?: number | null
          wins?: number | null
        }
        Update: {
          availability?: string[] | null
          bio?: string | null
          created_at?: string | null
          current_rating?: number | null
          id?: string | null
          initial_rating?: number | null
          level?: number | null
          losses?: number | null
          name?: string | null
          onboarded?: boolean | null
          photo_url?: string | null
          preferred_courts?: string[] | null
          provisional?: boolean | null
          rated_matches?: number | null
          wins?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_match: {
        Args: { _id: string }
        Returns: {
          court_booked: boolean
          court_location: string
          created_at: string
          creator_id: string
          date_time: string
          desired_max_rating: number | null
          desired_min_rating: number | null
          id: string
          match_type: Database["public"]["Enums"]["match_type"]
          message: string | null
          opponent_id: string | null
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_onboarding: {
        Args: {
          _availability: string[]
          _bio: string
          _level: number
          _name: string
          _phone: string
          _photo_url: string
          _preferred_courts: string[]
        }
        Returns: {
          availability: string[]
          bio: string | null
          created_at: string
          current_rating: number | null
          email: string
          id: string
          initial_rating: number | null
          level: number | null
          losses: number
          name: string
          onboarded: boolean
          phone: string | null
          photo_url: string | null
          preferred_courts: string[]
          provisional: boolean
          rated_matches: number
          updated_at: string
          wins: number
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      correct_starting_level: {
        Args: { _level: number }
        Returns: {
          availability: string[]
          bio: string | null
          created_at: string
          current_rating: number | null
          email: string
          id: string
          initial_rating: number | null
          level: number | null
          losses: number
          name: string
          onboarded: boolean
          phone: string | null
          photo_url: string | null
          preferred_courts: string[]
          provisional: boolean
          rated_matches: number
          updated_at: string
          wins: number
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decline_match: {
        Args: { _id: string }
        Returns: {
          court_booked: boolean
          court_location: string
          created_at: string
          creator_id: string
          date_time: string
          desired_max_rating: number | null
          desired_min_rating: number | null
          id: string
          match_type: Database["public"]["Enums"]["match_type"]
          message: string | null
          opponent_id: string | null
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_my_profile: {
        Args: never
        Returns: {
          availability: string[]
          bio: string | null
          created_at: string
          current_rating: number | null
          email: string
          id: string
          initial_rating: number | null
          level: number | null
          losses: number
          name: string
          onboarded: boolean
          phone: string | null
          photo_url: string | null
          preferred_courts: string[]
          provisional: boolean
          rated_matches: number
          updated_at: string
          wins: number
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_profile_with_phone: {
        Args: { _id: string }
        Returns: {
          availability: string[]
          bio: string | null
          created_at: string
          current_rating: number | null
          email: string
          id: string
          initial_rating: number | null
          level: number | null
          losses: number
          name: string
          onboarded: boolean
          phone: string | null
          photo_url: string | null
          preferred_courts: string[]
          provisional: boolean
          rated_matches: number
          updated_at: string
          wins: number
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "player" | "admin"
      match_status:
        | "open"
        | "invited"
        | "accepted"
        | "declined"
        | "score_pending"
        | "confirmation_pending"
        | "confirmed"
        | "disputed"
        | "cancelled"
        | "expired"
        | "voided"
      match_type: "rated" | "friendly"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["player", "admin"],
      match_status: [
        "open",
        "invited",
        "accepted",
        "declined",
        "score_pending",
        "confirmation_pending",
        "confirmed",
        "disputed",
        "cancelled",
        "expired",
        "voided",
      ],
      match_type: ["rated", "friendly"],
    },
  },
} as const
