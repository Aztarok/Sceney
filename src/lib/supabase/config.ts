import { releaseFeatures } from "../release-features.ts";

export function getSupabaseConfig() {
  if (!releaseFeatures.accounts) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}
