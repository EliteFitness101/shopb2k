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
      achievement_unlocks: {
        Row: {
          achievement_slug: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_slug: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_slug?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_unlocks_achievement_slug_fkey"
            columns: ["achievement_slug"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["slug"]
          },
        ]
      }
      achievements: {
        Row: {
          coin_reward: number
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          xp_reward: number
        }
        Insert: {
          coin_reward?: number
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          xp_reward?: number
        }
        Update: {
          coin_reward?: number
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          xp_reward?: number
        }
        Relationships: []
      }
      activity_feed: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          label: string
          last_used_at: string | null
          organization_id: string | null
          revoked_at: string | null
          scopes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          label: string
          last_used_at?: string | null
          organization_id?: string | null
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          label?: string
          last_used_at?: string | null
          organization_id?: string | null
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          name: string | null
          platform: string | null
          trusted: boolean
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          name?: string | null
          platform?: string | null
          trusted?: boolean
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          name?: string | null
          platform?: string | null
          trusted?: boolean
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      exchange_requests: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string
          replacement_items: Json
          requested_items: Json
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          replacement_items?: Json
          requested_items?: Json
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          replacement_items?: Json
          requested_items?: Json
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_assignments: {
        Row: {
          created_at: string
          enabled: boolean
          flag_key: string
          id: string
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          flag_key: string
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          flag_key?: string
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_assignments_flag_key_fkey"
            columns: ["flag_key"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "feature_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          key: string
          rollout_percentage: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          rollout_percentage?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          rollout_percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
        }
        Relationships: []
      }
      game_results: {
        Row: {
          created_at: string
          duration_seconds: number | null
          game_slug: string
          id: string
          metadata: Json
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          game_slug: string
          id?: string
          metadata?: Json
          score?: number
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          game_slug?: string
          id?: string
          metadata?: Json
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_results_game_slug_fkey"
            columns: ["game_slug"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["slug"]
          },
        ]
      }
      games: {
        Row: {
          category: string
          created_at: string
          description: string | null
          featured: boolean
          icon: string | null
          id: string
          max_players: number
          min_players: number
          name: string
          slug: string
          sort_order: number
          status: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          featured?: boolean
          icon?: string | null
          id?: string
          max_players?: number
          min_players?: number
          name: string
          slug: string
          sort_order?: number
          status?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          featured?: boolean
          icon?: string | null
          id?: string
          max_players?: number
          min_players?: number
          name?: string
          slug?: string
          sort_order?: number
          status?: string
        }
        Relationships: []
      }
      gift_cards: {
        Row: {
          balance: number
          code: string
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          initial_balance: number
          issued_to: string | null
          status: string
          updated_at: string
        }
        Insert: {
          balance?: number
          code: string
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          initial_balance?: number
          issued_to?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          code?: string
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          initial_balance?: number
          issued_to?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      login_history: {
        Row: {
          created_at: string
          email: string | null
          id: string
          ip_address: string | null
          method: string
          reason: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          method?: string
          reason?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          method?: string
          reason?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      oauth_identities: {
        Row: {
          created_at: string
          id: string
          linked_at: string
          metadata: Json
          provider: string
          provider_user_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          linked_at?: string
          metadata?: Json
          provider: string
          provider_user_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          linked_at?: string
          metadata?: Json
          provider?: string
          provider_user_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          metadata: Json
          order_id: string
          product_handle: string | null
          product_id: string | null
          quantity: number
          title: string
          total: number
          unit_price: number
          variant_id: string | null
          variant_title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          metadata?: Json
          order_id: string
          product_handle?: string | null
          product_id?: string | null
          quantity?: number
          title: string
          total?: number
          unit_price?: number
          variant_id?: string | null
          variant_title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          metadata?: Json
          order_id?: string
          product_handle?: string | null
          product_id?: string | null
          quantity?: number
          title?: string
          total?: number
          unit_price?: number
          variant_id?: string | null
          variant_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_timeline: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          kind: string
          message: string | null
          order_id: string
          payload: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          kind: string
          message?: string | null
          order_id: string
          payload?: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          message?: string | null
          order_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "order_timeline_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          attribution: Json
          billing_address: Json
          created_at: string
          currency: string
          discount_total: number
          email: string | null
          external_id: string | null
          fulfillment_status: Database["public"]["Enums"]["fulfillment_status"]
          id: string
          metadata: Json
          order_number: string
          organization_id: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string | null
          placed_at: string
          rsid: string | null
          shipping_address: Json
          shipping_total: number
          source: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_total: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attribution?: Json
          billing_address?: Json
          created_at?: string
          currency?: string
          discount_total?: number
          email?: string | null
          external_id?: string | null
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"]
          id?: string
          metadata?: Json
          order_number: string
          organization_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string | null
          placed_at?: string
          rsid?: string | null
          shipping_address?: Json
          shipping_total?: number
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attribution?: Json
          billing_address?: Json
          created_at?: string
          currency?: string
          discount_total?: number
          email?: string | null
          external_id?: string | null
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"]
          id?: string
          metadata?: Json
          order_number?: string
          organization_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string | null
          placed_at?: string
          rsid?: string | null
          shipping_address?: Json
          shipping_total?: number
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          status: Database["public"]["Enums"]["org_member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["org_member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["org_member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          organization_id: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          organization_id: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          organization_id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          name: string
          plan: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          name: string
          plan?: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          name?: string
          plan?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          metadata: Json
          paid_at: string | null
          provider: string | null
          provider_account_id: string | null
          provider_reference: string | null
          recipient_user_id: string | null
          scheduled_for: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          paid_at?: string | null
          provider?: string | null
          provider_account_id?: string | null
          provider_reference?: string | null
          recipient_user_id?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          paid_at?: string | null
          provider?: string | null
          provider_account_id?: string | null
          provider_reference?: string | null
          recipient_user_id?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_provider_account_id_fkey"
            columns: ["provider_account_id"]
            isOneToOne: false
            referencedRelation: "provider_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          level: number
          reso_coins: number
          updated_at: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          level?: number
          reso_coins?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          level?: number
          reso_coins?: number
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      provider_accounts: {
        Row: {
          account_label: string
          created_at: string
          currency: string
          external_account_id: string | null
          id: string
          metadata: Json
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          account_label: string
          created_at?: string
          currency?: string
          external_account_id?: string | null
          id?: string
          metadata?: Json
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_label?: string
          created_at?: string
          currency?: string
          external_account_id?: string | null
          id?: string
          metadata?: Json
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          order_id: string
          provider: string | null
          provider_reference: string | null
          reason: string | null
          return_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          order_id: string
          provider?: string | null
          provider_reference?: string | null
          reason?: string | null
          return_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          provider?: string | null
          provider_reference?: string | null
          reason?: string | null
          return_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          created_at: string
          id: string
          items: Json
          order_id: string
          reason: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          order_id: string
          reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          order_id?: string
          reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_ledger: {
        Row: {
          amount: number
          created_at: string
          currency: string
          entry_type: string
          fees: number
          id: string
          metadata: Json
          net_amount: number
          order_id: string | null
          provider: string | null
          provider_reference: string | null
          recognized_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          entry_type?: string
          fees?: number
          id?: string
          metadata?: Json
          net_amount?: number
          order_id?: string | null
          provider?: string | null
          provider_reference?: string | null
          recognized_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          entry_type?: string
          fees?: number
          id?: string
          metadata?: Json
          net_amount?: number
          order_id?: string | null
          provider?: string | null
          provider_reference?: string | null
          recognized_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_claims: {
        Row: {
          claimed_at: string
          id: string
          reward_slug: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          reward_slug: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          reward_slug?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_claims_reward_slug_fkey"
            columns: ["reward_slug"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["slug"]
          },
        ]
      }
      rewards: {
        Row: {
          active: boolean
          cost_coins: number
          created_at: string
          description: string | null
          id: string
          kind: string
          name: string
          slug: string
        }
        Insert: {
          active?: boolean
          cost_coins?: number
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          name: string
          slug: string
        }
        Update: {
          active?: boolean
          cost_coins?: number
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      settlement_ledger: {
        Row: {
          created_at: string
          currency: string
          fees: number
          gross_amount: number
          id: string
          metadata: Json
          net_amount: number
          provider: string
          provider_account_id: string | null
          reconciled: boolean
          settled_at: string | null
          settlement_reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          fees?: number
          gross_amount?: number
          id?: string
          metadata?: Json
          net_amount?: number
          provider: string
          provider_account_id?: string | null
          reconciled?: boolean
          settled_at?: string | null
          settlement_reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          fees?: number
          gross_amount?: number
          id?: string
          metadata?: Json
          net_amount?: number
          provider?: string
          provider_account_id?: string | null
          reconciled?: boolean
          settled_at?: string | null
          settlement_reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_ledger_provider_account_id_fkey"
            columns: ["provider_account_id"]
            isOneToOne: false
            referencedRelation: "provider_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_events: {
        Row: {
          created_at: string
          id: string
          location: string | null
          message: string | null
          occurred_at: string
          shipment_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          message?: string | null
          occurred_at?: string
          shipment_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          message?: string | null
          occurred_at?: string
          shipment_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          carrier: string | null
          created_at: string
          delivered_at: string | null
          estimated_delivery_at: string | null
          id: string
          order_id: string
          shipped_at: string | null
          status: string
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          estimated_delivery_at?: string | null
          id?: string
          order_id: string
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          estimated_delivery_at?: string | null
          id?: string
          order_id?: string
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_players: {
        Row: {
          id: string
          joined_at: string
          tournament_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          tournament_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_players_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          ends_at: string | null
          format: string
          game_slug: string
          id: string
          name: string
          slug: string
          starts_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          format?: string
          game_slug: string
          id?: string
          name: string
          slug: string
          starts_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          format?: string
          game_slug?: string
          id?: string
          name?: string
          slug?: string
          starts_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_game_slug_fkey"
            columns: ["game_slug"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["slug"]
          },
        ]
      }
      trivia_questions: {
        Row: {
          active: boolean
          category: string
          choices: Json
          correct_index: number
          created_at: string
          difficulty: string
          explanation: string | null
          id: string
          question: string
        }
        Insert: {
          active?: boolean
          category?: string
          choices: Json
          correct_index: number
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          question: string
        }
        Update: {
          active?: boolean
          category?: string
          choices?: Json
          correct_index?: number
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          question?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_sessions: {
        Row: {
          created_at: string
          device_id: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          last_active_at: string
          revoked_at: string | null
          started_at: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          last_active_at?: string
          revoked_at?: string | null
          started_at?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          last_active_at?: string
          revoked_at?: string | null
          started_at?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          currency: string
          description: string | null
          direction: string
          id: string
          metadata: Json
          reference: string | null
          source: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount?: number
          balance_after?: number
          created_at?: string
          currency?: string
          description?: string | null
          direction?: string
          id?: string
          metadata?: Json
          reference?: string | null
          source?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          currency?: string
          description?: string | null
          direction?: string
          id?: string
          metadata?: Json
          reference?: string | null
          source?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wellness_bonus_events: {
        Row: {
          coin_bonus: number
          created_at: string
          id: string
          metadata: Json
          source: string
          user_id: string
          xp_bonus: number
        }
        Insert: {
          coin_bonus?: number
          created_at?: string
          id?: string
          metadata?: Json
          source: string
          user_id: string
          xp_bonus?: number
        }
        Update: {
          coin_bonus?: number
          created_at?: string
          id?: string
          metadata?: Json
          source?: string
          user_id?: string
          xp_bonus?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_xp_coins: {
        Args: { _coins: number; _xp: number }
        Returns: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          level: number
          reso_coins: number
          updated_at: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_org_role: {
        Args: {
          _org_id: string
          _roles: Database["public"]["Enums"]["org_role"][]
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      owns_order: { Args: { _order_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "player"
      fulfillment_status:
        | "unfulfilled"
        | "partially_fulfilled"
        | "fulfilled"
        | "returned"
      order_status:
        | "draft"
        | "pending"
        | "confirmed"
        | "processing"
        | "fulfilled"
        | "completed"
        | "cancelled"
        | "refunded"
      org_member_status: "invited" | "active" | "suspended" | "removed"
      org_role: "owner" | "admin" | "manager" | "member" | "viewer"
      payment_status:
        | "unpaid"
        | "authorized"
        | "paid"
        | "partially_refunded"
        | "refunded"
        | "failed"
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
      app_role: ["admin", "moderator", "player"],
      fulfillment_status: [
        "unfulfilled",
        "partially_fulfilled",
        "fulfilled",
        "returned",
      ],
      order_status: [
        "draft",
        "pending",
        "confirmed",
        "processing",
        "fulfilled",
        "completed",
        "cancelled",
        "refunded",
      ],
      org_member_status: ["invited", "active", "suspended", "removed"],
      org_role: ["owner", "admin", "manager", "member", "viewer"],
      payment_status: [
        "unpaid",
        "authorized",
        "paid",
        "partially_refunded",
        "refunded",
        "failed",
      ],
    },
  },
} as const
