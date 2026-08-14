"use client";

import { useTheme } from "@/components/theme";
import { Moon, Sun } from "@/components/ui/icons";
import { updatePreferencesAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

/**
 * Alterna diretamente entre claro e escuro. As três opções — incluindo
 * "seguir o sistema" — continuam disponíveis na página de conta.
 */
export function ThemeToggle({
  labels,
  className,
}: {
  labels: { light: string; dark: string };
  className?: string;
}) {
  const { resolved, setPreference } = useTheme();
  const next = resolved === "dark" ? "light" : "dark";

  function toggle() {
    setPreference(next);
    const data = new FormData();
    data.set("theme", next);
    void updatePreferencesAction(data);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={next === "dark" ? labels.dark : labels.light}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full border border-hairline bg-surface text-fg-muted transition-colors duration-200 hover:text-fg",
        className,
      )}
    >
      {resolved === "dark" ? (
        <Sun className="size-4.5" />
      ) : (
        <Moon className="size-4.5" />
      )}
    </button>
  );
}
