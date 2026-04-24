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
          ad_account_id: string
          balance_cents: number | null
          currency: string | null
          id: string
          payment_method_valid: boolean | null
          snapshot_at: string | null
          spend_cap_cents: number | null
        }
        Insert: {
          account_status?: string | null
          ad_account_id: string
          balance_cents?: number | null
          currency?: string | null
          id?: string
          payment_method_valid?: boolean | null
          snapshot_at?: string | null
          spend_cap_cents?: number | null
        }
        Update: {
          account_status?: string | null
          ad_account_id?: string
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
            referencedRelation: "active_ad_accounts"
            referencedColumns: ["id"]
          },
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
          api_version: string | null
          auto_paused_at: string | null
          capi_access_token: string | null
          connected_at: string | null
          currency: string | null
          demographics_cache: Json | null
          disconnected_at: string | null
          funding_source_details: Json | null
          health_status: string | null
          id: string
          is_default: boolean | null
          last_health_check: string | null
          last_known_balance_cents: number | null
          last_synced_at: string | null
          meta_pixel_id: string | null
          nickname: string | null
          organization_id: string | null
          paused_by_system: boolean | null
          platform: string
          platform_account_id: string
          refresh_token: string | null
          token_expires_at: string | null
          token_refreshed_at: string | null
          webhook_cert_updated: boolean | null
        }
        Insert: {
          access_token: string
          account_name?: string | null
          api_version?: string | null
          auto_paused_at?: string | null
          capi_access_token?: string | null
          connected_at?: string | null
          currency?: string | null
          demographics_cache?: Json | null
          disconnected_at?: string | null
          funding_source_details?: Json | null
          health_status?: string | null
          id?: string
          is_default?: boolean | null
          last_health_check?: string | null
          last_known_balance_cents?: number | null
          last_synced_at?: string | null
          meta_pixel_id?: string | null
          nickname?: string | null
          organization_id?: string | null
          paused_by_system?: boolean | null
          platform: string
          platform_account_id: string
          refresh_token?: string | null
          token_expires_at?: string | null
          token_refreshed_at?: string | null
          webhook_cert_updated?: boolean | null
        }
        Update: {
          access_token?: string
          account_name?: string | null
          api_version?: string | null
          auto_paused_at?: string | null
          capi_access_token?: string | null
          connected_at?: string | null
          currency?: string | null
          demographics_cache?: Json | null
          disconnected_at?: string | null
          funding_source_details?: Json | null
          health_status?: string | null
          id?: string
          is_default?: boolean | null
          last_health_check?: string | null
          last_known_balance_cents?: number | null
          last_synced_at?: string | null
          meta_pixel_id?: string | null
          nickname?: string | null
          organization_id?: string | null
          paused_by_system?: boolean | null
          platform?: string
          platform_account_id?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          token_refreshed_at?: string | null
          webhook_cert_updated?: boolean | null
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
          campaign_id: string
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
          campaign_id: string
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
          campaign_id?: string
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
          ad_set_id: string
          call_to_action: string | null
          campaign_id: string
          carousel_data: Json | null
          clicks: number | null
          created_at: string | null
          creative_id: string | null
          creative_snapshot: Json | null
          ctr: number | null
          destination_type: string | null
          destination_url: string | null
          headline: string | null
          id: string
          impressions: number | null
          is_existing_post: boolean | null
          name: string
          platform_ad_id: string | null
          primary_text: string | null
          rejection_reason: string | null
          source_post_id: string | null
          spend_cents: number | null
          status: string | null
          synced_at: string | null
        }
        Insert: {
          ad_set_id: string
          call_to_action?: string | null
          campaign_id: string
          carousel_data?: Json | null
          clicks?: number | null
          created_at?: string | null
          creative_id?: string | null
          creative_snapshot?: Json | null
          ctr?: number | null
          destination_type?: string | null
          destination_url?: string | null
          headline?: string | null
          id?: string
          impressions?: number | null
          is_existing_post?: boolean | null
          name: string
          platform_ad_id?: string | null
          primary_text?: string | null
          rejection_reason?: string | null
          source_post_id?: string | null
          spend_cents?: number | null
          status?: string | null
          synced_at?: string | null
        }
        Update: {
          ad_set_id?: string
          call_to_action?: string | null
          campaign_id?: string
          carousel_data?: Json | null
          clicks?: number | null
          created_at?: string | null
          creative_id?: string | null
          creative_snapshot?: Json | null
          ctr?: number | null
          destination_type?: string | null
          destination_url?: string | null
          headline?: string | null
          id?: string
          impressions?: number | null
          is_existing_post?: boolean | null
          name?: string
          platform_ad_id?: string | null
          primary_text?: string | null
          rejection_reason?: string | null
          source_post_id?: string | null
          spend_cents?: number | null
          status?: string | null
          synced_at?: string | null
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
            foreignKeyName: "ads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
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
          context_source: string | null
          created_at: string | null
          creative_id: string | null
          id: string
          input_json: Json
          organization_id: string | null
          prompt_hash: string | null
          request_type: string | null
          result_json: Json | null
          tokens_used: number | null
          used_context: boolean | null
          user_id: string | null
        }
        Insert: {
          context_source?: string | null
          created_at?: string | null
          creative_id?: string | null
          id?: string
          input_json: Json
          organization_id?: string | null
          prompt_hash?: string | null
          request_type?: string | null
          result_json?: Json | null
          tokens_used?: number | null
          used_context?: boolean | null
          user_id?: string | null
        }
        Update: {
          context_source?: string | null
          created_at?: string | null
          creative_id?: string | null
          id?: string
          input_json?: Json
          organization_id?: string | null
          prompt_hash?: string | null
          request_type?: string | null
          result_json?: Json | null
          tokens_used?: number | null
          used_context?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_requests_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "creatives"
            referencedColumns: ["id"]
          },
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
      attribution_links: {
        Row: {
          ad_id: string | null
          campaign_id: string | null
          created_at: string | null
          destination_type: string
          destination_url: string
          expires_at: string | null
          id: string
          organization_id: string
          pixel_token: string | null
          token: string
        }
        Insert: {
          ad_id?: string | null
          campaign_id?: string | null
          created_at?: string | null
          destination_type?: string
          destination_url: string
          expires_at?: string | null
          id?: string
          organization_id: string
          pixel_token?: string | null
          token: string
        }
        Update: {
          ad_id?: string | null
          campaign_id?: string | null
          created_at?: string | null
          destination_type?: string
          destination_url?: string
          expires_at?: string | null
          id?: string
          organization_id?: string
          pixel_token?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribution_links_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          advantage_plus_config: Json | null
          ai_chat_snapshot: Json | null
          ai_context: Json | null
          clicks: number | null
          created_at: string | null
          creative_snapshot: Json | null
          ctr: number | null
          daily_budget_cents: number | null
          demographics_cache: Json | null
          demographics_synced_at: string | null
          error_log: string | null
          id: string
          impressions: number | null
          issues_checked_at: string | null
          last_click_at: string | null
          meta_issues: Json | null
          name: string
          objective: string | null
          organization_id: string
          placement_cache: Json | null
          placement_synced_at: string | null
          placement_type: string | null
          platform: string | null
          platform_campaign_id: string | null
          promotion_id: string | null
          revenue_ngn: number | null
          sales_count: number | null
          spend_cents: number | null
          status: string | null
          targeting_profile_id: string | null
          targeting_snapshot: Json | null
          total_link_clicks: number | null
          updated_at: string | null
          uses_pixel_optimization: boolean | null
          website_clicks: number | null
          whatsapp_click_rate: number | null
          whatsapp_clicks: number | null
        }
        Insert: {
          ad_account_id?: string | null
          advantage_plus_config?: Json | null
          ai_chat_snapshot?: Json | null
          ai_context?: Json | null
          clicks?: number | null
          created_at?: string | null
          creative_snapshot?: Json | null
          ctr?: number | null
          daily_budget_cents?: number | null
          demographics_cache?: Json | null
          demographics_synced_at?: string | null
          error_log?: string | null
          id?: string
          impressions?: number | null
          issues_checked_at?: string | null
          last_click_at?: string | null
          meta_issues?: Json | null
          name: string
          objective?: string | null
          organization_id: string
          placement_cache?: Json | null
          placement_synced_at?: string | null
          placement_type?: string | null
          platform?: string | null
          platform_campaign_id?: string | null
          promotion_id?: string | null
          revenue_ngn?: number | null
          sales_count?: number | null
          spend_cents?: number | null
          status?: string | null
          targeting_profile_id?: string | null
          targeting_snapshot?: Json | null
          total_link_clicks?: number | null
          updated_at?: string | null
          uses_pixel_optimization?: boolean | null
          website_clicks?: number | null
          whatsapp_click_rate?: number | null
          whatsapp_clicks?: number | null
        }
        Update: {
          ad_account_id?: string | null
          advantage_plus_config?: Json | null
          ai_chat_snapshot?: Json | null
          ai_context?: Json | null
          clicks?: number | null
          created_at?: string | null
          creative_snapshot?: Json | null
          ctr?: number | null
          daily_budget_cents?: number | null
          demographics_cache?: Json | null
          demographics_synced_at?: string | null
          error_log?: string | null
          id?: string
          impressions?: number | null
          issues_checked_at?: string | null
          last_click_at?: string | null
          meta_issues?: Json | null
          name?: string
          objective?: string | null
          organization_id?: string
          placement_cache?: Json | null
          placement_synced_at?: string | null
          placement_type?: string | null
          platform?: string | null
          platform_campaign_id?: string | null
          promotion_id?: string | null
          revenue_ngn?: number | null
          sales_count?: number | null
          spend_cents?: number | null
          status?: string | null
          targeting_profile_id?: string | null
          targeting_snapshot?: Json | null
          total_link_clicks?: number | null
          updated_at?: string | null
          uses_pixel_optimization?: boolean | null
          website_clicks?: number | null
          whatsapp_click_rate?: number | null
          whatsapp_clicks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "active_ad_accounts"
            referencedColumns: ["id"]
          },
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
      creative_templates: {
        Row: {
          aspect_ratio: string | null
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_premium: boolean | null
          negative_prompt: string | null
          prompt_template: string
          thumbnail_url: string | null
          title: string
          variables: Json | null
        }
        Insert: {
          aspect_ratio?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_premium?: boolean | null
          negative_prompt?: string | null
          prompt_template: string
          thumbnail_url?: string | null
          title: string
          variables?: Json | null
        }
        Update: {
          aspect_ratio?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_premium?: boolean | null
          negative_prompt?: string | null
          prompt_template?: string
          thumbnail_url?: string | null
          title?: string
          variables?: Json | null
        }
        Relationships: []
      }
      creatives: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          file_size_bytes: number | null
          generation_context: Json | null
          generation_prompt: string | null
          height: number | null
          id: string
          is_favorite: boolean | null
          last_used_at: string | null
          media_type: string | null
          name: string | null
          organization_id: string
          original_url: string
          parent_id: string | null
          platform_media_hash: string | null
          tags: string[] | null
          thumbnail_url: string | null
          uploaded_by: string | null
          usage_count: number | null
          width: number | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          file_size_bytes?: number | null
          generation_context?: Json | null
          generation_prompt?: string | null
          height?: number | null
          id?: string
          is_favorite?: boolean | null
          last_used_at?: string | null
          media_type?: string | null
          name?: string | null
          organization_id: string
          original_url: string
          parent_id?: string | null
          platform_media_hash?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          uploaded_by?: string | null
          usage_count?: number | null
          width?: number | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          file_size_bytes?: number | null
          generation_context?: Json | null
          generation_prompt?: string | null
          height?: number | null
          id?: string
          is_favorite?: boolean | null
          last_used_at?: string | null
          media_type?: string | null
          name?: string | null
          organization_id?: string
          original_url?: string
          parent_id?: string | null
          platform_media_hash?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          uploaded_by?: string | null
          usage_count?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creatives_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creatives_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "creatives"
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
      credit_costs: {
        Row: {
          action_key: string
          created_at: string
          credits: number
          display_name: string
          is_active: boolean
          model_id: string
          notes: string | null
        }
        Insert: {
          action_key: string
          created_at?: string
          credits: number
          display_name: string
          is_active?: boolean
          model_id: string
          notes?: string | null
        }
        Update: {
          action_key?: string
          created_at?: string
          credits?: number
          display_name?: string
          is_active?: boolean
          model_id?: string
          notes?: string | null
        }
        Relationships: []
      }
      credit_packs: {
        Row: {
          created_at: string
          credits: number
          id: string
          is_active: boolean
          name: string
          price_ngn: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          credits: number
          id?: string
          is_active?: boolean
          name: string
          price_ngn: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          is_active?: boolean
          name?: string
          price_ngn?: number
          sort_order?: number
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          balance_after: number
          created_at: string
          delta: number
          id: string
          model_used: string | null
          organization_id: string | null
          reason: string
          reference_id: string | null
          user_id: string | null
        }
        Insert: {
          balance_after: number
          created_at?: string
          delta: number
          id?: string
          model_used?: string | null
          organization_id?: string | null
          reason: string
          reference_id?: string | null
          user_id?: string | null
        }
        Update: {
          balance_after?: number
          created_at?: string
          delta?: number
          id?: string
          model_used?: string | null
          organization_id?: string | null
          reason?: string
          reference_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fx_rates: {
        Row: {
          created_at: string | null
          fetched_at: string | null
          id: string
          is_active: boolean
          rate_ngn_per_usd: number
          source_provider: string
        }
        Insert: {
          created_at?: string | null
          fetched_at?: string | null
          id?: string
          is_active?: boolean
          rate_ngn_per_usd: number
          source_provider?: string
        }
        Update: {
          created_at?: string | null
          fetched_at?: string | null
          id?: string
          is_active?: boolean
          rate_ngn_per_usd?: number
          source_provider?: string
        }
        Relationships: []
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
      job_dlq: {
        Row: {
          attempts: number | null
          created_at: string | null
          error_message: string | null
          error_stack: string | null
          id: string
          job_id: string | null
          payload: Json
          type: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          id?: string
          job_id?: string | null
          payload: Json
          type: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          id?: string
          job_id?: string | null
          payload?: Json
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_dlq_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "job_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      job_metrics: {
        Row: {
          duration_ms: number | null
          error_code: string | null
          executed_at: string | null
          id: string
          job_type: string
          success: boolean
        }
        Insert: {
          duration_ms?: number | null
          error_code?: string | null
          executed_at?: string | null
          id?: string
          job_type: string
          success: boolean
        }
        Update: {
          duration_ms?: number | null
          error_code?: string | null
          executed_at?: string | null
          id?: string
          job_type?: string
          success?: boolean
        }
        Relationships: []
      }
      job_queue: {
        Row: {
          attempts: number | null
          completed_at: string | null
          created_at: string | null
          id: string
          last_error: string | null
          max_attempts: number | null
          organization_id: string | null
          payload: Json
          started_at: string | null
          status: string | null
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          organization_id?: string | null
          payload: Json
          started_at?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          organization_id?: string | null
          payload?: Json
          started_at?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_submissions: {
        Row: {
          ad_id: string | null
          adgroup_id: string | null
          campaign_id: string | null
          created_at: string | null
          field_data: Json
          form_id: string
          id: string
          leadgen_id: string
          organization_id: string
          page_id: string | null
          submitted_at: string
          updated_at: string | null
        }
        Insert: {
          ad_id?: string | null
          adgroup_id?: string | null
          campaign_id?: string | null
          created_at?: string | null
          field_data?: Json
          form_id: string
          id?: string
          leadgen_id: string
          organization_id: string
          page_id?: string | null
          submitted_at: string
          updated_at?: string | null
        }
        Update: {
          ad_id?: string | null
          adgroup_id?: string | null
          campaign_id?: string | null
          created_at?: string | null
          field_data?: Json
          form_id?: string
          id?: string
          leadgen_id?: string
          organization_id?: string
          page_id?: string | null
          submitted_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      link_clicks: {
        Row: {
          campaign_id: string | null
          clicked_at: string | null
          country: string | null
          destination_type: string | null
          device_type: string | null
          event_type: string | null
          event_value_ngn: number | null
          fbclid: string | null
          id: string
          link_id: string
          organization_id: string
          referrer: string | null
        }
        Insert: {
          campaign_id?: string | null
          clicked_at?: string | null
          country?: string | null
          destination_type?: string | null
          device_type?: string | null
          event_type?: string | null
          event_value_ngn?: number | null
          fbclid?: string | null
          id?: string
          link_id: string
          organization_id: string
          referrer?: string | null
        }
        Update: {
          campaign_id?: string | null
          clicked_at?: string | null
          country?: string | null
          destination_type?: string | null
          device_type?: string | null
          event_type?: string | null
          event_value_ngn?: number | null
          fbclid?: string | null
          id?: string
          link_id?: string
          organization_id?: string
          referrer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "attribution_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_clicks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_oauth_pending: {
        Row: {
          access_token: string
          accounts: Json
          expires_at: string
          id: string
          org_id: string
          token_expires_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          accounts: Json
          expires_at?: string
          id?: string
          org_id: string
          token_expires_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          accounts?: Json
          expires_at?: string
          id?: string
          org_id?: string
          token_expires_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_oauth_pending_org_id_fkey"
            columns: ["org_id"]
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
          whatsapp_otp_code: string | null
          whatsapp_otp_expires_at: string | null
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
          whatsapp_otp_code?: string | null
          whatsapp_otp_expires_at?: string | null
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
          whatsapp_otp_code?: string | null
          whatsapp_otp_expires_at?: string | null
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
          dedup_key: string | null
          id: string
          is_read: boolean | null
          message: string
          organization_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          category: string
          created_at?: string | null
          dedup_key?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          organization_id?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          category?: string
          created_at?: string | null
          dedup_key?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          organization_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          billing_cycle_day: number | null
          billing_provider: string
          books_appointments: boolean | null
          business_description: string | null
          business_phone: string | null
          business_website: string | null
          city: string | null
          country_code: string
          created_at: string | null
          currency_default: string
          customer_gender: string | null
          default_target_interests: Json | null
          default_target_locations: Json | null
          deleted_at: string | null
          gets_leads_via_website: boolean | null
          has_physical_location: boolean | null
          id: string
          industry: string | null
          last_billing_update_at: string | null
          logo_url: string | null
          max_ad_accounts: number | null
          max_team_members: number | null
          name: string
          paystack_customer_code: string | null
          paystack_sub_code: string | null
          pixel_token: string | null
          plan_interval: string | null
          price_tier: string | null
          selling_method: string | null
          sells_online: boolean | null
          slug: string
          state: string | null
          stripe_customer_id: string | null
          subscription_expires_at: string | null
          subscription_status: string | null
          subscription_tier: string | null
          timezone: string
          updated_at: string | null
          wants_contact_ads: boolean | null
          whatsapp_number: string | null
        }
        Insert: {
          billing_cycle_day?: number | null
          billing_provider?: string
          books_appointments?: boolean | null
          business_description?: string | null
          business_phone?: string | null
          business_website?: string | null
          city?: string | null
          country_code?: string
          created_at?: string | null
          currency_default?: string
          customer_gender?: string | null
          default_target_interests?: Json | null
          default_target_locations?: Json | null
          deleted_at?: string | null
          gets_leads_via_website?: boolean | null
          has_physical_location?: boolean | null
          id?: string
          industry?: string | null
          last_billing_update_at?: string | null
          logo_url?: string | null
          max_ad_accounts?: number | null
          max_team_members?: number | null
          name: string
          paystack_customer_code?: string | null
          paystack_sub_code?: string | null
          pixel_token?: string | null
          plan_interval?: string | null
          price_tier?: string | null
          selling_method?: string | null
          sells_online?: boolean | null
          slug: string
          state?: string | null
          stripe_customer_id?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          timezone?: string
          updated_at?: string | null
          wants_contact_ads?: boolean | null
          whatsapp_number?: string | null
        }
        Update: {
          billing_cycle_day?: number | null
          billing_provider?: string
          books_appointments?: boolean | null
          business_description?: string | null
          business_phone?: string | null
          business_website?: string | null
          city?: string | null
          country_code?: string
          created_at?: string | null
          currency_default?: string
          customer_gender?: string | null
          default_target_interests?: Json | null
          default_target_locations?: Json | null
          deleted_at?: string | null
          gets_leads_via_website?: boolean | null
          has_physical_location?: boolean | null
          id?: string
          industry?: string | null
          last_billing_update_at?: string | null
          logo_url?: string | null
          max_ad_accounts?: number | null
          max_team_members?: number | null
          name?: string
          paystack_customer_code?: string | null
          paystack_sub_code?: string | null
          pixel_token?: string | null
          plan_interval?: string | null
          price_tier?: string | null
          selling_method?: string | null
          sells_online?: boolean | null
          slug?: string
          state?: string | null
          stripe_customer_id?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          timezone?: string
          updated_at?: string | null
          wants_contact_ads?: boolean | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      plan_definitions: {
        Row: {
          created_at: string
          credits_monthly: number
          credits_trial: number
          display_name: string
          is_active: boolean
          max_ad_accounts: number
          max_team_members: number
          plan_id: string
          price_ngn: number
          rollover_enabled: boolean
          rollover_max: number
        }
        Insert: {
          created_at?: string
          credits_monthly: number
          credits_trial?: number
          display_name: string
          is_active?: boolean
          max_ad_accounts?: number
          max_team_members?: number
          plan_id: string
          price_ngn: number
          rollover_enabled?: boolean
          rollover_max?: number
        }
        Update: {
          created_at?: string
          credits_monthly?: number
          credits_trial?: number
          display_name?: string
          is_active?: boolean
          max_ad_accounts?: number
          max_team_members?: number
          plan_id?: string
          price_ngn?: number
          rollover_enabled?: boolean
          rollover_max?: number
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
          credits_limit: number
          credits_used: number
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
          credits_limit?: number
          credits_used?: number
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
          credits_limit?: number
          credits_used?: number
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
          credits_balance: number
          credits_reset_at: string | null
          email: string
          full_name: string | null
          id: string
          plan_credits_quota: number
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          credits_balance?: number
          credits_reset_at?: string | null
          email: string
          full_name?: string | null
          id: string
          plan_credits_quota?: number
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          credits_balance?: number
          credits_reset_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          plan_credits_quota?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_sales: {
        Row: {
          amount_ngn: number
          campaign_id: string | null
          id: string
          note: string | null
          organization_id: string
          recorded_at: string | null
          recorded_by: string | null
        }
        Insert: {
          amount_ngn: number
          campaign_id?: string | null
          id?: string
          note?: string | null
          organization_id: string
          recorded_at?: string | null
          recorded_by?: string | null
        }
        Update: {
          amount_ngn?: number
          campaign_id?: string | null
          id?: string
          note?: string | null
          organization_id?: string
          recorded_at?: string | null
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sales_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sales_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_ad_accounts: {
        Row: {
          access_token: string | null
          account_name: string | null
          auto_paused_at: string | null
          capi_access_token: string | null
          connected_at: string | null
          currency: string | null
          demographics_cache: Json | null
          disconnected_at: string | null
          funding_source_details: Json | null
          health_status: string | null
          id: string | null
          is_default: boolean | null
          last_health_check: string | null
          last_known_balance_cents: number | null
          last_synced_at: string | null
          meta_pixel_id: string | null
          nickname: string | null
          organization_id: string | null
          paused_by_system: boolean | null
          platform: string | null
          platform_account_id: string | null
          refresh_token: string | null
          token_expires_at: string | null
          token_refreshed_at: string | null
        }
        Insert: {
          access_token?: string | null
          account_name?: string | null
          auto_paused_at?: string | null
          capi_access_token?: string | null
          connected_at?: string | null
          currency?: string | null
          demographics_cache?: Json | null
          disconnected_at?: string | null
          funding_source_details?: Json | null
          health_status?: string | null
          id?: string | null
          is_default?: boolean | null
          last_health_check?: string | null
          last_known_balance_cents?: number | null
          last_synced_at?: string | null
          meta_pixel_id?: string | null
          nickname?: string | null
          organization_id?: string | null
          paused_by_system?: boolean | null
          platform?: string | null
          platform_account_id?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          token_refreshed_at?: string | null
        }
        Update: {
          access_token?: string | null
          account_name?: string | null
          auto_paused_at?: string | null
          capi_access_token?: string | null
          connected_at?: string | null
          currency?: string | null
          demographics_cache?: Json | null
          disconnected_at?: string | null
          funding_source_details?: Json | null
          health_status?: string | null
          id?: string | null
          is_default?: boolean | null
          last_health_check?: string | null
          last_known_balance_cents?: number | null
          last_synced_at?: string | null
          meta_pixel_id?: string | null
          nickname?: string | null
          organization_id?: string | null
          paused_by_system?: boolean | null
          platform?: string | null
          platform_account_id?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          token_refreshed_at?: string | null
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
      ai_generation_analytics: {
        Row: {
          context_enhanced_count: number | null
          context_source: string | null
          date: string | null
          enhancement_rate: number | null
          organization_id: string | null
          success_rate: number | null
          total_generations: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_credits: {
        Args: {
          p_credits: number
          p_org_id?: string
          p_reason: string
          p_reference?: string
          p_user_id: string
        }
        Returns: Json
      }
      can_manage_org_members: { Args: { org_id: string }; Returns: boolean }
      claim_next_job: {
        Args: { p_type: string }
        Returns: {
          attempts: number | null
          completed_at: string | null
          created_at: string | null
          id: string
          last_error: string | null
          max_attempts: number | null
          organization_id: string | null
          payload: Json
          started_at: string | null
          status: string | null
          type: string
          updated_at: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "job_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cleanup_old_jobs: { Args: { older_than_days?: number }; Returns: number }
      deduct_credits: {
        Args: {
          p_credits: number
          p_model?: string
          p_org_id: string
          p_reason: string
          p_reference?: string
          p_user_id: string
        }
        Returns: Json
      }
      fail_job_to_dlq: {
        Args: {
          p_attempts: number
          p_error_msg: string
          p_error_stack: string
          p_job_id: string
        }
        Returns: undefined
      }
      get_campaign_context: { Args: { p_campaign_id: string }; Returns: Json }
      get_campaign_lead_count: {
        Args: { campaign_uuid: string }
        Returns: number
      }
      get_current_fx_rate: { Args: never; Returns: number }
      get_job_queue_health: {
        Args: never
        Returns: {
          avg_duration_ms: number
          failed_count: number
          job_type: string
          pending_count: number
          processing_count: number
        }[]
      }
      get_recent_campaign_leads: {
        Args: { campaign_uuid: string }
        Returns: number
      }
      increment_campaign_clicks:
        | { Args: { p_campaign_id: string }; Returns: undefined }
        | {
            Args: { p_campaign_id: string; p_destination_type?: string }
            Returns: undefined
          }
      is_org_member: {
        Args: { org_id: string; user_id: string }
        Returns: boolean
      }
      list_active_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          command: string
          jobid: number
          schedule: string
        }[]
      }
      reset_stuck_jobs: { Args: never; Returns: number }
      update_campaign_sales_summary: {
        Args: { p_amount_ngn: number; p_campaign_id: string }
        Returns: undefined
      }
      update_fx_rate: {
        Args: { p_rate: number; p_source?: string }
        Returns: string
      }
    }
    Enums: {
      payment_status_enum:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "incomplete"
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
      payment_status_enum: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "incomplete",
      ],
    },
  },
} as const
