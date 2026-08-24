"use client";

import { useState } from "react";
import { Button, Callout, Field, Input } from "@/components/ui";
import { apiRequest } from "@/lib/client";

const ERRORS: Record<string, string> = {
  missing: "That sign-in link was incomplete. Request a new one below.",
  expired: "That sign-in link has expired or was already used. Request a new one below.",
};

export function SignInForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError ? ERRORS[initialError] ?? null : null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setStatus("sending");
    try {
      const result = await apiRequest<{ emailed: boolean; link: string | null }>("/api/auth/request", {
        method: "POST",
        body: { email, clientName: clientName || undefined },
      });
      setLink(result.link);
      setStatus("sent");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send the link");
      setStatus("idle");
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h2 className="text-2xl font-semibold">Sign in</h2>
      <p className="mt-2 text-sm text-body/80">
        We email a single-use link — no password to remember.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Email">
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Your name" hint="Used the first time you sign in.">
          <Input
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            placeholder="Diteria"
          />
        </Field>
        <Button type="submit" disabled={status === "sending"} className="w-full">
          {status === "sending" ? "Sending…" : "Email me a sign-in link"}
        </Button>
      </form>

      {error && (
        <div className="mt-4">
          <Callout tone="danger">{error}</Callout>
        </div>
      )}

      {status === "sent" && (
        <div className="mt-4">
          <Callout tone="good" title="Link sent">
            {link ? (
              <>
                <p>Email delivery is not configured on this install, so use this link directly:</p>
                <a className="mt-2 block break-all font-semibold underline" href={link}>
                  {link}
                </a>
              </>
            ) : (
              <p>Check {email} for your single-use sign-in link. It expires in 20 minutes.</p>
            )}
          </Callout>
        </div>
      )}
    </div>
  );
}
