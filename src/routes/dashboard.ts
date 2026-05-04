import { Elysia } from "elysia";
import { supabase } from "../lib/supabase/client";

export const dashboardRoutes = new Elysia({ prefix: "/dashboard" })
  .get("/summary", async ({ set }) => {
    const { count: totalProducts } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null);

    const { data: products } = await supabase
      .from("products")
      .select("current_stock, min_stock")
      .is("deleted_at", null);

    const lowStock = products?.filter((p) => p.current_stock <= p.min_stock).length || 0;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { count: transactionsToday } = await supabase
      .from("stock_transactions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfDay.toISOString());

    return {
      totalProducts: totalProducts || 0,
      lowStock,
      transactionsToday: transactionsToday || 0,
    };
  })
  .get("/chart", async ({ request, set }) => {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "weekly";

    const startDate = new Date();
    if (period === "weekly") {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const { data, error } = await supabase
      .from("stock_transactions")
      .select("type, quantity, created_at")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      set.status = 500;
      return { error: error.message };
    }
    return data || [];
  });
