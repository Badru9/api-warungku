import { Elysia } from "elysia";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase/client";

// Admin client for creating users
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ""
);

async function requireOwner(set: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    set.status = 401;
    return null;
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "owner") {
    set.status = 403;
    return null;
  }
  return user;
}

export const staffRoutes = new Elysia({ prefix: "/staff" })
  .get("/", async ({ set }) => {
    const user = await requireOwner(set);
    if (!user) return { error: "Forbidden" };

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "staff")
      .order("created_at", { ascending: false });

    if (error) {
      set.status = 500;
      return { error: error.message };
    }
    return data;
  })
  .post("/", async ({ body, set }) => {
    const user = await requireOwner(set);
    if (!user) return { error: "Forbidden" };

    const { email, password, full_name } = body as {
      email: string;
      password: string;
      full_name: string;
    };

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: "staff" },
    });

    if (authError) {
      set.status = 500;
      return { error: authError.message };
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ role: "staff", full_name })
      .eq("id", authData.user.id);

    if (profileError) {
      set.status = 500;
      return { error: profileError.message };
    }

    return { success: true, user: authData.user };
  });
