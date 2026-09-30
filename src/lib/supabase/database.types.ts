// Generated from the database schema (Supabase generate_typescript_types).
// Regenerate after every migration; do not edit by hand.
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      areas: {
        Row: {
          created_at: string
          delivery_fee_cents: number | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_fee_cents?: number | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_fee_cents?: number | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_staff_id: string | null
          changes: Json | null
          created_at: string
          id: number
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_staff_id?: string | null
          changes?: Json | null
          created_at?: string
          id?: never
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_staff_id?: string | null
          changes?: Json | null
          created_at?: string
          id?: never
          row_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_staff_id_fkey"
            columns: ["actor_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          art: Json | null
          art_sample: string | null
          created_at: string
          description_ar: string
          description_en: string
          id: string
          image_url: string | null
          is_active: boolean
          name_ar: string
          name_en: string
          nav_name_ar: string | null
          nav_name_en: string | null
          parent_id: string | null
          rule: string | null
          slug: string
          sort_order: number
          styles: string[]
          updated_at: string
        }
        Insert: {
          art?: Json | null
          art_sample?: string | null
          created_at?: string
          description_ar?: string
          description_en?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_ar: string
          name_en: string
          nav_name_ar?: string | null
          nav_name_en?: string | null
          parent_id?: string | null
          rule?: string | null
          slug: string
          sort_order?: number
          styles?: string[]
          updated_at?: string
        }
        Update: {
          art?: Json | null
          art_sample?: string | null
          created_at?: string
          description_ar?: string
          description_en?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_ar?: string
          name_en?: string
          nav_name_ar?: string | null
          nav_name_en?: string | null
          parent_id?: string | null
          rule?: string | null
          slug?: string
          sort_order?: number
          styles?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_products: {
        Row: {
          collection_id: string
          product_id: string
          sort_order: number
        }
        Insert: {
          collection_id: string
          product_id: string
          sort_order?: number
        }
        Update: {
          collection_id?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          banner_url: string | null
          coupon_code: string | null
          created_at: string
          created_by: string | null
          description_ar: string
          description_en: string
          ends_at: string | null
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          starts_at: string | null
          title_ar: string
          title_en: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          banner_url?: string | null
          coupon_code?: string | null
          created_at?: string
          created_by?: string | null
          description_ar?: string
          description_en?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          slug: string
          sort_order?: number
          starts_at?: string | null
          title_ar: string
          title_en: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          banner_url?: string | null
          coupon_code?: string | null
          created_at?: string
          created_by?: string | null
          description_ar?: string
          description_en?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          starts_at?: string | null
          title_ar?: string
          title_en?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_cents: number
          staff_id: string | null
          starts_at: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at: string
          updated_by: string | null
          uses_count: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_cents?: number
          staff_id?: string | null
          starts_at?: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          updated_by?: string | null
          uses_count?: number
          value?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_cents?: number
          staff_id?: string | null
          starts_at?: string | null
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          updated_by?: string | null
          uses_count?: number
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          area_id: string | null
          auth_user_id: string | null
          birthday: string | null
          created_at: string
          id: string
          marketing_opt_in: boolean
          name: string
          notes: string | null
          phone: string
          phone_verified_at: string | null
          referred_at: string | null
          referred_by_staff_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          area_id?: string | null
          auth_user_id?: string | null
          birthday?: string | null
          created_at?: string
          id?: string
          marketing_opt_in?: boolean
          name: string
          notes?: string | null
          phone: string
          phone_verified_at?: string | null
          referred_at?: string | null
          referred_by_staff_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          area_id?: string | null
          auth_user_id?: string | null
          birthday?: string | null
          created_at?: string
          id?: string
          marketing_opt_in?: boolean
          name?: string
          notes?: string | null
          phone?: string
          phone_verified_at?: string | null
          referred_at?: string | null
          referred_by_staff_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_referred_by_staff_id_fkey"
            columns: ["referred_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      fonts: {
        Row: {
          created_at: string
          font_family: string
          font_file_url: string | null
          id: string
          is_active: boolean
          key: string
          name_ar: string
          name_en: string
          preview_image_url: string | null
          script: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          font_family: string
          font_file_url?: string | null
          id?: string
          is_active?: boolean
          key: string
          name_ar: string
          name_en: string
          preview_image_url?: string | null
          script?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          font_family?: string
          font_file_url?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name_ar?: string
          name_en?: string
          preview_image_url?: string | null
          script?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      imported_orders: {
        Row: {
          address: string | null
          area: string | null
          batch_id: string | null
          created_at: string
          customer_name: string | null
          external_ref: string | null
          id: string
          imported_by: string | null
          items: string | null
          order_date: string | null
          phone: string | null
          phone_raw: string | null
          raw: Json | null
          source: string
          status: string | null
          total_cents: number | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          batch_id?: string | null
          created_at?: string
          customer_name?: string | null
          external_ref?: string | null
          id?: string
          imported_by?: string | null
          items?: string | null
          order_date?: string | null
          phone?: string | null
          phone_raw?: string | null
          raw?: Json | null
          source: string
          status?: string | null
          total_cents?: number | null
        }
        Update: {
          address?: string | null
          area?: string | null
          batch_id?: string | null
          created_at?: string
          customer_name?: string | null
          external_ref?: string | null
          id?: string
          imported_by?: string | null
          items?: string | null
          order_date?: string | null
          phone?: string | null
          phone_raw?: string | null
          raw?: Json | null
          source?: string
          status?: string | null
          total_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "imported_orders_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_entries: {
        Row: {
          created_at: string
          created_by: string | null
          entry_date: string
          id: string
          note: string | null
          orders_count: number
          sales_cents: number
          staff_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entry_date: string
          id?: string
          note?: string | null
          orders_count?: number
          sales_cents?: number
          staff_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          note?: string | null
          orders_count?: number
          sales_cents?: number
          staff_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_entries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key: string
          name_ar: string
          name_en: string
          sort_order: number
          swatch: string
          tone: Database["public"]["Enums"]["metal_tone"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          name_ar: string
          name_en: string
          sort_order?: number
          swatch: string
          tone: Database["public"]["Enums"]["metal_tone"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          name_ar?: string
          name_en?: string
          sort_order?: number
          swatch?: string
          tone?: Database["public"]["Enums"]["metal_tone"]
          updated_at?: string
        }
        Relationships: []
      }
      order_adjustments: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          order_id: string
          type: Database["public"]["Enums"]["adjustment_type"]
          value: number | null
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id: string
          type: Database["public"]["Enums"]["adjustment_type"]
          value?: number | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id?: string
          type?: Database["public"]["Enums"]["adjustment_type"]
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_adjustments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          chain_connection:
            | Database["public"]["Enums"]["chain_connection"]
            | null
          created_at: string
          custom_text: string | null
          font_id: string | null
          font_name: string | null
          id: string
          line_total_cents: number | null
          material_id: string | null
          material_name: string
          order_id: string
          product_id: string | null
          product_name: string
          product_slug: string
          qty: number
          size_kind: Database["public"]["Enums"]["size_kind"] | null
          size_value: number | null
          unit_price_cents: number
        }
        Insert: {
          chain_connection?:
            | Database["public"]["Enums"]["chain_connection"]
            | null
          created_at?: string
          custom_text?: string | null
          font_id?: string | null
          font_name?: string | null
          id?: string
          line_total_cents?: number | null
          material_id?: string | null
          material_name: string
          order_id: string
          product_id?: string | null
          product_name: string
          product_slug: string
          qty?: number
          size_kind?: Database["public"]["Enums"]["size_kind"] | null
          size_value?: number | null
          unit_price_cents: number
        }
        Update: {
          chain_connection?:
            | Database["public"]["Enums"]["chain_connection"]
            | null
          created_at?: string
          custom_text?: string | null
          font_id?: string | null
          font_name?: string | null
          id?: string
          line_total_cents?: number | null
          material_id?: string | null
          material_name?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_slug?: string
          qty?: number
          size_kind?: Database["public"]["Enums"]["size_kind"] | null
          size_value?: number | null
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_font_id_fkey"
            columns: ["font_id"]
            isOneToOne: false
            referencedRelation: "fonts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          adjustments_cents: number
          area_id: string | null
          area_name: string | null
          attribution_source:
            | Database["public"]["Enums"]["attribution_source"]
            | null
          coupon_code: string | null
          coupon_id: string | null
          created_at: string
          customer_id: string
          customer_name: string
          delivery_fee_cents: number
          discount_cents: number
          id: string
          is_first_order: boolean
          notes: string | null
          number: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          request_id: string | null
          phone: string
          staff_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          total_cents: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          adjustments_cents?: number
          area_id?: string | null
          area_name?: string | null
          attribution_source?:
            | Database["public"]["Enums"]["attribution_source"]
            | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_id: string
          customer_name: string
          delivery_fee_cents?: number
          discount_cents?: number
          id?: string
          is_first_order?: boolean
          notes?: string | null
          number?: never
          payment_method?: Database["public"]["Enums"]["payment_method"]
          request_id?: string | null
          phone: string
          staff_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          total_cents: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          adjustments_cents?: number
          area_id?: string | null
          area_name?: string | null
          attribution_source?:
            | Database["public"]["Enums"]["attribution_source"]
            | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_id?: string
          customer_name?: string
          delivery_fee_cents?: number
          discount_cents?: number
          id?: string
          is_first_order?: boolean
          notes?: string | null
          number?: never
          payment_method?: Database["public"]["Enums"]["payment_method"]
          request_id?: string | null
          phone?: string
          staff_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: string
          product_id: string
          sort_order: number
        }
        Insert: {
          category_id: string
          product_id: string
          sort_order?: number
        }
        Update: {
          category_id?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_fonts: {
        Row: {
          font_id: string
          product_id: string
          sort_order: number
        }
        Insert: {
          font_id: string
          product_id: string
          sort_order?: number
        }
        Update: {
          font_id?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_fonts_font_id_fkey"
            columns: ["font_id"]
            isOneToOne: false
            referencedRelation: "fonts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_fonts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_materials: {
        Row: {
          compare_at_price_cents: number | null
          is_default: boolean
          material_id: string
          price_cents: number
          product_id: string
          sort_order: number
        }
        Insert: {
          compare_at_price_cents?: number | null
          is_default?: boolean
          material_id: string
          price_cents: number
          product_id: string
          sort_order?: number
        }
        Update: {
          compare_at_price_cents?: number | null
          is_default?: boolean
          material_id?: string
          price_cents?: number
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_materials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_media: {
        Row: {
          alt_ar: string
          alt_en: string
          created_at: string
          id: string
          product_id: string
          sort_order: number
          type: Database["public"]["Enums"]["media_type"]
          url: string
        }
        Insert: {
          alt_ar?: string
          alt_en?: string
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
          type?: Database["public"]["Enums"]["media_type"]
          url: string
        }
        Update: {
          alt_ar?: string
          alt_en?: string
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
          type?: Database["public"]["Enums"]["media_type"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_options: {
        Row: {
          id: string
          is_default: boolean
          kind: Database["public"]["Enums"]["size_kind"]
          price_modifier_cents: number
          product_id: string
          sort_order: number
          value: number
        }
        Insert: {
          id?: string
          is_default?: boolean
          kind: Database["public"]["Enums"]["size_kind"]
          price_modifier_cents?: number
          product_id: string
          sort_order?: number
          value: number
        }
        Update: {
          id?: string
          is_default?: boolean
          kind?: Database["public"]["Enums"]["size_kind"]
          price_modifier_cents?: number
          product_id?: string
          sort_order?: number
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          art: Json
          chain_connections: Database["public"]["Enums"]["chain_connection"][]
          created_at: string
          created_by: string | null
          description_ar: string
          description_en: string
          details_ar: string
          details_en: string
          id: string
          is_best_seller: boolean
          is_featured: boolean
          is_new: boolean
          is_personalizable: boolean | null
          max_length: number | null
          name_ar: string
          name_en: string
          personalization:
            | Database["public"]["Enums"]["personalization_kind"]
            | null
          sample_text: string | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["product_status"]
          style: string | null
          summary_ar: string
          summary_en: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          art: Json
          chain_connections?: Database["public"]["Enums"]["chain_connection"][]
          created_at?: string
          created_by?: string | null
          description_ar?: string
          description_en?: string
          details_ar?: string
          details_en?: string
          id?: string
          is_best_seller?: boolean
          is_featured?: boolean
          is_new?: boolean
          is_personalizable?: boolean | null
          max_length?: number | null
          name_ar: string
          name_en: string
          personalization?:
            | Database["public"]["Enums"]["personalization_kind"]
            | null
          sample_text?: string | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["product_status"]
          style?: string | null
          summary_ar?: string
          summary_en?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          art?: Json
          chain_connections?: Database["public"]["Enums"]["chain_connection"][]
          created_at?: string
          created_by?: string | null
          description_ar?: string
          description_en?: string
          details_ar?: string
          details_en?: string
          id?: string
          is_best_seller?: boolean
          is_featured?: boolean
          is_new?: boolean
          is_personalizable?: boolean | null
          max_length?: number | null
          name_ar?: string
          name_en?: string
          personalization?:
            | Database["public"]["Enums"]["personalization_kind"]
            | null
          sample_text?: string | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["product_status"]
          style?: string | null
          summary_ar?: string
          summary_en?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          headline_ar: string | null
          headline_en: string | null
          id: string
          is_active: boolean
          percent: number | null
          placement: string
          sort_order: number
          starts_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          headline_ar?: string | null
          headline_en?: string | null
          id?: string
          is_active?: boolean
          percent?: number | null
          placement: string
          sort_order?: number
          starts_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          headline_ar?: string | null
          headline_en?: string | null
          id?: string
          is_active?: boolean
          percent?: number | null
          placement?: string
          sort_order?: number
          starts_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          city: string | null
          city_ar: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          id: string
          is_approved: boolean
          is_sample: boolean
          photo_url: string | null
          product_id: string | null
          rating: number
          review_date: string
          source: Database["public"]["Enums"]["review_source"]
          text: string
          text_ar: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          city?: string | null
          city_ar?: string | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          id?: string
          is_approved?: boolean
          is_sample?: boolean
          photo_url?: string | null
          product_id?: string | null
          rating: number
          review_date?: string
          source?: Database["public"]["Enums"]["review_source"]
          text: string
          text_ar?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          city?: string | null
          city_ar?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          id?: string
          is_approved?: boolean
          is_sample?: boolean
          photo_url?: string | null
          product_id?: string | null
          rating?: number
          review_date?: string
          source?: Database["public"]["Enums"]["review_source"]
          text?: string
          text_ar?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          announcements: Json
          created_at: string
          delivery_days_max: number
          delivery_days_min: number
          delivery_fee_cents: number
          first_order_free_delivery: boolean
          free_shipping_threshold_cents: number
          id: number
          instagram_url: string
          shipping_info_ar: string
          shipping_info_en: string
          updated_at: string
          updated_by: string | null
          whatsapp_number: string
        }
        Insert: {
          announcements?: Json
          created_at?: string
          delivery_days_max?: number
          delivery_days_min?: number
          delivery_fee_cents?: number
          first_order_free_delivery?: boolean
          free_shipping_threshold_cents?: number
          id?: number
          instagram_url?: string
          shipping_info_ar?: string
          shipping_info_en?: string
          updated_at?: string
          updated_by?: string | null
          whatsapp_number?: string
        }
        Update: {
          announcements?: Json
          created_at?: string
          delivery_days_max?: number
          delivery_days_min?: number
          delivery_fee_cents?: number
          first_order_free_delivery?: boolean
          free_shipping_threshold_cents?: number
          id?: number
          instagram_url?: string
          shipping_info_ar?: string
          shipping_info_en?: string
          updated_at?: string
          updated_by?: string | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string
          ref_code: string
          role: Database["public"]["Enums"]["staff_role"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone: string
          ref_code: string
          role?: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string
          ref_code?: string
          role?: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      staff_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          permission: string
          staff_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          permission: string
          staff_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowed?: boolean
          created_at?: string
          permission?: string
          staff_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_permissions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_permissions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      daily_sales: {
        Row: {
          day: string | null
          orders_count: number | null
          sales_cents: number | null
          source: string | null
          staff_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      list_helpers: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
      place_order: {
        Args: {
          p_coupon_code?: string
          p_customer: Json
          p_helper_staff_id?: string
          p_items: Json
          p_notes?: string
          p_payment_method?: Database["public"]["Enums"]["payment_method"]
          p_ref_code?: string
          p_request_id?: string
        }
        Returns: Json
      }
      quote_order: {
        Args: {
          p_area?: string
          p_coupon_code?: string
          p_items: Json
          p_phone?: string
        }
        Returns: Json
      }
    }
    Enums: {
      adjustment_type:
        | "gift"
        | "discount_percent"
        | "half_off"
        | "buy_one_get_one"
        | "free_delivery"
        | "extra_delivery"
        | "other"
      attribution_source: "code" | "checkout" | "customer_history" | "link"
      chain_connection: "sides" | "center"
      coupon_type: "percent" | "fixed" | "free_delivery"
      media_type: "image" | "video"
      metal_tone: "gold" | "silver" | "rose"
      order_status:
        | "pending"
        | "confirmed"
        | "in_production"
        | "shipped"
        | "delivered"
        | "cancelled"
      payment_method: "cod" | "whish"
      personalization_kind: "name" | "initial"
      product_status: "draft" | "active" | "archived"
      review_source: "website" | "instagram" | "whatsapp"
      size_kind: "chain" | "bracelet" | "ring"
      staff_role: "owner" | "staff"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      adjustment_type: [
        "gift",
        "discount_percent",
        "half_off",
        "buy_one_get_one",
        "free_delivery",
        "extra_delivery",
        "other",
      ],
      attribution_source: ["code", "checkout", "customer_history", "link"],
      chain_connection: ["sides", "center"],
      coupon_type: ["percent", "fixed", "free_delivery"],
      media_type: ["image", "video"],
      metal_tone: ["gold", "silver", "rose"],
      order_status: [
        "pending",
        "confirmed",
        "in_production",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_method: ["cod", "whish"],
      personalization_kind: ["name", "initial"],
      product_status: ["draft", "active", "archived"],
      review_source: ["website", "instagram", "whatsapp"],
      size_kind: ["chain", "bracelet", "ring"],
      staff_role: ["owner", "staff"],
    },
  },
} as const
