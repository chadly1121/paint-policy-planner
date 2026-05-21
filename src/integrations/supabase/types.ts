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
          auto_granted: boolean
          awarded_date: string | null
          code: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          org_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          auto_granted?: boolean
          awarded_date?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          org_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          auto_granted?: boolean
          awarded_date?: string | null
          code?: string | null
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
          content: string | null
          created_at: string
          doc_id_external: string | null
          drive_file_id: string | null
          drive_folder_id: string | null
          drive_modified_time: string | null
          edited_by: string | null
          id: string
          is_active: boolean
          parsed_sections: Json | null
          source_disciplinary_key: string
          title: string
          updated_at: string
          user_id: string
          version: number
          video_url: string | null
        }
        Insert: {
          change_summary?: string | null
          content?: string | null
          created_at?: string
          doc_id_external?: string | null
          drive_file_id?: string | null
          drive_folder_id?: string | null
          drive_modified_time?: string | null
          edited_by?: string | null
          id?: string
          is_active?: boolean
          parsed_sections?: Json | null
          source_disciplinary_key: string
          title: string
          updated_at?: string
          user_id: string
          version?: number
          video_url?: string | null
        }
        Update: {
          change_summary?: string | null
          content?: string | null
          created_at?: string
          doc_id_external?: string | null
          drive_file_id?: string | null
          drive_folder_id?: string | null
          drive_modified_time?: string | null
          edited_by?: string | null
          id?: string
          is_active?: boolean
          parsed_sections?: Json | null
          source_disciplinary_key?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
          video_url?: string | null
        }
        Relationships: []
      }
      company_forms: {
        Row: {
          change_summary: string | null
          content: string | null
          created_at: string
          doc_id_external: string | null
          drive_file_id: string | null
          drive_folder_id: string | null
          drive_modified_time: string | null
          edited_by: string | null
          id: string
          is_active: boolean
          parsed_sections: Json | null
          source_form_key: string
          title: string
          updated_at: string
          user_id: string
          version: number
          video_url: string | null
        }
        Insert: {
          change_summary?: string | null
          content?: string | null
          created_at?: string
          doc_id_external?: string | null
          drive_file_id?: string | null
          drive_folder_id?: string | null
          drive_modified_time?: string | null
          edited_by?: string | null
          id?: string
          is_active?: boolean
          parsed_sections?: Json | null
          source_form_key: string
          title: string
          updated_at?: string
          user_id: string
          version?: number
          video_url?: string | null
        }
        Update: {
          change_summary?: string | null
          content?: string | null
          created_at?: string
          doc_id_external?: string | null
          drive_file_id?: string | null
          drive_folder_id?: string | null
          drive_modified_time?: string | null
          edited_by?: string | null
          id?: string
          is_active?: boolean
          parsed_sections?: Json | null
          source_form_key?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
          video_url?: string | null
        }
        Relationships: []
      }
      company_policies: {
        Row: {
          change_summary: string | null
          content: string | null
          created_at: string
          doc_id_external: string | null
          drive_file_id: string | null
          drive_folder_id: string | null
          drive_modified_time: string | null
          edited_by: string | null
          id: string
          is_active: boolean
          parsed_sections: Json | null
          source_policy_key: string
          title: string
          updated_at: string
          user_id: string
          version: number
          video_url: string | null
        }
        Insert: {
          change_summary?: string | null
          content?: string | null
          created_at?: string
          doc_id_external?: string | null
          drive_file_id?: string | null
          drive_folder_id?: string | null
          drive_modified_time?: string | null
          edited_by?: string | null
          id?: string
          is_active?: boolean
          parsed_sections?: Json | null
          source_policy_key: string
          title: string
          updated_at?: string
          user_id: string
          version?: number
          video_url?: string | null
        }
        Update: {
          change_summary?: string | null
          content?: string | null
          created_at?: string
          doc_id_external?: string | null
          drive_file_id?: string | null
          drive_folder_id?: string | null
          drive_modified_time?: string | null
          edited_by?: string | null
          id?: string
          is_active?: boolean
          parsed_sections?: Json | null
          source_policy_key?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
          video_url?: string | null
        }
        Relationships: []
      }
      company_safety: {
        Row: {
          change_summary: string | null
          content: string | null
          created_at: string
          doc_id_external: string | null
          drive_file_id: string | null
          drive_folder_id: string | null
          drive_modified_time: string | null
          edited_by: string | null
          id: string
          is_active: boolean
          parsed_sections: Json | null
          source_safety_key: string
          title: string
          updated_at: string
          user_id: string
          version: number
          video_url: string | null
        }
        Insert: {
          change_summary?: string | null
          content?: string | null
          created_at?: string
          doc_id_external?: string | null
          drive_file_id?: string | null
          drive_folder_id?: string | null
          drive_modified_time?: string | null
          edited_by?: string | null
          id?: string
          is_active?: boolean
          parsed_sections?: Json | null
          source_safety_key: string
          title: string
          updated_at?: string
          user_id: string
          version?: number
          video_url?: string | null
        }
        Update: {
          change_summary?: string | null
          content?: string | null
          created_at?: string
          doc_id_external?: string | null
          drive_file_id?: string | null
          drive_folder_id?: string | null
          drive_modified_time?: string | null
          edited_by?: string | null
          id?: string
          is_active?: boolean
          parsed_sections?: Json | null
          source_safety_key?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
          video_url?: string | null
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
          doc_id_external: string | null
          drive_modified_time: string | null
          edited_by: string | null
          id: string
          is_active: boolean
          parsed_sections: Json | null
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
          doc_id_external?: string | null
          drive_modified_time?: string | null
          edited_by?: string | null
          id?: string
          is_active?: boolean
          parsed_sections?: Json | null
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
          doc_id_external?: string | null
          drive_modified_time?: string | null
          edited_by?: string | null
          id?: string
          is_active?: boolean
          parsed_sections?: Json | null
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
          content: string | null
          created_at: string
          doc_id_external: string | null
          drive_file_id: string | null
          drive_folder_id: string | null
          drive_modified_time: string | null
          edited_by: string | null
          id: string
          is_active: boolean
          parsed_sections: Json | null
          source_training_key: string
          title: string
          updated_at: string
          user_id: string
          version: number
          video_url: string | null
        }
        Insert: {
          change_summary?: string | null
          content?: string | null
          created_at?: string
          doc_id_external?: string | null
          drive_file_id?: string | null
          drive_folder_id?: string | null
          drive_modified_time?: string | null
          edited_by?: string | null
          id?: string
          is_active?: boolean
          parsed_sections?: Json | null
          source_training_key: string
          title: string
          updated_at?: string
          user_id: string
          version?: number
          video_url?: string | null
        }
        Update: {
          change_summary?: string | null
          content?: string | null
          created_at?: string
          doc_id_external?: string | null
          drive_file_id?: string | null
          drive_folder_id?: string | null
          drive_modified_time?: string | null
          edited_by?: string | null
          id?: string
          is_active?: boolean
          parsed_sections?: Json | null
          source_training_key?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
          video_url?: string | null
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
      document_relationships: {
        Row: {
          created_at: string
          created_by: string | null
          from_doc_id_external: string
          id: string
          notes: string | null
          org_id: string
          relationship_type: Database["public"]["Enums"]["doc_relationship_type"]
          source: string
          to_doc_id_external: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_doc_id_external: string
          id?: string
          notes?: string | null
          org_id: string
          relationship_type?: Database["public"]["Enums"]["doc_relationship_type"]
          source?: string
          to_doc_id_external: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_doc_id_external?: string
          id?: string
          notes?: string | null
          org_id?: string
          relationship_type?: Database["public"]["Enums"]["doc_relationship_type"]
          source?: string
          to_doc_id_external?: string
          updated_at?: string
        }
        Relationships: []
      }
      drive_file_metadata: {
        Row: {
          created_at: string
          drive_file_id: string
          id: string
          org_id: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          drive_file_id: string
          id?: string
          org_id: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          drive_file_id?: string
          id?: string
          org_id?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drive_file_metadata_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_reports: {
        Row: {
          corrective_actions: string | null
          created_at: string
          description: string
          drive_file_id: string | null
          id: string
          immediate_actions: string | null
          incident_date: string
          incident_time: string | null
          injuries_reported: boolean | null
          injury_details: string | null
          is_near_miss: boolean
          location: string
          org_id: string
          reported_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          root_cause: string | null
          severity: string
          status: string
          updated_at: string
          witnesses: string | null
        }
        Insert: {
          corrective_actions?: string | null
          created_at?: string
          description: string
          drive_file_id?: string | null
          id?: string
          immediate_actions?: string | null
          incident_date: string
          incident_time?: string | null
          injuries_reported?: boolean | null
          injury_details?: string | null
          is_near_miss?: boolean
          location: string
          org_id: string
          reported_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          updated_at?: string
          witnesses?: string | null
        }
        Update: {
          corrective_actions?: string | null
          created_at?: string
          description?: string
          drive_file_id?: string | null
          id?: string
          immediate_actions?: string | null
          incident_date?: string
          incident_time?: string | null
          injuries_reported?: boolean | null
          injury_details?: string | null
          is_near_miss?: boolean
          location?: string
          org_id?: string
          reported_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          updated_at?: string
          witnesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_ai_settings: {
        Row: {
          api_key_encrypted: string
          api_key_hint: string | null
          connected_at: string | null
          connected_by: string | null
          created_at: string
          id: string
          is_active: boolean | null
          last_test_at: string | null
          last_test_success: boolean | null
          last_used_at: string | null
          org_id: string
          provider: string
          requests_month_start: string | null
          requests_this_month: number | null
          updated_at: string
        }
        Insert: {
          api_key_encrypted: string
          api_key_hint?: string | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_test_at?: string | null
          last_test_success?: boolean | null
          last_used_at?: string | null
          org_id: string
          provider?: string
          requests_month_start?: string | null
          requests_this_month?: number | null
          updated_at?: string
        }
        Update: {
          api_key_encrypted?: string
          api_key_hint?: string | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_test_at?: string | null
          last_test_success?: boolean | null
          last_used_at?: string | null
          org_id?: string
          provider?: string
          requests_month_start?: string | null
          requests_this_month?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_ai_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_drive_folders: {
        Row: {
          created_at: string | null
          created_by: string | null
          drive_folder_id: string
          drive_folder_name: string
          folder_type: string
          id: string
          org_id: string
          parent_folder_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          drive_folder_id: string
          drive_folder_name: string
          folder_type: string
          id?: string
          org_id: string
          parent_folder_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          drive_folder_id?: string
          drive_folder_name?: string
          folder_type?: string
          id?: string
          org_id?: string
          parent_folder_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_drive_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_drive_folders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_drive_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "org_drive_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      org_hidden_sops: {
        Row: {
          hidden_at: string
          hidden_by: string | null
          id: string
          org_id: string
          system_key: string
        }
        Insert: {
          hidden_at?: string
          hidden_by?: string | null
          id?: string
          org_id: string
          system_key: string
        }
        Update: {
          hidden_at?: string
          hidden_by?: string | null
          id?: string
          org_id?: string
          system_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_hidden_sops_hidden_by_fkey"
            columns: ["hidden_by"]
            isOneToOne: false
            referencedRelation: "org_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_hidden_sops_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_settings: {
        Row: {
          cert_reminder_days_first: number
          cert_reminder_days_urgent: number
          cert_reminder_frequency_days: number
          created_at: string
          id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          cert_reminder_days_first?: number
          cert_reminder_days_urgent?: number
          cert_reminder_frequency_days?: number
          created_at?: string
          id?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          cert_reminder_days_first?: number
          cert_reminder_days_urgent?: number
          cert_reminder_frequency_days?: number
          created_at?: string
          id?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_subscriptions: {
        Row: {
          base_user_limit: number
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          extra_seats: number
          id: string
          org_id: string
          price_id: string | null
          product_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          base_user_limit?: number
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          extra_seats?: number
          id?: string
          org_id: string
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          base_user_limit?: number
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          extra_seats?: number
          id?: string
          org_id?: string
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
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
          jurisdiction: string
          logo_url: string | null
          name: string
          onboarding_welcome_message: string | null
          tagline: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          jurisdiction?: string
          logo_url?: string | null
          name: string
          onboarding_welcome_message?: string | null
          tagline?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          jurisdiction?: string
          logo_url?: string | null
          name?: string
          onboarding_welcome_message?: string | null
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
          onboarding_completed_at: string | null
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
          onboarding_completed_at?: string | null
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
          onboarding_completed_at?: string | null
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
      redemption_items: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          org_id: string
          points_required: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          org_id: string
          points_required: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          org_id?: string
          points_required?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemption_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      redemption_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          item_id: string | null
          item_name: string | null
          org_id: string | null
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
          item_id?: string | null
          item_name?: string | null
          org_id?: string | null
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
          item_id?: string | null
          item_name?: string | null
          org_id?: string | null
          points_requested?: number
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemption_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "redemption_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemption_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      sds_documents: {
        Row: {
          created_at: string
          created_by: string | null
          drive_file_id: string | null
          external_url: string | null
          hazard_category: string | null
          id: string
          is_active: boolean
          manufacturer: string | null
          notes: string | null
          org_id: string
          product_name: string
          revision_date: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          drive_file_id?: string | null
          external_url?: string | null
          hazard_category?: string | null
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          notes?: string | null
          org_id: string
          product_name: string
          revision_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          drive_file_id?: string | null
          external_url?: string | null
          hazard_category?: string | null
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          notes?: string | null
          org_id?: string
          product_name?: string
          revision_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sds_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "org_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sds_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sds_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "org_users"
            referencedColumns: ["id"]
          },
        ]
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
          language_completed_in: string | null
          section_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          language_completed_in?: string | null
          section_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          language_completed_in?: string | null
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
          quiz_score: number | null
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
          quiz_score?: number | null
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
          quiz_score?: number | null
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
          content_md: string | null
          created_at: string
          created_by: string | null
          doc_id_external: string | null
          drive_file_id: string | null
          drive_modified_time: string | null
          forked_from_sop_id: string | null
          id: string
          last_change_summary: string | null
          org_id: string | null
          source: string
          source_file_url: string | null
          status: string
          system_key: string | null
          title: string
          updated_at: string
          updated_by: string | null
          version: number
          video_url: string | null
        }
        Insert: {
          ack_epoch?: number
          ack_required?: boolean
          ack_reset_on_change?: boolean
          content_md?: string | null
          created_at?: string
          created_by?: string | null
          doc_id_external?: string | null
          drive_file_id?: string | null
          drive_modified_time?: string | null
          forked_from_sop_id?: string | null
          id?: string
          last_change_summary?: string | null
          org_id?: string | null
          source: string
          source_file_url?: string | null
          status?: string
          system_key?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          video_url?: string | null
        }
        Update: {
          ack_epoch?: number
          ack_required?: boolean
          ack_reset_on_change?: boolean
          content_md?: string | null
          created_at?: string
          created_by?: string | null
          doc_id_external?: string | null
          drive_file_id?: string | null
          drive_modified_time?: string | null
          forked_from_sop_id?: string | null
          id?: string
          last_change_summary?: string | null
          org_id?: string | null
          source?: string
          source_file_url?: string | null
          status?: string
          system_key?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          video_url?: string | null
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
      user_drive_tokens: {
        Row: {
          access_token_encrypted: string
          created_at: string | null
          google_email: string
          google_subject: string
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          last_refresh_at: string | null
          last_refresh_error: string | null
          last_used_at: string | null
          org_id: string
          provider: string
          refresh_token_encrypted: string
          revoke_reason: string | null
          revoked_at: string | null
          token_expires_at: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string | null
          google_email: string
          google_subject: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_refresh_at?: string | null
          last_refresh_error?: string | null
          last_used_at?: string | null
          org_id: string
          provider?: string
          refresh_token_encrypted: string
          revoke_reason?: string | null
          revoked_at?: string | null
          token_expires_at: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string | null
          google_email?: string
          google_subject?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_refresh_at?: string | null
          last_refresh_error?: string | null
          last_used_at?: string | null
          org_id?: string
          provider?: string
          refresh_token_encrypted?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          token_expires_at?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_drive_tokens_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
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
      backfill_parsed_sections: {
        Args: never
        Returns: {
          rows_updated: number
          table_name: string
        }[]
      }
      get_leaderboard: {
        Args: never
        Returns: {
          available_points: number
          full_name: string
          sections_completed: number
          total_points: number
        }[]
      }
      get_org_subscription: {
        Args: { _org_id: string }
        Returns: {
          cancel_at_period_end: boolean
          current_users: number
          period_end: string
          status: string
          user_limit: number
        }[]
      }
      get_org_user_count: { Args: { _org_id: string }; Returns: number }
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
      org_can_add_users: {
        Args: { _count?: number; _org_id: string }
        Returns: boolean
      }
      org_has_ai_enabled: { Args: { _org_id: string }; Returns: boolean }
      parse_document_sections: { Args: { _content: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "employee"
      doc_relationship_type:
        | "related"
        | "suggested_next"
        | "depends_on"
        | "replaces"
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
      doc_relationship_type: [
        "related",
        "suggested_next",
        "depends_on",
        "replaces",
      ],
    },
  },
} as const
