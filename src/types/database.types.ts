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
      folios: {
        Row: {
          closed_at: string | null
          created_at: string | null
          id: string
          reservation_id: string
          status: Database["public"]["Enums"]["folio_status"]
        }
        Insert: {
          closed_at?: string | null
          created_at?: string | null
          id?: string
          reservation_id: string
          status?: Database["public"]["Enums"]["folio_status"]
        }
        Update: {
          closed_at?: string | null
          created_at?: string | null
          id?: string
          reservation_id?: string
          status?: Database["public"]["Enums"]["folio_status"]
        }
        Relationships: [
          {
            foreignKeyName: "folios_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          created_at: string | null
          first_name: string
          id: string
          identity_number: string
          last_name: string
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          first_name: string
          id?: string
          identity_number: string
          last_name: string
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string
          id?: string
          identity_number?: string
          last_name?: string
          phone?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      reservation_guests: {
        Row: {
          created_at: string | null
          guest_id: string
          id: string
          is_primary_guest: boolean
          reservation_id: string
        }
        Insert: {
          created_at?: string | null
          guest_id: string
          id?: string
          is_primary_guest?: boolean
          reservation_id: string
        }
        Update: {
          created_at?: string | null
          guest_id?: string
          id?: string
          is_primary_guest?: boolean
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_guests_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_guests_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          agency_name: string | null
          channel: string | null
          check_in_date: string
          check_out_date: string
          guest_id: string
          id: string
          room_id: string
          status: Database["public"]["Enums"]["reservation_status"] | null
          total_price: number | null
        }
        Insert: {
          agency_name?: string | null
          channel?: string | null
          check_in_date: string
          check_out_date: string
          guest_id: string
          id?: string
          room_id: string
          status?: Database["public"]["Enums"]["reservation_status"] | null
          total_price?: number | null
        }
        Update: {
          agency_name?: string | null
          channel?: string | null
          check_in_date?: string
          check_out_date?: string
          guest_id?: string
          id?: string
          room_id?: string
          status?: Database["public"]["Enums"]["reservation_status"] | null
          total_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          bed_config: Database["public"]["Enums"]["bed_config_type"]
          hk_status: Database["public"]["Enums"]["hk_status"] | null
          id: string
          room_number: string
          type: Database["public"]["Enums"]["room_type"]
        }
        Insert: {
          bed_config?: Database["public"]["Enums"]["bed_config_type"]
          hk_status?: Database["public"]["Enums"]["hk_status"] | null
          id?: string
          room_number: string
          type: Database["public"]["Enums"]["room_type"]
        }
        Update: {
          bed_config?: Database["public"]["Enums"]["bed_config_type"]
          hk_status?: Database["public"]["Enums"]["hk_status"] | null
          id?: string
          room_number?: string
          type?: Database["public"]["Enums"]["room_type"]
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          description: string | null
          folio_id: string
          id: string
          is_cleared: boolean | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          folio_id: string
          id?: string
          is_cleared?: boolean | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          folio_id?: string
          id?: string
          is_cleared?: boolean | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_folio_id_fkey"
            columns: ["folio_id"]
            isOneToOne: false
            referencedRelation: "folios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      bed_config_type:
        | "SINGLE"
        | "DOUBLE"
        | "TWIN"
        | "DOUBLE_SINGLE"
        | "DOUBLE_TWIN"
        | "TRIPLE"
      folio_status: "OPEN" | "CLOSED" | "SETTLED"
      hk_status: "CLEAN" | "DIRTY" | "INSPECTED"
      payment_method: "CASH" | "CREDIT_CARD" | "BANK_TRANSFER" | "CITY_LEDGER"
      reservation_status: "PENDING" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED"
      room_type: "STANDARD" | "SUITE" | "FAMILY"
      transaction_type: "ROOM_CHARGE" | "EXTRA" | "PAYMENT"
      user_role: "ADMIN" | "RECEPTIONIST" | "HOUSEKEEPER"
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
      bed_config_type: [
        "SINGLE",
        "DOUBLE",
        "TWIN",
        "DOUBLE_SINGLE",
        "DOUBLE_TWIN",
        "TRIPLE",
      ],
      folio_status: ["OPEN", "CLOSED", "SETTLED"],
      hk_status: ["CLEAN", "DIRTY", "INSPECTED"],
      payment_method: ["CASH", "CREDIT_CARD", "BANK_TRANSFER", "CITY_LEDGER"],
      reservation_status: ["PENDING", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"],
      room_type: ["STANDARD", "SUITE", "FAMILY"],
      transaction_type: ["ROOM_CHARGE", "EXTRA", "PAYMENT"],
      user_role: ["ADMIN", "RECEPTIONIST", "HOUSEKEEPER"],
    },
  },
} as const
