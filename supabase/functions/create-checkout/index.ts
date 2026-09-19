import Stripe from "npm:stripe";
// Initialize Stripe using Deno's native fetch for edge compatibility
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  httpClient: Stripe.createFetchHttpClient(),
});
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ping",
};
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  // Handle Keep-Alive Ping to mitigate cold starts
  if (req.headers.get("x-ping") === "keep-alive") {
    return new Response("pong", { headers: corsHeaders, status: 200 });
  }
  try {
    const body = await req.json();
    const { anonymousId, origin } = body;
    // Create Stripe Checkout Session (Lean Payload, Zero DB Pre-Writes)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: Deno.env.get("STRIPE_PRICE_ID")!,
          quantity: 1,
        },
      ],
      // Use origin from client to ensure correct redirect back to the Bolt/Netlify preview
      success_url: `${origin || req.headers.get("origin")}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin || req.headers.get("origin")}/pricing`,
      metadata: {
        anonymousId: anonymousId || "unknown_impulse_user",
      },
    });
    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Stripe Checkout Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
