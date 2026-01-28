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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      awards: {
        Row: {
          awarded_date: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          org_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          awarded_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          org_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          awarded_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          org_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "awards_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_url: string | null
          created_at: string
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuing_authority: string | null
          name: string
          org_id: string | null
          reminder_sent_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          name: string
          org_id?: string | null
          reminder_sent_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          name?: string
          org_id?: string | null
          reminder_sent_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      company_disciplinary: {
        Row: {
          change_summary: string | null
          content: string
          created_at: string
          edited_by: string | null
          id: string
          is_active: boolean
          source_disciplinary_key: string
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          change_summary?: string | null
          content: string
          created_at?: string
          edited_by?: string | null
          id?: string
          is_active?: boolean
          source_disciplinary_key: string
          title: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          change_summary?: string | null
          content?: string
          created_at?: string
          edited_by?: string | null
          id?: string
          is_active?: boolean
          source_disciplinary_key?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      company_policies: {
        Row: {
          change_summary: string | null
          content: string
          created_at: string
          edited_by: string | null
          id: string
          is_active: boolean
          source_policy_key: string
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          change_summary?: string | null
          content: string
          created_at?: string
          edited_by?: string | null
          id?: string
          is_active?: boolean
          source_policy_key: string
          title: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          change_summary?: string | null
          content?: string
          created_at?: string
          edited_by?: string | null
          id?: string
          is_active?: boolean
          source_policy_key?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      company_safety: {
        Row: {
          change_summary: string | null
          content: string
          created_at: string
          edited_by: string | null
          id: string
          is_active: boolean
          source_safety_key: string
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          change_summary?: string | null
          content: string
          created_at?: string
          edited_by?: string | null
          id?: string
          is_active?: boolean
          source_safety_key: string
          title: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          change_summary?: string | null
          content?: string
          created_at?: string
          edited_by?: string | null
          id?: string
          is_active?: boolean
          source_safety_key?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          created_at: string
          enable_custom_disciplinary: boolean
          enable_custom_policies: boolean
          enable_custom_safety: boolean
          enable_custom_sops: boolean
          enable_custom_training: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enable_custom_disciplinary?: boolean
          enable_custom_policies?: boolean
          enable_custom_safety?: boolean
          enable_custom_sops?: boolean
          enable_custom_training?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enable_custom_disciplinary?: boolean
          enable_custom_policies?: boolean
          enable_custom_safety?: boolean
          enable_custom_sops?: boolean
          enable_custom_training?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      company_sops: {
        Row: {
          change_summary: string | null
          content: string
          created_at: string
          edited_by: string | null
          id: string
          is_active: boolean
          source_sop_key: string
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          change_summary?: string | null
          content: string
          created_at?: string
          edited_by?: string | null
          id?: string
          is_active?: boolean
          source_sop_key: string
          title: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          change_summary?: string | null
          content?: string
          created_at?: string
          edited_by?: string | null
          id?: string
          is_active?: boolean
          source_sop_key?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      company_training: {
        Row: {
          change_summary: string | null
          content: string
          created_at: string
          edited_by: string | null
          id: string
          is_active: boolean
          source_training_key: string
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          change_summary?: string | null
          content: string
          created_at?: string
          edited_by?: string | null
          id?: string
          is_active?: boolean
          source_training_key: string
          title: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          change_summary?: string | null
          content?: string
          created_at?: string
          edited_by?: string | null
          id?: string
          is_active?: boolean
          source_training_key?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      disclaimer_acceptances: {
        Row: {
          accepted_at: string
          disclaimer_version: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          disclaimer_version?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          disclaimer_version?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      org_users: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          org_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          tagline: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          tagline?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          tagline?: string | null
        }
        Relationships: []
      }
      points_balance: {
        Row: {
          available_points: number | null
          id: string
          redeemed_points: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_points?: number | null
          id?: string
          redeemed_points?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_points?: number | null
          id?: string
          redeemed_points?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company_name: string | null
          country: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          preferred_language: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          preferred_language?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          preferred_language?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          created_at: string
          id: string
          passed: boolean
          points_earned: number
          score: number
          section_key: string
          total_questions: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          passed: boolean
          points_earned?: number
          score: number
          section_key: string
          total_questions: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          passed?: boolean
          points_earned?: number
          score?: number
          section_key?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          correct_answer: number
          created_at: string
          id: string
          options: Json
          question: string
          section_key: string
          user_id: string
        }
        Insert: {
          correct_answer: number
          created_at?: string
          id?: string
          options: Json
          question: string
          section_key: string
          user_id: string
        }
        Update: {
          correct_answer?: number
          created_at?: string
          id?: string
          options?: Json
          question?: string
          section_key?: string
          user_id?: string
        }
        Relationships: []
      }
      redemption_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          points_requested: number
          processed_at: string | null
          processed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          points_requested: number
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          points_requested?: number
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      section_item_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          item_key: string
          points_earned: number
          section_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          item_key: string
          points_earned?: number
          section_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          item_key?: string
          points_earned?: number
          section_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      section_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          section_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          section_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          section_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sop_acknowledgments: {
        Row: {
          acknowledged_at: string
          id: string
          ip_address: string | null
          sop_key: string
          sop_version: number
          user_agent: string | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          id?: string
          ip_address?: string | null
          sop_key: string
          sop_version?: number
          user_agent?: string | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          id?: string
          ip_address?: string | null
          sop_key?: string
          sop_version?: number
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sop_acks: {
        Row: {
          ack_epoch: number
          acknowledged_at: string
          id: string
          ip_address: string | null
          org_user_id: string | null
          sop_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          ack_epoch: number
          acknowledged_at?: string
          id?: string
          ip_address?: string | null
          org_user_id?: string | null
          sop_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          ack_epoch?: number
          acknowledged_at?: string
          id?: string
          ip_address?: string | null
          org_user_id?: string | null
          sop_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_acks_org_user_id_fkey"
            columns: ["org_user_id"]
            isOneToOne: false
            referencedRelation: "org_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_acks_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_assignments: {
        Row: {
          assigned_role: Database["public"]["Enums"]["app_role"]
          created_at: string
          id: string
          requires_acknowledgment: boolean
          sop_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_role: Database["public"]["Enums"]["app_role"]
          created_at?: string
          id?: string
          requires_acknowledgment?: boolean
          sop_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          id?: string
          requires_acknowledgment?: boolean
          sop_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sop_quiz_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          points_earned: number
          sop_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          points_earned?: number
          sop_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          points_earned?: number
          sop_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sop_role_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_required: boolean
          org_id: string
          role: string
          sop_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_required?: boolean
          org_id: string
          role: string
          sop_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_required?: boolean
          org_id?: string
          role?: string
          sop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_role_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_role_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_role_assignments_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
        ]
      }
      sops: {
        Row: {
          ack_epoch: number
          ack_required: boolean
          ack_reset_on_change: boolean
          content_md: string
          created_at: string
          created_by: string | null
          forked_from_sop_id: string | null
          id: string
          last_change_summary: string | null
          org_id: string | null
          source: string
          status: string
          system_key: string | null
          title: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          ack_epoch?: number
          ack_required?: boolean
          ack_reset_on_change?: boolean
          content_md: string
          created_at?: string
          created_by?: string | null
          forked_from_sop_id?: string | null
          id?: string
          last_change_summary?: string | null
          org_id?: string | null
          source: string
          status?: string
          system_key?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          ack_epoch?: number
          ack_required?: boolean
          ack_reset_on_change?: boolean
          content_md?: string
          created_at?: string
          created_by?: string | null
          forked_from_sop_id?: string | null
          id?: string
          last_change_summary?: string | null
          org_id?: string | null
          source?: string
          status?: string
          system_key?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sops_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sops_forked_from_sop_id_fkey"
            columns: ["forked_from_sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sops_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sops_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "org_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      get_leaderboard: {
        Args: never
        Returns: {
          available_points: number
          full_name: string
          sections_completed: number
          total_points: number
        }[]
      }
      get_secure_leaderboard: {
        Args: never
        Returns: {
          available_points: number
          full_name: string
          sections_completed: number
          total_points: number
        }[]
      }
      get_user_assigned_sops: {
        Args: { _user_id: string }
        Returns: {
          ack_epoch: number
          ack_required: boolean
          content_md: string
          is_acknowledged: boolean
          sop_id: string
          source: string
          system_key: string
          title: string
          version: number
        }[]
      }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      has_acknowledged_sop: {
        Args: { _sop_id: string; _user_id: string }
        Returns: boolean
      }
      has_org_role: {
        Args: { _org_id: string; _role: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_new_data?: Json
          p_old_data?: Json
          p_record_id?: string
          p_table_name?: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "employee"
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
      app_role: ["admin", "employee"],
    },
  },
} as const
