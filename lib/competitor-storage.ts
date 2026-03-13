/**
 * Shared localStorage helpers for competitor profiles.
 * Used by both the Competitors overview page and the Keyword Gap page.
 */
import type { DomainProfile } from "@/types/competitor";

export const STORAGE_KEY_YOU  = "cawarden_semrush_you";
export const STORAGE_KEY_THEM = "cawarden_semrush_them";

const MAX_KEYWORDS  = 5000;
const MAX_BACKLINKS = 1000;
const MAX_PAGES     = 300;

export type SavedProfile = {
  profile: DomainProfile;
  domain: string;
  savedAt: string;
};

export function loadSaved(key: string): SavedProfile | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as SavedProfile) : null;
  } catch { return null; }
}

export function persistProfile(
  key: string,
  profile: DomainProfile,
  domain: string,
) {
  try {
    const truncated: DomainProfile = {
      ...profile,
      keywords:  profile.keywords.slice(0, MAX_KEYWORDS),
      backlinks: profile.backlinks.slice(0, MAX_BACKLINKS),
      topPages:  profile.topPages.slice(0, MAX_PAGES),
    };
    const saved: SavedProfile = {
      profile: truncated,
      domain,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(saved));
  } catch (e) {
    console.warn("[Competitor save]", e);
  }
}

export function clearSavedProfile(key: string) {
  try { localStorage.removeItem(key); } catch { /* noop */ }
}

export function formatSavedAt(iso: string): string {
  const d    = new Date(iso);
  const now  = new Date();
  const ms   = now.getTime() - d.getTime();
  const mins = Math.floor(ms / 60000);
  const hrs  = Math.floor(ms / 3600000);
  const days = Math.floor(ms / 86400000);
  if (mins < 2)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hrs  < 24)  return `${hrs}h ago`;
  if (days === 1) return "yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
