import { Elysia } from "elysia";
import { supabase } from "../lib/supabase/client";

export const transactionsRoutes = new Elysia({ prefix: "/transactions" })
  .get("/", async ({ request, set }) => {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id");
    const type = searchParams.get("type");

    let query = supabase
      .from("stock_transactions")
      .select("*, products(name, unit), profiles(full_name)")
      .order("created_at", { ascending: false });

    if (productId) query = query.eq("product_id", productId);
    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) {
      set.status = 500;
      return { error: error.message };
    }
    return data;
  })
  .post("/", async ({ body, set }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "owner") {
      set.status = 403;
      return { error: "Forbidden" };
    }

    const { product_id, type, quantity, note } = body as {
      product_id: string;
      type: string;
      quantity: number;
      note: string;
    };

    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("current_stock, sell_price")
      .eq("id", product_id)
      .single();

    if (fetchError) {
      set.status = 500;
      return { error: fetchError.message };
    }

    let stock_after = product.current_stock;
    if (type === "IN") stock_after += quantity;
    else if (type === "OUT") stock_after -= quantity;
    else if (type === "ADJUST") stock_after = quantity;

    if (type === "OUT" && stock_after < 0) {
      set.status = 400;
      return { error: "Stok tidak mencukupi" };
    }

    const { error: updateError } = await supabase
      .from("products")
      .update({ current_stock: stock_after })
      .eq("id", product_id);

    if (updateError) {
      set.status = 500;
      return { error: updateError.message };
    }

    const { data, error: insertError } = await supabase
      .from("stock_transactions")
      .insert({
        product_id,
        type,
        quantity: type === "ADJUST" ? Math.abs(stock_after - product.current_stock) : quantity,
        stock_before: product.current_stock,
        stock_after,
        price_at_time: product.sell_price,
        note,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      set.status = 500;
      return { error: insertError.message };
    }
    return data;
  });
