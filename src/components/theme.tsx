"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ThemePreference } from "@/lib/supabase/types";

const STORAGE_KEY = "axon-theme";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: "light" | "dark";
  setPreference: (value: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Script injetado antes da hidratação: aplica o tema guardado ao <html>
 * para que não exista um instante com as cores erradas.
 */
export const themeScript = `(function(){try{var p=localStorage.getItem("${STORAGE_KEY}")||"dark";var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=p==="system"?(d?"dark":"light"):p;document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.dataset.theme="dark";}})();`;

function resolve(preference: ThemePreference): "light" | "dark" {
  if (preference !== "system") return preference;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(theme: "light" | "dark") {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", theme === "dark" ? "#05070C" : "#F3F6FA");
}

export function ThemeProvider({
  children,
  initial = "dark",
}: {
  children: React.ReactNode;
  initial?: ThemePreference;
}) {
  const [preference, setPreferenceState] = useState<ThemePreference>(initial);
  const [resolved, setResolved] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    const value = stored ?? initial;
    setPreferenceState(value);
    const next = resolve(value);
    setResolved(next);
    apply(next);
  }, [initial]);

  useEffect(() => {
    if (preference !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      const next = query.matches ? "dark" : "light";
      setResolved(next);
      apply(next);
    };
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, [preference]);

  const setPreference = useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    localStorage.setItem(STORAGE_KEY, value);
    const next = resolve(value);
    setResolved(next);
    apply(next);
  }, []);

  const contextValue = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return (
    <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme tem de ser usado dentro de ThemeProvider");
  return context;
}
