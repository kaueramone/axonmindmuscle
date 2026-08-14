"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { GoogleMark } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/surface";
import { createClient } from "@/lib/supabase/client";

export function GoogleButton({
  label,
  next,
  onError,
}: {
  label: string;
  next?: string;
  onError: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    if (next) callback.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback.toString(),
        queryParams: { prompt: "select_account" },
      },
    });

    if (error) {
      setLoading(false);
      onError();
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      fullWidth
      onClick={signIn}
      disabled={loading}
    >
      {loading ? <Spinner /> : <GoogleMark className="size-5" />}
      {label}
    </Button>
  );
}
