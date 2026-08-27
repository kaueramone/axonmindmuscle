/**
 * Tipos gerados a partir do esquema do projeto Supabase "Axon Plataforma".
 * Regenerar com:
 *   npx supabase gen types typescript --project-id ujgbyvbizhkhzogroshk > src/lib/supabase/types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      exercises: {
        Row: {
          attribution: string | null;
          category: Database["public"]["Enums"]["muscle_group"];
          created_at: string;
          created_by: string | null;
          equipment: string | null;
          id: string;
          is_active: boolean;
          license: string | null;
          media_type: Database["public"]["Enums"]["exercise_media_type"] | null;
          media_url: string | null;
          primary_muscles: Database["public"]["Enums"]["muscle_group"][];
          secondary_muscles: Database["public"]["Enums"]["muscle_group"][];
          slug: string;
          source: Database["public"]["Enums"]["exercise_source"];
          source_id: string | null;
          tracking: Database["public"]["Enums"]["exercise_tracking"];
          updated_at: string;
        };
        Insert: {
          attribution?: string | null;
          category: Database["public"]["Enums"]["muscle_group"];
          created_at?: string;
          created_by?: string | null;
          equipment?: string | null;
          id?: string;
          is_active?: boolean;
          license?: string | null;
          media_type?: Database["public"]["Enums"]["exercise_media_type"] | null;
          media_url?: string | null;
          primary_muscles?: Database["public"]["Enums"]["muscle_group"][];
          secondary_muscles?: Database["public"]["Enums"]["muscle_group"][];
          slug: string;
          source?: Database["public"]["Enums"]["exercise_source"];
          source_id?: string | null;
          tracking?: Database["public"]["Enums"]["exercise_tracking"];
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exercises"]["Insert"]>;
        Relationships: [];
      };
      exercise_translations: {
        Row: {
          action_feel: string | null;
          breathing: string | null;
          description: string | null;
          exercise_id: string;
          locale: Database["public"]["Enums"]["app_locale"];
          name: string;
          procedure: string | null;
        };
        Insert: {
          action_feel?: string | null;
          breathing?: string | null;
          description?: string | null;
          exercise_id: string;
          locale: Database["public"]["Enums"]["app_locale"];
          name: string;
          procedure?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["exercise_translations"]["Insert"]
        >;
        Relationships: [];
      };
      routines: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["routines"]["Insert"]>;
        Relationships: [];
      };
      routine_exercises: {
        Row: {
          id: string;
          routine_id: string;
          exercise_id: string;
          position: number;
          target_sets: number | null;
          target_reps: number | null;
          target_duration_s: number | null;
        };
        Insert: {
          id?: string;
          routine_id: string;
          exercise_id: string;
          position?: number;
          target_sets?: number | null;
          target_reps?: number | null;
          target_duration_s?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["routine_exercises"]["Insert"]>;
        Relationships: [];
      };
      workout_sessions: {
        Row: {
          created_at: string;
          ended_at: string | null;
          id: string;
          notes: string | null;
          rpe: number | null;
          routine_id: string | null;
          started_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          notes?: string | null;
          rpe?: number | null;
          routine_id?: string | null;
          started_at?: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["workout_sessions"]["Insert"]>;
        Relationships: [];
      };
      workout_sets: {
        Row: {
          completed_at: string;
          duration_s: number | null;
          exercise_id: string | null;
          exercise_name: string;
          id: string;
          intensity_zone: Database["public"]["Enums"]["intensity_zone"] | null;
          position: number;
          reps: number | null;
          rest_seconds: number | null;
          rir: number | null;
          session_id: string;
          tempo_concentric_s: number | null;
          tempo_eccentric_s: number | null;
          tempo_pause_s: number | null;
          user_id: string;
          weight_kg: number | null;
        };
        Insert: {
          completed_at?: string;
          duration_s?: number | null;
          exercise_id?: string | null;
          exercise_name: string;
          id?: string;
          intensity_zone?: Database["public"]["Enums"]["intensity_zone"] | null;
          position?: number;
          reps?: number | null;
          rest_seconds?: number | null;
          rir?: number | null;
          session_id: string;
          tempo_concentric_s?: number | null;
          tempo_eccentric_s?: number | null;
          tempo_pause_s?: number | null;
          user_id: string;
          weight_kg?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["workout_sets"]["Insert"]>;
        Relationships: [];
      };
      readiness_checkins: {
        Row: {
          created_at: string;
          drivers: Json;
          fatigue: number | null;
          id: string;
          local_date: string;
          resting_hr: number | null;
          score: number;
          sleep_hours: number | null;
          sleep_quality: number | null;
          sore_muscles: Database["public"]["Enums"]["muscle_group"][];
          soreness: number | null;
          state: Database["public"]["Enums"]["readiness_state"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          drivers?: Json;
          fatigue?: number | null;
          id?: string;
          local_date: string;
          resting_hr?: number | null;
          score: number;
          sleep_hours?: number | null;
          sleep_quality?: number | null;
          sore_muscles?: Database["public"]["Enums"]["muscle_group"][];
          soreness?: number | null;
          state: Database["public"]["Enums"]["readiness_state"];
          updated_at?: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["readiness_checkins"]["Insert"]>;
        Relationships: [];
      };
      rate_limits: {
        Row: {
          bucket: string;
          contador: number;
          janela_inicio: string;
        };
        Insert: {
          bucket: string;
          contador?: number;
          janela_inicio?: string;
        };
        Update: {
          bucket?: string;
          contador?: number;
          janela_inicio?: string;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          locale: Database["public"]["Enums"]["app_locale"];
          market: Database["public"]["Enums"]["market_code"];
          source: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          locale?: Database["public"]["Enums"]["app_locale"];
          market?: Database["public"]["Enums"]["market_code"];
          source?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          locale?: Database["public"]["Enums"]["app_locale"];
          market?: Database["public"]["Enums"]["market_code"];
          source?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean;
          created_at: string;
          currency: string | null;
          current_period_end: string | null;
          customer_id: string;
          id: string;
          interval: string | null;
          price_id: string | null;
          status: Database["public"]["Enums"]["subscription_status"];
          trial_end: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          currency?: string | null;
          current_period_end?: string | null;
          customer_id: string;
          id: string;
          interval?: string | null;
          price_id?: string | null;
          status: Database["public"]["Enums"]["subscription_status"];
          trial_end?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
        Relationships: [];
      };
      coupon_redemptions: {
        Row: {
          user_id: string;
          code: string;
          subscription_id: string | null;
          coupon_id: string | null;
          redeemed_at: string;
        };
        Insert: {
          user_id: string;
          code: string;
          subscription_id?: string | null;
          coupon_id?: string | null;
          redeemed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["coupon_redemptions"]["Insert"]>;
        Relationships: [];
      };
      stripe_events: {
        Row: { id: string; type: string; received_at: string };
        Insert: { id: string; type: string; received_at?: string };
        Update: Partial<Database["public"]["Tables"]["stripe_events"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          birth_date: string | null;
          created_at: string;
          display_name: string | null;
          experience: Database["public"]["Enums"]["experience_level"] | null;
          goal: Database["public"]["Enums"]["training_goal"] | null;
          height_cm: number | null;
          id: string;
          locale: Database["public"]["Enums"]["app_locale"];
          market: Database["public"]["Enums"]["market_code"];
          onboarding_completed_at: string | null;
          deletion_requested_at: string | null;
          pro_granted_at: string | null;
          pro_granted_by: string | null;
          plan: Database["public"]["Enums"]["user_plan"];
          role: Database["public"]["Enums"]["user_role"];
          stripe_customer_id: string | null;
          theme: Database["public"]["Enums"]["theme_preference"];
          timezone: string;
          updated_at: string;
          weekly_frequency: number | null;
          weight_kg: number | null;
        };
        Insert: {
          avatar_url?: string | null;
          birth_date?: string | null;
          created_at?: string;
          display_name?: string | null;
          experience?: Database["public"]["Enums"]["experience_level"] | null;
          goal?: Database["public"]["Enums"]["training_goal"] | null;
          height_cm?: number | null;
          id: string;
          locale?: Database["public"]["Enums"]["app_locale"];
          market?: Database["public"]["Enums"]["market_code"];
          onboarding_completed_at?: string | null;
          plan?: Database["public"]["Enums"]["user_plan"];
          role?: Database["public"]["Enums"]["user_role"];
          stripe_customer_id?: string | null;
          theme?: Database["public"]["Enums"]["theme_preference"];
          timezone?: string;
          updated_at?: string;
          weekly_frequency?: number | null;
          weight_kg?: number | null;
        };
        Update: {
          avatar_url?: string | null;
          birth_date?: string | null;
          created_at?: string;
          display_name?: string | null;
          experience?: Database["public"]["Enums"]["experience_level"] | null;
          goal?: Database["public"]["Enums"]["training_goal"] | null;
          height_cm?: number | null;
          id?: string;
          locale?: Database["public"]["Enums"]["app_locale"];
          market?: Database["public"]["Enums"]["market_code"];
          onboarding_completed_at?: string | null;
          plan?: Database["public"]["Enums"]["user_plan"];
          role?: Database["public"]["Enums"]["user_role"];
          stripe_customer_id?: string | null;
          theme?: Database["public"]["Enums"]["theme_preference"];
          timezone?: string;
          updated_at?: string;
          weekly_frequency?: number | null;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
    };
    Views: {
      workout_sets_local: {
        Row: {
          completed_at: string;
          duration_s: number | null;
          intensity_zone: Database["public"]["Enums"]["intensity_zone"] | null;
          exercise_id: string | null;
          exercise_name: string;
          id: string;
          local_date: string;
          reps: number | null;
          rir: number | null;
          session_id: string;
          tempo_concentric_s: number | null;
          tempo_eccentric_s: number | null;
          tempo_pause_s: number | null;
          user_id: string;
          volume_kg: number;
          weight_kg: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      consume_rate_limit: {
        Args: { p_acao: string };
        Returns: {
          permitido: boolean;
          repetir_em: number;
        }[];
      };
      admin_overview: {
        Args: Record<string, never>;
        Returns: {
          users_total: number;
          users_new_7: number;
          users_new_30: number;
          users_active_7: number;
          users_active_30: number;
          users_onboarded: number;
          sessions_total: number;
          sessions_7: number;
          sets_total: number;
          sets_7: number;
          volume_total: number;
          volume_7: number;
          checkins_7: number;
          leads_total: number;
          leads_7: number;
          exercises_active: number;
          exercises_with_media: number;
          market_pt: number;
          market_br: number;
        }[];
      };
      admin_daily_activity: {
        Args: { p_days?: number };
        Returns: {
          dia: string;
          novos_utilizadores: number;
          sessoes: number;
          series: number;
          utilizadores_ativos: number;
        }[];
      };
      admin_top_exercises: {
        Args: { p_days?: number; p_limit?: number };
        Returns: { exercise_name: string; series: number; utilizadores: number }[];
      };
      admin_readiness_split: {
        Args: { p_days?: number };
        Returns: {
          state: Database["public"]["Enums"]["readiness_state"];
          total: number;
        }[];
      };
      request_account_deletion: {
        Args: Record<string, never>;
        Returns: string;
      };
      cancel_account_deletion: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      admin_set_pro: {
        Args: { p_user: string; p_grant: boolean };
        Returns: undefined;
      };
      exercise_progress: {
        Args: { p_from: string; p_to: string };
        Returns: {
          exercicio: string;
          semana: string;
          carga_maxima: number | null;
          reps_na_maxima: number | null;
          volume: number;
          series: number;
        }[];
      };
      readiness_vs_performance: {
        Args: { p_from: string; p_to: string };
        Returns: {
          estado: Database["public"]["Enums"]["readiness_state"];
          sessoes: number;
          rpe_medio: number | null;
          volume_medio: number | null;
          series_medias: number | null;
          rir_medio: number | null;
        }[];
      };
      routine_week_summary: {
        Args: { p_routine: string; p_weeks?: number };
        Returns: {
          semana: string;
          sessoes: number;
          series: number;
          volume: number;
          minutos: number;
          rpe_medio: number | null;
          prontidao_media: number | null;
        }[];
      };
      last_performance: {
        Args: Record<string, never>;
        Returns: {
          exercise_id: string;
          performed_at: string;
          weight_kg: number | null;
          reps: number | null;
          rir: number | null;
          duration_s: number | null;
          intensity_zone: Database["public"]["Enums"]["intensity_zone"] | null;
        }[];
      };
      readiness_context: {
        Args: Record<string, never>;
        Returns: {
          baseline_resting_hr: number | null;
          baseline_sleep_hours: number | null;
          baseline_days: number;
          days_since_last_session: number | null;
          consecutive_days: number;
          sets_last_7: number;
          avg_weekly_sets: number;
          recent_muscles: Database["public"]["Enums"]["muscle_group"][];
        }[];
      };
      training_load_summary: {
        Args: { p_from: string; p_to: string };
        Returns: {
          dia: string;
          sessoes: number;
          minutos: number;
          carga: number;
          minutos_cardio: number;
        }[];
      };
      cardio_minutes_by_zone: {
        Args: { p_from: string; p_to: string };
        Returns: {
          zona: Database["public"]["Enums"]["intensity_zone"];
          minutos: number;
        }[];
      };
      readiness_history: {
        Args: { p_from: string; p_to: string };
        Returns: {
          dia: string;
          score: number;
          estado: Database["public"]["Enums"]["readiness_state"];
        }[];
      };
      readiness_summary: {
        Args: { p_from: string; p_to: string };
        Returns: {
          dias_registados: number;
          dias_forte: number;
          dias_moderado: number;
          dias_descanso: number;
          score_medio: number;
          score_melhor: number;
          dia_melhor: string | null;
        }[];
      };
      training_sets_by_muscle: {
        Args: { p_from: string; p_to: string };
        Returns: {
          muscle: Database["public"]["Enums"]["muscle_group"];
          sets: number;
          volume_kg: number;
        }[];
      };
      training_daily_summary: {
        Args: { p_from: string; p_to: string };
        Returns: {
          dia: string;
          sets: number;
          volume_kg: number;
          exercicios: number;
        }[];
      };
    };
    Enums: {
      app_locale: "pt-pt" | "pt-br";
      readiness_state: "strong" | "moderate" | "rest";
      exercise_source: "wger" | "axon";
      exercise_media_type: "image" | "video";
      exercise_tracking: "reps" | "time";
      intensity_zone: "facil" | "moderado" | "forte";
      user_role: "member" | "admin";
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "unpaid"
        | "paused";
      muscle_group:
        | "peito"
        | "costas"
        | "ombros"
        | "biceps"
        | "triceps"
        | "antebraco"
        | "abdomen"
        | "quadriceps"
        | "isquiotibiais"
        | "gluteos"
        | "gemeos"
        | "lombar"
        | "corpo_inteiro";
      experience_level: "beginner" | "intermediate" | "advanced";
      market_code: "PT" | "BR";
      theme_preference: "system" | "light" | "dark";
      training_goal: "hypertrophy" | "strength" | "endurance" | "health";
      user_plan: "free" | "pro";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];

export type Views<T extends keyof PublicSchema["Views"]> =
  PublicSchema["Views"][T]["Row"];

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

/* Atalhos usados na aplicação */
export type Profile = Tables<"profiles">;
export type ProfileUpdate = TablesUpdate<"profiles">;
export type TrainingGoal = Enums<"training_goal">;
export type ExperienceLevel = Enums<"experience_level">;
export type ThemePreference = Enums<"theme_preference">;
export type UserPlan = Enums<"user_plan">;
export type MarketCode = Enums<"market_code">;
export type MuscleGroup = Enums<"muscle_group">;
export type Exercise = Tables<"exercises">;
export type ExerciseTranslation = Tables<"exercise_translations">;
export type ExerciseMediaType = Enums<"exercise_media_type">;
export type ExerciseTracking = Enums<"exercise_tracking">;
export type IntensityZone = Enums<"intensity_zone">;
export type UserRole = Enums<"user_role">;
export type SubscriptionStatus = Enums<"subscription_status">;
export type Subscription = Tables<"subscriptions">;
export type WorkoutSession = Tables<"workout_sessions">;
export type WorkoutSet = Tables<"workout_sets">;
