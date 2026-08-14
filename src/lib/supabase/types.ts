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
          plan: Database["public"]["Enums"]["user_plan"];
          theme: Database["public"]["Enums"]["theme_preference"];
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
          theme?: Database["public"]["Enums"]["theme_preference"];
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
          theme?: Database["public"]["Enums"]["theme_preference"];
          updated_at?: string;
          weekly_frequency?: number | null;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      app_locale: "pt-pt" | "pt-br";
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
