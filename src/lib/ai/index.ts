import type { AIProvider } from "./types";
import { MockAIProvider } from "./mock-provider";

export const SUPPORTED_PROVIDERS = ["mock", "openai", "anthropic", "ollama"] as const;
export type ProviderName = (typeof SUPPORTED_PROVIDERS)[number];

/** Providers with an implementation in this codebase. */
const IMPLEMENTED: ProviderName[] = ["mock"];

export interface AIStatus {
  requested: string;
  active: ProviderName;
  model: string | null;
  /** True when AI_PROVIDER names a provider that isn't available, so mock is used. */
  fallback: boolean;
  apiKeyConfigured: boolean;
  /** Masked key for display, e.g. "sk-…a1b2". Never the full key. */
  apiKeyHint: string | null;
}

export function maskKey(key: string | undefined | null) {
  if (!key) return null;
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 3)}…${key.slice(-4)}`;
}

export function getAIStatus(): AIStatus {
  const requested = (process.env.AI_PROVIDER || "mock").toLowerCase();
  const implemented = (IMPLEMENTED as string[]).includes(requested);
  return {
    requested,
    active: implemented ? (requested as ProviderName) : "mock",
    model: process.env.AI_MODEL || null,
    fallback: !implemented,
    apiKeyConfigured: Boolean(process.env.AI_API_KEY),
    apiKeyHint: maskKey(process.env.AI_API_KEY),
  };
}

// Provider factory. AI_PROVIDER defaults to "mock" — the app must work with
// zero configuration. Add real providers as classes implementing AIProvider
// and register them in IMPLEMENTED + the switch below; an unknown or
// unimplemented provider falls back to mock rather than breaking the app.
export function getAIProvider(): AIProvider {
  const { active } = getAIStatus();
  switch (active) {
    case "mock":
    default:
      return new MockAIProvider();
  }
}

export * from "./types";
