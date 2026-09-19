import Stripe from "npm:stripe@13.10.0";
// verify_jwt = false; public checkout initiation, no Supabase login required

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PRICE_DATA = {
  currency: "gbp" as const,
  unit_amount: 999,
  recurring: { interval: "month" as const },
  product_data: { name: "Cognimetrics Pro — Monthly" },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    let body: { email?: string } = {};
    try {
      body = await req.json();
    } catch {
      // empty/invalid body is fine; email is optional
    }

    const origin = req.headers.get("origin") ?? "https://cognimetrics.io";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price_data: PRICE_DATA, quantity: 1 }],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
      customer_email: body.email ?? undefined,
      metadata: {
        protocol: "RW-IDP v1.0",
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

