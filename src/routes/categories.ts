import { Elysia } from "elysia";
import { supabase } from "../lib/supabase/client";

export const categoriesRoutes = new Elysia({ prefix: "/categories" })
  .get("/", async ({ set }) => {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) {
      set.status = 500;
      return { error: error.message };
    }
    return data;
  })
  .post("/", async ({ body, set }) => {
    const { name } = body as { name: string };
    const { data, error } = await supabase.from('categories').insert({ name }).select().single();
    if (error) {
      set.status = 500;
      return { error: error.message };
    }
    return data;
  });
