import {
  BookOpen,
  Database,
  LockKeyhole,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
} from "lucide-react";
import { AuthCard, Button } from "../components/ui";
import type { AuthProvider } from "../types";
import { useState } from "react";

type AuthLandingProps = {
  error?: string;
  localAuthEnabled: boolean;
  providers: AuthProvider[];
  setupRequired: boolean;
  onLocalLogin: (email: string, password: string) => Promise<void>;
  onLocalRegister: (email: string, password: string) => Promise<void>;
};

const features = [
  {
    icon: Swords,
    title: "Run encounters",
    copy: "Track initiative, turns, actions, damage, healing, conditions, and combat summaries.",
  },
  {
    icon: Shield,
    title: "Manage the table",
    copy: "Keep campaign players, NPCs, monsters, spells, actions, and encounters in one workspace.",
  },
  {
    icon: Database,
    title: "Self-host your vault",
    copy: "Run bluDM with Docker and Postgres so your campaign data stays under your control.",
  },
];

export function AuthLanding({
  error,
  localAuthEnabled,
  providers,
  setupRequired,
  onLocalLogin,
  onLocalRegister,
}: AuthLandingProps) {
  const [localMode, setLocalMode] = useState<"login" | "register">(
    setupRequired ? "register" : "login",
  );
  const authTitle = localMode === "register" ? "Create your DM account" : "Sign in to your table";
  const submitLabel = localMode === "register" ? "Create account" : "Sign in";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-5 py-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-8">
          <div className="grid gap-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold uppercase tracking-wide text-accent">
              <Sparkles className="h-4 w-4" />
              Self-hosted encounter tracker
            </div>
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal md:text-6xl">
                A private DM workspace for building and running 5e combat.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                bluDM helps you prepare campaigns, store character sheets, build NPCs and monsters,
                run initiative, resolve attacks, and keep the combat log tidy without giving up
                control of your own data.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <feature.icon className="h-5 w-5 text-accent" />
                <h2 className="mt-4 font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.copy}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-3 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground md:grid-cols-2">
            <div className="flex gap-3">
              <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <p>
                OAuth accounts store only the minimum identity data needed to sign you in. Campaign
                content is scoped to your account.
              </p>
            </div>
            <div className="flex gap-3">
              <ScrollText className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <p>
                Local password login can stay enabled as a recovery fallback for self-hosted
                deployments.
              </p>
            </div>
          </div>
        </div>

        <aside className="grid gap-4">
          {error && (
            <div className="rounded-lg border border-destructive bg-card p-4 text-sm font-semibold text-destructive">
              {error}
            </div>
          )}

          <AuthCard
            title={authTitle}
            submitLabel={submitLabel}
            onSubmit={localMode === "register" ? onLocalRegister : onLocalLogin}
            localAuthEnabled={localAuthEnabled}
            providers={providers}
          />

          {localAuthEnabled && !setupRequired && (
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
              {localMode === "login" ? (
                <>
                  <p>Need a local account for this self-hosted table?</p>
                  <Button
                    className="mt-3"
                    type="button"
                    variant="secondary"
                    onClick={() => setLocalMode("register")}
                  >
                    Create username and password
                  </Button>
                </>
              ) : (
                <>
                  <p>Already have an account?</p>
                  <Button
                    className="mt-3"
                    type="button"
                    variant="secondary"
                    onClick={() => setLocalMode("login")}
                  >
                    Sign in instead
                  </Button>
                </>
              )}
            </div>
          )}

          {providers.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
              <div className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                <BookOpen className="h-4 w-4 text-accent" />
                OAuth sign-in is not configured yet
              </div>
              <p>
                Add Google or Apple OAuth environment variables to enable those sign-in buttons.
                Until then, use the local account flow if it is enabled.
              </p>
            </div>
          )}

          {!setupRequired && localAuthEnabled && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                window.location.href = "/privacy";
              }}
            >
              Read privacy notes
            </Button>
          )}
        </aside>
      </section>
    </main>
  );
}
