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
      ad_account_snapshots: {
        Row: {
          account_status: string | null
          ad_account_id: string | null
          balance_cents: number | null
          currency: string | null
          id: string
          payment_method_valid: boolean | null
          snapshot_at: string | null
          spend_cap_cents: number | null
        }
        Insert: {
          account_status?: string | null
          ad_account_id?: string | null
          balance_cents?: number | null
          currency?: string | null
          id?: string
          payment_method_valid?: boolean | null
          snapshot_at?: string | null
          spend_cap_cents?: number | null
        }
        Update: {
          account_status?: string | null
          ad_account_id?: string | null
          balance_cents?: number | null
          currency?: string | null
          id?: string
          payment_method_valid?: boolean | null
          snapshot_at?: string | null
          spend_cap_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_account_snapshots_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_accounts: {
        Row: {
          access_token: string
          account_name: string | null
          connected_at: string | null
          currency: string | null
          funding_source_details: Json | null
          health_status: string | null
          id: string
          is_default: boolean | null
          last_health_check: string | null
          last_known_balance_cents: number | null
          nickname: string | null
          organization_id: string | null
          platform: string
          platform_account_id: string
          refresh_token: string | null
          token_expires_at: string | null
        }
        Insert: {
          access_token: string
          account_name?: string | null
          connected_at?: string | null
          currency?: string | null
          funding_source_details?: Json | null
          health_status?: string | null
          id?: string
          is_default?: boolean | null
          last_health_check?: string | null
          last_known_balance_cents?: number | null
          nickname?: string | null
          organization_id?: string | null
          platform: string
          platform_account_id: string
          refresh_token?: string | null
          token_expires_at?: string | null
        }
        Update: {
          access_token?: string
          account_name?: string | null
          connected_at?: string | null
          currency?: string | null
          funding_source_details?: Json | null
          health_status?: string | null
          id?: string
          is_default?: boolean | null
          last_health_check?: string | null
          last_known_balance_cents?: number | null
          nickname?: string | null
          organization_id?: string | null
          platform?: string
          platform_account_id?: string
          refresh_token?: string | null
          token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_sets: {
        Row: {
          bid_amount_cents: number | null
          campaign_id: string | null
          created_at: string | null
          id: string
          name: string
          optimization_goal: string | null
          platform_adset_id: string | null
          status: string | null
          targeting_snapshot: Json
        }
        Insert: {
          bid_amount_cents?: number | null
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          optimization_goal?: string | null
          platform_adset_id?: string | null
          status?: string | null
          targeting_snapshot: Json
        }
        Update: {
          bid_amount_cents?: number | null
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          optimization_goal?: string | null
          platform_adset_id?: string | null
          status?: string | null
          targeting_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ad_sets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          ad_set_id: string | null
          call_to_action: string | null
          carousel_data: Json | null
          created_at: string | null
          creative_id: string | null
          destination_type: string | null
          destination_url: string | null
          headline: string | null
          id: string
          is_existing_post: boolean | null
          name: string
          platform_ad_id: string | null
          primary_text: string | null
          rejection_reason: string | null
          source_post_id: string | null
          status: string | null
        }
        Insert: {
          ad_set_id?: string | null
          call_to_action?: string | null
          carousel_data?: Json | null
          created_at?: string | null
          creative_id?: string | null
          destination_type?: string | null
          destination_url?: string | null
          headline?: string | null
          id?: string
          is_existing_post?: boolean | null
          name: string
          platform_ad_id?: string | null
          primary_text?: string | null
          rejection_reason?: string | null
          source_post_id?: string | null
          status?: string | null
        }
        Update: {
          ad_set_id?: string | null
          call_to_action?: string | null
          carousel_data?: Json | null
          created_at?: string | null
          creative_id?: string | null
          destination_type?: string | null
          destination_url?: string | null
          headline?: string | null
          id?: string
          is_existing_post?: boolean | null
          name?: string
          platform_ad_id?: string | null
          primary_text?: string | null
          rejection_reason?: string | null
          source_post_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_ad_set_id_fkey"
            columns: ["ad_set_id"]
            isOneToOne: false
            referencedRelation: "ad_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "creatives"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_requests: {
        Row: {
          created_at: string | null
          id: string
          input_json: Json
          organization_id: string | null
          prompt_hash: string | null
          request_type: string | null
          result_json: Json | null
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          input_json: Json
          organization_id?: string | null
          prompt_hash?: string | null
          request_type?: string | null
          result_json?: Json | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          input_json?: Json
          organization_id?: string | null
          prompt_hash?: string | null
          request_type?: string | null
          result_json?: Json | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_metrics: {
        Row: {
          campaign_id: string | null
          clicks: number | null
          ctr: number | null
          date: string
          id: string
          impressions: number | null
          reach: number | null
          spend_cents: number | null
          synced_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          clicks?: number | null
          ctr?: number | null
          date: string
          id?: string
          impressions?: number | null
          reach?: number | null
          spend_cents?: number | null
          synced_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          clicks?: number | null
          ctr?: number | null
          date?: string
          id?: string
          impressions?: number | null
          reach?: number | null
          spend_cents?: number | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          ad_account_id: string | null
          created_at: string | null
          daily_budget_cents: number
          error_log: string | null
          id: string
          name: string
          objective: string | null
          organization_id: string | null
          placement_type: string | null
          platform: string | null
          platform_campaign_id: string | null
          promotion_id: string | null
          status: string | null
          targeting_profile_id: string | null
          updated_at: string | null
        }
        Insert: {
          ad_account_id?: string | null
          created_at?: string | null
          daily_budget_cents: number
          error_log?: string | null
          id?: string
          name: string
          objective?: string | null
          organization_id?: string | null
          placement_type?: string | null
          platform?: string | null
          platform_campaign_id?: string | null
          promotion_id?: string | null
          status?: string | null
          targeting_profile_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ad_account_id?: string | null
          created_at?: string | null
          daily_budget_cents?: number
          error_log?: string | null
          id?: string
          name?: string
          objective?: string | null
          organization_id?: string | null
          placement_type?: string | null
          platform?: string | null
          platform_campaign_id?: string | null
          promotion_id?: string | null
          status?: string | null
          targeting_profile_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_targeting_profile_id_fkey"
            columns: ["targeting_profile_id"]
            isOneToOne: false
            referencedRelation: "targeting_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creatives: {
        Row: {
          created_at: string | null
          file_size_bytes: number | null
          height: number | null
          id: string
          media_type: string | null
          name: string | null
          organization_id: string | null
          original_url: string
          platform_media_hash: string | null
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          created_at?: string | null
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          media_type?: string | null
          name?: string | null
          organization_id?: string | null
          original_url: string
          platform_media_hash?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string | null
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          media_type?: string | null
          name?: string | null
          organization_id?: string | null
          original_url?: string
          platform_media_hash?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creatives_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creatives_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string | null
          role: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          organization_id?: string | null
          role?: string | null
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string | null
          role?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          channel: string | null
          cost_micros: number | null
          error_message: string | null
          id: string
          notification_type: string | null
          organization_id: string | null
          sent_at: string | null
          status: string | null
          template_name: string | null
          user_id: string | null
        }
        Insert: {
          channel?: string | null
          cost_micros?: number | null
          error_message?: string | null
          id?: string
          notification_type?: string | null
          organization_id?: string | null
          sent_at?: string | null
          status?: string | null
          template_name?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: string | null
          cost_micros?: number | null
          error_message?: string | null
          id?: string
          notification_type?: string | null
          organization_id?: string | null
          sent_at?: string | null
          status?: string | null
          template_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          alert_ad_rejected: boolean | null
          alert_low_funds: boolean | null
          alert_payment_failed: boolean | null
          alert_weekly_report: boolean | null
          id: string
          updated_at: string | null
          user_id: string | null
          verified: boolean | null
          whatsapp_number: string | null
        }
        Insert: {
          alert_ad_rejected?: boolean | null
          alert_low_funds?: boolean | null
          alert_payment_failed?: boolean | null
          alert_weekly_report?: boolean | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
          whatsapp_number?: string | null
        }
        Update: {
          alert_ad_rejected?: boolean | null
          alert_low_funds?: boolean | null
          alert_payment_failed?: boolean | null
          alert_weekly_report?: boolean | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          category: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          category: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          category?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string | null
          organization_id: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          max_ad_accounts: number | null
          max_team_members: number | null
          name: string
          paystack_customer_code: string | null
          slug: string
          subscription_expires_at: string | null
          subscription_status: string | null
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          max_ad_accounts?: number | null
          max_team_members?: number | null
          name: string
          paystack_customer_code?: string | null
          slug: string
          subscription_expires_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          max_ad_accounts?: number | null
          max_team_members?: number | null
          name?: string
          paystack_customer_code?: string | null
          slug?: string
          subscription_expires_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          name: string
          organization_id: string | null
          start_date: string | null
          status: string | null
          total_budget_cents: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          name: string
          organization_id?: string | null
          start_date?: string | null
          status?: string | null
          total_budget_cents?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          start_date?: string | null
          status?: string | null
          total_budget_cents?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      targeting_profiles: {
        Row: {
          ai_reasoning: string | null
          business_description: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          organization_id: string | null
          product_category: string | null
          validated_interests: Json | null
        }
        Insert: {
          ai_reasoning?: string | null
          business_description?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          organization_id?: string | null
          product_category?: string | null
          validated_interests?: Json | null
        }
        Update: {
          ai_reasoning?: string | null
          business_description?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          product_category?: string | null
          validated_interests?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "targeting_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "targeting_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_cents: number
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          organization_id: string | null
          payment_provider: string | null
          provider_reference: string | null
          status: string | null
          type: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          organization_id?: string | null
          payment_provider?: string | null
          provider_reference?: string | null
          status?: string | null
          type?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          organization_id?: string | null
          payment_provider?: string | null
          provider_reference?: string | null
          status?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_limits: {
        Row: {
          ad_accounts_connected: number | null
          ad_accounts_limit: number | null
          ai_requests_limit: number | null
          ai_requests_used: number | null
          id: string
          organization_id: string | null
          period_end: string
          period_start: string
          updated_at: string | null
          users_count: number | null
          users_limit: number | null
        }
        Insert: {
          ad_accounts_connected?: number | null
          ad_accounts_limit?: number | null
          ai_requests_limit?: number | null
          ai_requests_used?: number | null
          id?: string
          organization_id?: string | null
          period_end: string
          period_start: string
          updated_at?: string | null
          users_count?: number | null
          users_limit?: number | null
        }
        Update: {
          ad_accounts_connected?: number | null
          ad_accounts_limit?: number | null
          ai_requests_limit?: number | null
          ai_requests_used?: number | null
          id?: string
          organization_id?: string | null
          period_end?: string
          period_start?: string
          updated_at?: string | null
          users_count?: number | null
          users_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_limits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
