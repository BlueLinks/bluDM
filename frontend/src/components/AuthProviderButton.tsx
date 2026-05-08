import type { AuthProvider } from "../types";
import { Button } from "./uiBase";

export function AuthProviderButton({ provider }: { provider: AuthProvider }) {
  const startSignIn = () => {
    window.location.href = `${provider.url}?returnTo=${encodeURIComponent(window.location.pathname)}`;
  };

  if (provider.id === "google") {
    return (
      <button
        type="button"
        className="inline-flex h-10 w-full items-center justify-center gap-3 rounded-md border border-[#dadce0] bg-white px-3 text-sm font-medium text-[#3c4043] shadow-sm transition hover:bg-[#f8fafd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a73e8]"
        onClick={startSignIn}
      >
        <GoogleIcon />
        <span>{provider.label}</span>
      </button>
    );
  }

  if (provider.id === "discord") {
    return (
      <button
        type="button"
        className="inline-flex h-10 w-full items-center justify-center gap-3 rounded-md bg-[#5865f2] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4752c4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#19175c] dark:focus-visible:outline-[#e0e3ff]"
        onClick={startSignIn}
      >
        <DiscordIcon />
        <span>{provider.label}</span>
      </button>
    );
  }

  return (
    <Button type="button" variant="secondary" onClick={startSignIn}>
      {provider.label}
    </Button>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 18 18">
      <path
        fill="#4285f4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"
      />
      <path
        fill="#34a853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.84.86-3.05.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#fbbc05"
        d="M3.95 10.7a5.41 5.41 0 0 1 0-3.4V4.97H.94a9 9 0 0 0 0 8.06l3.01-2.33z"
      />
      <path
        fill="#ea4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .94 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 245 240" fill="currentColor">
      <path d="M104.4 103.9c-5.7 0-10.2 5-10.2 11.1s4.6 11.1 10.2 11.1c5.8 0 10.4-5 10.2-11.1 0-6.1-4.6-11.1-10.2-11.1Zm36.5 0c-5.7 0-10.2 5-10.2 11.1s4.6 11.1 10.2 11.1c5.8 0 10.4-5 10.2-11.1 0-6.1-4.4-11.1-10.2-11.1Z" />
      <path d="M189.5 20h-134C44.2 20 35 29.2 35 40.6v135.2c0 11.4 9.2 20.6 20.5 20.6h113.4l-5.3-18.5 12.8 11.9 12.1 11.2 21.5 19V40.6C210 29.2 200.8 20 189.5 20Zm-38.6 130.6s-3.6-4.3-6.6-8.1c13.1-3.7 18.1-11.9 18.1-11.9-4.1 2.7-8 4.6-11.5 5.9-5 2.1-9.8 3.5-14.5 4.3a70.2 70.2 0 0 1-25.9-.1 84.3 84.3 0 0 1-14.7-4.3c-2.6-1-5.5-2.2-8.4-3.9-.4-.2-.7-.4-1.1-.6-.2-.1-.3-.2-.5-.3-2.3-1.3-3.6-2.2-3.6-2.2s4.8 8 17.5 11.8c-3 3.8-6.7 8.3-6.7 8.3-22.1-.7-30.5-15.2-30.5-15.2 0-32.2 14.4-58.3 14.4-58.3 14.4-10.8 28.1-10.5 28.1-10.5l1 1.2c-18 5.2-26.3 13.1-26.3 13.1s2.2-1.2 5.9-2.9c10.7-4.7 19.2-6 22.7-6.3.6-.1 1.1-.2 1.7-.2a81.2 81.2 0 0 1 20.1-.2c9.4 1.1 19.5 3.9 29.8 9.6 0 0-7.9-7.5-24.9-12.7l1.4-1.6s13.7-.3 28.1 10.5c0 0 14.4 26.1 14.4 58.3 0 .1-8.5 14.5-30.6 15.2Z" />
    </svg>
  );
}
