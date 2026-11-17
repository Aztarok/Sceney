import { Workspace } from "@/components/workspace";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!getSupabaseConfig()) return <Workspace account={{ kind: "guest" }} />;

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return <Workspace account={{ kind: "guest" }} />;

  return (
    <Workspace
      account={{ kind: "authenticated", email: user.email ?? "Your account" }}
    />
  );
}
