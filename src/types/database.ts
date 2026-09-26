export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      chapter_answers: {
        Row: {
          block_id: string | null
          chapter_id: string | null
          condition_id: string | null
          correct_answers: string[]
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          radius_meters: number | null
          updated_at: string
        }
        Insert: {
          block_id?: string | null
          chapter_id?: string | null
          condition_id?: string | null
          correct_answers: string[]
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          radius_meters?: number | null
          updated_at?: string
        }
        Update: {
          block_id?: string | null
          chapter_id?: string | null
          condition_id?: string | null
          correct_answers?: string[]
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          radius_meters?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chapter_answers_block_id_fkey'
            columns: ['block_id']
            isOneToOne: true
            referencedRelation: 'chapter_blocks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chapter_answers_chapter_id_fkey'
            columns: ['chapter_id']
            isOneToOne: true
            referencedRelation: 'chapters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chapter_answers_chapter_id_fkey'
            columns: ['chapter_id']
            isOneToOne: true
            referencedRelation: 'chapters_player_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chapter_answers_condition_id_fkey'
            columns: ['condition_id']
            isOneToOne: true
            referencedRelation: 'chapter_unlock_conditions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chapter_answers_condition_id_fkey'
            columns: ['condition_id']
            isOneToOne: true
            referencedRelation: 'chapter_unlock_conditions_player_view'
            referencedColumns: ['id']
          },
        ]
      }
      chapter_block_qr_tokens: {
        Row: {
          block_id: string
          created_at: string
          token_hash: string
        }
        Insert: {
          block_id: string
          created_at?: string
          token_hash: string
        }
        Update: {
          block_id?: string
          created_at?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chapter_block_qr_tokens_block_id_fkey'
            columns: ['block_id']
            isOneToOne: true
            referencedRelation: 'chapter_blocks'
            referencedColumns: ['id']
          },
        ]
      }
      chapter_blocks: {
        Row: {
          alt_text: string | null
          block_type: string
          body_markdown: string | null
          caption: string | null
          chapter_id: string
          created_at: string
          gate: string
          id: string
          map_pin_id: string | null
          order_index: number
          parent_block_id: string | null
          question_config: Json | null
          reveal_on: string | null
          storage_path: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          block_type: string
          body_markdown?: string | null
          caption?: string | null
          chapter_id: string
          created_at?: string
          gate?: string
          id?: string
          map_pin_id?: string | null
          order_index?: number
          parent_block_id?: string | null
          question_config?: Json | null
          reveal_on?: string | null
          storage_path?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          block_type?: string
          body_markdown?: string | null
          caption?: string | null
          chapter_id?: string
          created_at?: string
          gate?: string
          id?: string
          map_pin_id?: string | null
          order_index?: number
          parent_block_id?: string | null
          question_config?: Json | null
          reveal_on?: string | null
          storage_path?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chapter_blocks_chapter_id_fkey'
            columns: ['chapter_id']
            isOneToOne: false
            referencedRelation: 'chapters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chapter_blocks_chapter_id_fkey'
            columns: ['chapter_id']
            isOneToOne: false
            referencedRelation: 'chapters_player_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chapter_blocks_map_pin_id_fkey'
            columns: ['map_pin_id']
            isOneToOne: false
            referencedRelation: 'chapter_map_pins'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chapter_blocks_parent_block_id_fkey'
            columns: ['parent_block_id']
            isOneToOne: false
            referencedRelation: 'chapter_blocks'
            referencedColumns: ['id']
          },
        ]
      }
      chapter_map_pins: {
        Row: {
          chapter_id: string
          city_key: string
          created_at: string
          id: string
        }
        Insert: {
          chapter_id: string
          city_key: string
          created_at?: string
          id?: string
        }
        Update: {
          chapter_id?: string
          city_key?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chapter_map_pins_chapter_id_fkey'
            columns: ['chapter_id']
            isOneToOne: false
            referencedRelation: 'chapters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chapter_map_pins_chapter_id_fkey'
            columns: ['chapter_id']
            isOneToOne: false
            referencedRelation: 'chapters_player_view'
            referencedColumns: ['id']
          },
        ]
      }
      chapter_map_segments: {
        Row: {
          created_at: string
          curve: number
          from_chapter_id: string
          id: string
          to_chapter_id: string
        }
        Insert: {
          created_at?: string
          curve?: number
          from_chapter_id: string
          id?: string
          to_chapter_id: string
        }
        Update: {
          created_at?: string
          curve?: number
          from_chapter_id?: string
          id?: string
          to_chapter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chapter_map_segments_from_chapter_id_fkey'
            columns: ['from_chapter_id']
            isOneToOne: false
            referencedRelation: 'chapters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chapter_map_segments_from_chapter_id_fkey'
            columns: ['from_chapter_id']
            isOneToOne: false
            referencedRelation: 'chapters_player_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chapter_map_segments_to_chapter_id_fkey'
            columns: ['to_chapter_id']
            isOneToOne: false
            referencedRelation: 'chapters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chapter_map_segments_to_chapter_id_fkey'
            columns: ['to_chapter_id']
            isOneToOne: false
            referencedRelation: 'chapters_player_view'
            referencedColumns: ['id']
          },
        ]
      }
      chapter_unlock_conditions: {
        Row: {
          allowed_radius_meters: number | null
          chapter_id: string
          condition_type: string
          created_at: string
          failure_message: string | null
          hint: string | null
          id: string
          latitude: number | null
          longitude: number | null
          qr_token_hash: string | null
          question_config: Json | null
          step_order: number
          success_message: string | null
          updated_at: string
        }
        Insert: {
          allowed_radius_meters?: number | null
          chapter_id: string
          condition_type: string
          created_at?: string
          failure_message?: string | null
          hint?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          qr_token_hash?: string | null
          question_config?: Json | null
          step_order?: number
          success_message?: string | null
          updated_at?: string
        }
        Update: {
          allowed_radius_meters?: number | null
          chapter_id?: string
          condition_type?: string
          created_at?: string
          failure_message?: string | null
          hint?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          qr_token_hash?: string | null
          question_config?: Json | null
          step_order?: number
          success_message?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chapter_unlock_conditions_chapter_id_fkey'
            columns: ['chapter_id']
            isOneToOne: false
            referencedRelation: 'chapters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chapter_unlock_conditions_chapter_id_fkey'
            columns: ['chapter_id']
            isOneToOne: false
            referencedRelation: 'chapters_player_view'
            referencedColumns: ['id']
          },
        ]
      }
      chapters: {
        Row: {
          allowed_radius_meters: number | null
          content_markdown: string | null
          created_at: string
          description: string | null
          failure_message: string | null
          hidden_until_unlocked: boolean
          hint: string | null
          id: string
          is_final: boolean
          is_published: boolean
          latitude: number | null
          longitude: number | null
          map_x: number | null
          map_y: number | null
          order_index: number
          qr_token_hash: string | null
          question_config: Json | null
          required_block_id: string | null
          required_chapter_id: string | null
          slug: string
          success_message: string | null
          title: string
          unlock_type: string
          updated_at: string
        }
        Insert: {
          allowed_radius_meters?: number | null
          content_markdown?: string | null
          created_at?: string
          description?: string | null
          failure_message?: string | null
          hidden_until_unlocked?: boolean
          hint?: string | null
          id?: string
          is_final?: boolean
          is_published?: boolean
          latitude?: number | null
          longitude?: number | null
          map_x?: number | null
          map_y?: number | null
          order_index?: number
          qr_token_hash?: string | null
          question_config?: Json | null
          required_block_id?: string | null
          required_chapter_id?: string | null
          slug: string
          success_message?: string | null
          title: string
          unlock_type: string
          updated_at?: string
        }
        Update: {
          allowed_radius_meters?: number | null
          content_markdown?: string | null
          created_at?: string
          description?: string | null
          failure_message?: string | null
          hidden_until_unlocked?: boolean
          hint?: string | null
          id?: string
          is_final?: boolean
          is_published?: boolean
          latitude?: number | null
          longitude?: number | null
          map_x?: number | null
          map_y?: number | null
          order_index?: number
          qr_token_hash?: string | null
          question_config?: Json | null
          required_block_id?: string | null
          required_chapter_id?: string | null
          slug?: string
          success_message?: string | null
          title?: string
          unlock_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chapters_required_block_id_fkey'
            columns: ['required_block_id']
            isOneToOne: false
            referencedRelation: 'chapter_blocks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chapters_required_chapter_id_fkey'
            columns: ['required_chapter_id']
            isOneToOne: false
            referencedRelation: 'chapters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chapters_required_chapter_id_fkey'
            columns: ['required_chapter_id']
            isOneToOne: false
            referencedRelation: 'chapters_player_view'
            referencedColumns: ['id']
          },
        ]
      }
      player_block_progress: {
        Row: {
          attempt_count: number
          block_id: string
          id: string
          last_correct: boolean | null
          player_id: string
          solved_at: string | null
        }
        Insert: {
          attempt_count?: number
          block_id: string
          id?: string
          last_correct?: boolean | null
          player_id: string
          solved_at?: string | null
        }
        Update: {
          attempt_count?: number
          block_id?: string
          id?: string
          last_correct?: boolean | null
          player_id?: string
          solved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'player_block_progress_block_id_fkey'
            columns: ['block_id']
            isOneToOne: false
            referencedRelation: 'chapter_blocks'
            referencedColumns: ['id']
          },
        ]
      }
      player_condition_progress: {
        Row: {
          attempt_count: number
          completed_at: string | null
          condition_id: string
          id: string
          last_interaction_at: string
          player_id: string
          status: string
          unlocked_at: string | null
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          condition_id: string
          id?: string
          last_interaction_at?: string
          player_id: string
          status?: string
          unlocked_at?: string | null
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          condition_id?: string
          id?: string
          last_interaction_at?: string
          player_id?: string
          status?: string
          unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'player_condition_progress_condition_id_fkey'
            columns: ['condition_id']
            isOneToOne: false
            referencedRelation: 'chapter_unlock_conditions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'player_condition_progress_condition_id_fkey'
            columns: ['condition_id']
            isOneToOne: false
            referencedRelation: 'chapter_unlock_conditions_player_view'
            referencedColumns: ['id']
          },
        ]
      }
      player_progress: {
        Row: {
          attempt_count: number
          chapter_id: string
          completed_at: string | null
          id: string
          last_interaction_at: string
          player_id: string
          status: string
          unlocked_at: string | null
        }
        Insert: {
          attempt_count?: number
          chapter_id: string
          completed_at?: string | null
          id?: string
          last_interaction_at?: string
          player_id: string
          status?: string
          unlocked_at?: string | null
        }
        Update: {
          attempt_count?: number
          chapter_id?: string
          completed_at?: string | null
          id?: string
          last_interaction_at?: string
          player_id?: string
          status?: string
          unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'player_progress_chapter_id_fkey'
            columns: ['chapter_id']
            isOneToOne: false
            referencedRelation: 'chapters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'player_progress_chapter_id_fkey'
            columns: ['chapter_id']
            isOneToOne: false
            referencedRelation: 'chapters_player_view'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      qr_events: {
        Row: {
          block_id: string | null
          chapter_id: string | null
          condition_id: string | null
          created_at: string
          id: string
          player_id: string
        }
        Insert: {
          block_id?: string | null
          chapter_id?: string | null
          condition_id?: string | null
          created_at?: string
          id?: string
          player_id: string
        }
        Update: {
          block_id?: string | null
          chapter_id?: string | null
          condition_id?: string | null
          created_at?: string
          id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'qr_events_block_id_fkey'
            columns: ['block_id']
            isOneToOne: false
            referencedRelation: 'chapter_blocks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'qr_events_chapter_id_fkey'
            columns: ['chapter_id']
            isOneToOne: false
            referencedRelation: 'chapters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'qr_events_chapter_id_fkey'
            columns: ['chapter_id']
            isOneToOne: false
            referencedRelation: 'chapters_player_view'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'qr_events_condition_id_fkey'
            columns: ['condition_id']
            isOneToOne: false
            referencedRelation: 'chapter_unlock_conditions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'qr_events_condition_id_fkey'
            columns: ['condition_id']
            isOneToOne: false
            referencedRelation: 'chapter_unlock_conditions_player_view'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      chapter_unlock_conditions_player_view: {
        Row: {
          allowed_radius_meters: number | null
          chapter_id: string | null
          condition_type: string | null
          created_at: string | null
          failure_message: string | null
          hint: string | null
          id: string | null
          question_config: Json | null
          step_order: number | null
          success_message: string | null
          updated_at: string | null
        }
        Insert: {
          allowed_radius_meters?: number | null
          chapter_id?: string | null
          condition_type?: string | null
          created_at?: string | null
          failure_message?: string | null
          hint?: string | null
          id?: string | null
          question_config?: Json | null
          step_order?: number | null
          success_message?: string | null
          updated_at?: string | null
        }
        Update: {
          allowed_radius_meters?: number | null
          chapter_id?: string | null
          condition_type?: string | null
          created_at?: string | null
          failure_message?: string | null
          hint?: string | null
          id?: string | null
          question_config?: Json | null
          step_order?: number | null
          success_message?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'chapter_unlock_conditions_chapter_id_fkey'
            columns: ['chapter_id']
            isOneToOne: false
            referencedRelation: 'chapters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chapter_unlock_conditions_chapter_id_fkey'
            columns: ['chapter_id']
            isOneToOne: false
            referencedRelation: 'chapters_player_view'
            referencedColumns: ['id']
          },
        ]
      }
      chapters_player_view: {
        Row: {
          allowed_radius_meters: number | null
          content_markdown: string | null
          created_at: string | null
          description: string | null
          failure_message: string | null
          hint: string | null
          id: string | null
          is_final: boolean | null
          order_index: number | null
          question_config: Json | null
          required_chapter_id: string | null
          slug: string | null
          success_message: string | null
          title: string | null
          unlock_type: string | null
          updated_at: string | null
        }
        Insert: {
          allowed_radius_meters?: number | null
          content_markdown?: string | null
          created_at?: string | null
          description?: string | null
          failure_message?: string | null
          hint?: string | null
          id?: string | null
          is_final?: boolean | null
          order_index?: number | null
          question_config?: Json | null
          required_chapter_id?: string | null
          slug?: string | null
          success_message?: string | null
          title?: string | null
          unlock_type?: string | null
          updated_at?: string | null
        }
        Update: {
          allowed_radius_meters?: number | null
          content_markdown?: string | null
          created_at?: string | null
          description?: string | null
          failure_message?: string | null
          hint?: string | null
          id?: string | null
          is_final?: boolean | null
          order_index?: number | null
          question_config?: Json | null
          required_chapter_id?: string | null
          slug?: string | null
          success_message?: string | null
          title?: string | null
          unlock_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'chapters_required_chapter_id_fkey'
            columns: ['required_chapter_id']
            isOneToOne: false
            referencedRelation: 'chapters'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chapters_required_chapter_id_fkey'
            columns: ['required_chapter_id']
            isOneToOne: false
            referencedRelation: 'chapters_player_view'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      admin_delete_chapter: {
        Args: { p_chapter_id: string }
        Returns: string[]
      }
      admin_reset_progress: {
        Args: { p_player_id: string }
        Returns: undefined
      }
      admin_set_block_qr_token: {
        Args: { p_block_id: string; p_token: string }
        Returns: undefined
      }
      admin_set_chapter_status: {
        Args: { p_chapter_id: string; p_player_id: string; p_status: string }
        Returns: undefined
      }
      admin_set_qr_token: {
        Args: { p_chapter_id: string; p_condition_id: string; p_token: string }
        Returns: undefined
      }
      block_is_visible: { Args: { p_block_id: string }; Returns: boolean }
      block_step_passed: { Args: { p_block_id: string }; Returns: boolean }
      block_step_reachable: { Args: { p_block_id: string }; Returns: boolean }
      chapter_effective_status: {
        Args: { p_chapter_id: string }
        Returns: string
      }
      chapter_is_accessible: {
        Args: { p_chapter_id: string }
        Returns: boolean
      }
      chapter_is_on_map: { Args: { p_chapter_id: string }; Returns: boolean }
      chapter_is_published: { Args: { p_chapter_id: string }; Returns: boolean }
      chapter_step_count: { Args: { p_chapter_id: string }; Returns: number }
      chapter_steps_done: { Args: { p_chapter_id: string }; Returns: boolean }
      complete_block_step: { Args: { p_block_id: string }; Returns: undefined }
      complete_manual_step: { Args: { p_chapter_id: string }; Returns: Json }
      effective_status: {
        Args: {
          p_required_block_id: string
          p_required_chapter_id: string
          p_stored_status: string
        }
        Returns: string
      }
      ensure_chapter_unlocked: {
        Args: { p_chapter_id: string }
        Returns: {
          attempt_count: number
          chapter_id: string
          completed_at: string | null
          id: string
          last_interaction_at: string
          player_id: string
          status: string
          unlocked_at: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'player_progress'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_condition_unlocked: {
        Args: { p_condition_id: string }
        Returns: {
          attempt_count: number
          completed_at: string | null
          condition_id: string
          id: string
          last_interaction_at: string
          player_id: string
          status: string
          unlocked_at: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'player_condition_progress'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finalize_combined_chapter: {
        Args: { p_chapter_id: string }
        Returns: undefined
      }
      get_chapter_status: { Args: { p_chapter_id: string }; Returns: string }
      get_my_timeline: {
        Args: never
        Returns: {
          chapter_id: string
          description: string
          is_final: boolean
          map_x: number
          map_y: number
          order_index: number
          slug: string
          status: string
          title: string
          unlock_type: string
        }[]
      }
      hash_token: { Args: { p_token: string }; Returns: string }
      haversine_meters: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      mark_block_step_passed: {
        Args: { p_block_id: string }
        Returns: undefined
      }
      normalize_answer: { Args: { p_answer: string }; Returns: string }
      verify_answer: {
        Args: { p_answer: string; p_chapter_id: string; p_condition_id: string }
        Returns: Json
      }
      verify_block_answer: {
        Args: { p_answer: string; p_block_id: string }
        Returns: Json
      }
      verify_block_location: {
        Args: {
          p_accuracy: number
          p_block_id: string
          p_lat: number
          p_lng: number
        }
        Returns: Json
      }
      verify_block_place: {
        Args: { p_block_id: string; p_lat: number; p_lng: number }
        Returns: Json
      }
      verify_block_qr: {
        Args: { p_block_id: string; p_token: string }
        Returns: Json
      }
      verify_location: {
        Args: {
          p_accuracy: number
          p_chapter_id: string
          p_condition_id: string
          p_lat: number
          p_lng: number
        }
        Returns: Json
      }
      verify_qr: {
        Args: { p_chapter_id: string; p_condition_id: string; p_token: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
