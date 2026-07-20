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
      assessment_answers: {
        Row: {
          answered_at: string
          assessment_id: string
          id: string
          question_id: string
          value: number
        }
        Insert: {
          answered_at?: string
          assessment_id: string
          id?: string
          question_id: string
          value: number
        }
        Update: {
          answered_at?: string
          assessment_id?: string
          id?: string
          question_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_answers_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_questions: {
        Row: {
          category: string | null
          description: string | null
          dimension: string
          id: string
          module: Database["public"]["Enums"]["assessment_module"]
          order_index: number
          scale: Database["public"]["Enums"]["answer_scale"]
          title: string
        }
        Insert: {
          category?: string | null
          description?: string | null
          dimension: string
          id?: string
          module: Database["public"]["Enums"]["assessment_module"]
          order_index: number
          scale: Database["public"]["Enums"]["answer_scale"]
          title: string
        }
        Update: {
          category?: string | null
          description?: string | null
          dimension?: string
          id?: string
          module?: Database["public"]["Enums"]["assessment_module"]
          order_index?: number
          scale?: Database["public"]["Enums"]["answer_scale"]
          title?: string
        }
        Relationships: []
      }
      assessments: {
        Row: {
          completed_at: string | null
          created_at: string
          current_question_id: string | null
          id: string
          patient_id: string
          status: Database["public"]["Enums"]["assessment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_question_id?: string | null
          id?: string
          patient_id: string
          status?: Database["public"]["Enums"]["assessment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_question_id?: string | null
          id?: string
          patient_id?: string
          status?: Database["public"]["Enums"]["assessment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_current_question_id_fkey"
            columns: ["current_question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          active: boolean
          behavioral_condition: string | null
          created_at: string
          id: string
          image_url: string | null
          intervention_text: string
          module: string
          severity_level: string | null
          subcategory: string | null
          updated_at: string
          version: string
        }
        Insert: {
          active?: boolean
          behavioral_condition?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          intervention_text: string
          module: string
          severity_level?: string | null
          subcategory?: string | null
          updated_at?: string
          version?: string
        }
        Update: {
          active?: boolean
          behavioral_condition?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          intervention_text?: string
          module?: string
          severity_level?: string | null
          subcategory?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      moholka_conversations: {
        Row: {
          created_at: string
          id: string
          patient_id: string
          roadmap_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          patient_id: string
          roadmap_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string
          roadmap_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moholka_conversations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moholka_conversations_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "neurodevelopment_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      moholka_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "moholka_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "moholka_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      neurodevelopment_roadmaps: {
        Row: {
          assessment_id: string
          cognitive: Json
          functional: Json
          generated_at: string
          id: string
          manual_pdf_url: string | null
          patient_id: string
          plan_activated_at: string | null
          plan_content: Json | null
          plan_generated_at: string | null
          plan_generation_status: string
          plan_pdf_url: string | null
          plan_status: Database["public"]["Enums"]["plan_status"]
          priorities: Json
          reflexes: Json
          regenerated_at: string | null
          regenerated_by: string | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          assessment_id: string
          cognitive: Json
          functional: Json
          generated_at?: string
          id?: string
          manual_pdf_url?: string | null
          patient_id: string
          plan_activated_at?: string | null
          plan_content?: Json | null
          plan_generated_at?: string | null
          plan_generation_status?: string
          plan_pdf_url?: string | null
          plan_status?: Database["public"]["Enums"]["plan_status"]
          priorities: Json
          reflexes: Json
          regenerated_at?: string | null
          regenerated_by?: string | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          assessment_id?: string
          cognitive?: Json
          functional?: Json
          generated_at?: string
          id?: string
          manual_pdf_url?: string | null
          patient_id?: string
          plan_activated_at?: string | null
          plan_content?: Json | null
          plan_generated_at?: string | null
          plan_generation_status?: string
          plan_pdf_url?: string | null
          plan_status?: Database["public"]["Enums"]["plan_status"]
          priorities?: Json
          reflexes?: Json
          regenerated_at?: string | null
          regenerated_by?: string | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "initial_reports_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "neurodevelopment_roadmaps_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          neuropsicologo_id: string
          patient_id: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          neuropsicologo_id: string
          patient_id: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          neuropsicologo_id?: string
          patient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          city: string | null
          created_at: string
          date_of_birth: string
          developmental_history: string | null
          diagnosis: string | null
          first_name: string
          id: string
          interventions: string | null
          last_name: string
          parent_email: string | null
          parent_name: string | null
          parent_phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          date_of_birth: string
          developmental_history?: string | null
          diagnosis?: string | null
          first_name: string
          id?: string
          interventions?: string | null
          last_name: string
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          date_of_birth?: string
          developmental_history?: string | null
          diagnosis?: string | null
          first_name?: string
          id?: string
          interventions?: string | null
          last_name?: string
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          assessment_id: string | null
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          patient_id: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
          wompi_reference: string | null
          wompi_transaction_id: string | null
        }
        Insert: {
          amount: number
          assessment_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          patient_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
          wompi_reference?: string | null
          wompi_transaction_id?: string | null
        }
        Update: {
          amount?: number
          assessment_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          patient_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
          wompi_reference?: string | null
          wompi_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          child_dob: string | null
          child_name: string | null
          created_at: string
          full_name: string | null
          id: string
          onboarding_completed: boolean
          updated_at: string
        }
        Insert: {
          child_dob?: string | null
          child_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          onboarding_completed?: boolean
          updated_at?: string
        }
        Update: {
          child_dob?: string | null
          child_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          accepted_at: string
          id: string
          policy_kind: string
          policy_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          policy_kind: string
          policy_version: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          policy_kind?: string
          policy_version?: string
          user_agent?: string | null
          user_id?: string
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
      [_ in never]: never
    }
    Functions: {
      can_view_patient: {
        Args: { _patient_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      answer_scale: "cog3" | "func10" | "reflex5"
      app_role: "usuario" | "administrador" | "neuropsicologo"
      assessment_module: "cognitive" | "functional" | "reflex"
      assessment_status: "in_progress" | "completed"
      payment_status: "pending" | "paid" | "failed" | "cancelled" | "rejected"
      plan_status: "locked" | "unlocked"
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
      answer_scale: ["cog3", "func10", "reflex5"],
      app_role: ["usuario", "administrador", "neuropsicologo"],
      assessment_module: ["cognitive", "functional", "reflex"],
      assessment_status: ["in_progress", "completed"],
      payment_status: ["pending", "paid", "failed", "cancelled", "rejected"],
      plan_status: ["locked", "unlocked"],
    },
  },
} as const
