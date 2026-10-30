import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ping",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

interface DecodeResult {
  headline: string;
  true_intent: string;
  red_flags: string[];
  green_flags: string[];
  executive_takeaway: string;
}

async function decodeMessage(rawText: string): Promise<DecodeResult> {
  const systemPrompt = `You are VibeCheck, an incisive, objective interpersonal subtext decoder.
Analyze the user's pasted text message and return ONLY a valid JSON object with the exact keys:
- "headline": A punchy 4-8 word verdict summarizing the sender's real vibe.
- "true_intent": 2-3 clear sentences explaining what the sender actually means beneath the surface.
- "red_flags": Array of 2-3 specific behavioral/linguistic caution signals in the message.
- "green_flags": Array of 2-3 positive or constructive signals in the message (or honest boundaries).
- "executive_takeaway": A single direct, actionable recommendation on how to respond (or not respond).`;

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: rawText }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
          }),
        }
      );
      if (resp.ok) {
        const json = await resp.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return JSON.parse(text);
      }
    } catch (e) {
      console.error("Gemini decode fallback triggered:", e);
    }
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (openaiKey) {
    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: rawText },
          ],
          temperature: 0.4,
        }),
      });
      if (resp.ok) {
        const json = await resp.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) return JSON.parse(content);
      }
    } catch (e) {
      console.error("OpenAI decode fallback triggered:", e);
    }
  }

  const text = rawText.trim();
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const questionCount = (text.match(/\?/g) || []).length;
  const exclamationCount = (text.match(/!/g) || []).length;
  const ellipsisCount = (text.match(/\.\.\./g) || []).length;

  const hedgingMarkers = ["maybe", "just", "sort of", "kind of", "idk", "busy", "crazy week", "we'll see", "later", "sometime", "whenever", "sorry"];
  const warmMarkers = ["love", "keen", "definitely", "excited", "let's", "free", "tomorrow", "tonight", "appreciate", "miss", "glad"];
  const defensiveMarkers = ["fine", "whatever", "up to you", "nevermind", "forget it", "ok.", "k.", "sure"];

  const hedgeHits = hedgingMarkers.filter((m) => lower.includes(m));
  const warmHits = warmMarkers.filter((m) => lower.includes(m));
  const defensiveHits = defensiveMarkers.filter((m) => lower.includes(m));

  if (defensiveHits.length > 0 || (wordCount <= 4 && text.endsWith("."))) {
    return {
      headline: "Guarded Withdrawal Disguised as Politeness",
      true_intent:
        "The clipped syntax and abrupt punctuation signal emotional friction or unspoken annoyance. Rather than stating the issue directly, they are pulling back to see if you notice the shift in tone.",
      red_flags: [
        "Curt phrasing creates plausible deniability while signaling tension",
        "Expects you to read between the lines instead of communicating openly",
      ],
      green_flags: [
        "They are still replying rather than ghosting completely",
        "Gives you a clear opening to pause rather than chase",
      ],
      executive_takeaway:
        "Don't over-apologize or send a paragraph. Match their brevity, give them space, and let them come to you when ready.",
    };
  }

  if (hedgeHits.length >= 2 || (hedgeHits.length >= 1 && warmHits.length === 0 && questionCount === 0)) {
    return {
      headline: "Soft Cushioning Without Concrete Commitment",
      true_intent:
        "They want to keep the door warm without locking themselves into a firm plan right now. The qualifiers and vague timing are designed to avoid friction while keeping you as an option.",
      red_flags: [
        "Non-committal phrasing leaves the scheduling burden on you",
        "No follow-up question or concrete counter-proposal offered",
      ],
      green_flags: [
        "Tone remains polite and avoids overt hostility",
        "Leaves room for casual low-pressure reconnection later",
      ],
      executive_takeaway:
        "Stop pitching dates. Reply warmly in one line ('No stress, let me know when your schedule clears up!') and put the ball 100% in their court.",
    };
  }

  if (warmHits.length >= 1 || questionCount >= 1 || exclamationCount >= 1) {
    return {
      headline: "Genuine Engagement With Cautious Pacing",
      true_intent:
        "Their linguistic energy and forward-looking cues show real interest in keeping the momentum going. Any slight hesitation in the phrasing is about managing their own schedule or nerves, not a lack of interest in you.",
      red_flags: [
        ellipsisCount > 0
          ? "Trailing ellipses suggest slight overthinking or tentative phrasing"
          : "Slight ambiguity could lead to misread timing if left unpinned",
      ],
      green_flags: [
        "Active engagement markers indicate genuine investment in the exchange",
        "Open-ended structure invites a natural, direct continuation",
      ],
      executive_takeaway:
        "Take their message at face value—respond with confident warmth and lock in one specific detail or plan.",
    };
  }

  return {
    headline: "Measured Neutrality Testing Your Next Move",
    true_intent:
      "This message is intentionally low-exposure: they are sharing just enough information to keep the thread alive while gauging your energy level before investing further.",
    red_flags: [
      "Low emotional specificity makes it easy to project your own anxiety onto the text",
      "Lack of clear call-to-action stalls momentum if neither side leads",
    ],
    green_flags: [
      "Composed, drama-free delivery with no manipulative guilt-tripping",
      "Clean conversational baseline that allows you to set the frame",
    ],
    executive_takeaway:
      "Reply with relaxed clarity—skip the over-analysis and ask one clear, low-stakes question to surface their true priority.",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.headers.get("x-ping") === "keep-alive") {
    return new Response("pong", { headers: corsHeaders, status: 200 });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Missing STRIPE_SECRET_KEY in Supabase Edge Function Secrets.");
    }

    const stripe = new Stripe(stripeKey, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "https://qnnnnvlissdqdwmkgrao.supabase.co";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey)
      : null;

    const body = await req.json();

    if (body.action === "verify" && body.session_uuid) {
      const sessionUuid: string = body.session_uuid;
      let stripeSessionId: string | null = body.stripe_session_id || null;
      let rawText = "";

      if (supabase && !sessionUuid.startsWith("cs_")) {
        const { data: existingJob } = await supabase
          .from("decode_jobs")
          .select("*")
          .eq("id", sessionUuid)
          .maybeSingle();

        if (existingJob) {
          if (existingJob.status === "unlocked" && existingJob.decode_result) {
            return new Response(
              JSON.stringify({
                status: "unlocked",
                decode_result: existingJob.decode_result,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
            );
          }
          stripeSessionId = stripeSessionId || existingJob.stripe_session_id;
          rawText = existingJob.raw_text || "";
        }
      } else if (sessionUuid.startsWith("cs_")) {
        stripeSessionId = sessionUuid;
      }

      if (!stripeSessionId) {
        return new Response(
          JSON.stringify({ status: "pending", message: "Awaiting Stripe session ID" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      const checkoutSession = await stripe.checkout.sessions.retrieve(stripeSessionId);

      if (checkoutSession.payment_status !== "paid") {
        return new Response(
          JSON.stringify({ status: "pending", payment_status: checkoutSession.payment_status }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      if (!rawText && checkoutSession.metadata?.raw_text) {
        rawText = checkoutSession.metadata.raw_text;
      }

      const decodeResult = await decodeMessage(rawText || "Message text unavailable.");

      if (supabase && !sessionUuid.startsWith("cs_")) {
        await supabase
          .from("decode_jobs")
          .update({
            status: "unlocked",
            decode_result: decodeResult,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sessionUuid);
      }

      return new Response(
        JSON.stringify({
          status: "unlocked",
          decode_result: decodeResult,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const rawText: string = (body.raw_text || "").trim();
    const returnOrigin: string =
      body.return_origin || body.origin || req.headers.get("origin") || "https://vibecheck-hq.vercel.app";

    if (!rawText) {
      throw new Error("Please provide a message to decode.");
    }

    let jobId: string | null = null;

    if (supabase) {
      const { data: insertedJob, error: dbErr } = await supabase
        .from("decode_jobs")
        .insert({
          raw_text: rawText,
          status: "pending",
        })
        .select("id")
        .maybeSingle();

      if (!dbErr && insertedJob?.id) {
        jobId = insertedJob.id;
      }
    }

    const configuredPriceId = Deno.env.get("STRIPE_PRICE_ID");
    const lineItem = configuredPriceId
      ? { price: configuredPriceId, quantity: 1 }
      : {
          price_data: {
            currency: "gbp",
            product_data: {
              name: "VibeCheck — Message Subtext Decode",
              description: "Instant True Intent, Red/Green Flags & Executive Takeaway",
            },
            unit_amount: 299,
          },
          quantity: 1,
        };

    const successUrl = jobId
      ? `${returnOrigin}/?session=${jobId}&cs={CHECKOUT_SESSION_ID}`
      : `${returnOrigin}/?session={CHECKOUT_SESSION_ID}&cs={CHECKOUT_SESSION_ID}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [lineItem],
      client_reference_id: jobId || undefined,
      success_url: successUrl,
      cancel_url: `${returnOrigin}/`,
      metadata: {
        job_id: jobId || "metadata_only",
        raw_text: rawText.slice(0, 490),
      },
    });

    if (supabase && jobId) {
      await supabase
        .from("decode_jobs")
        .update({ stripe_session_id: session.id })
        .eq("id", jobId);
    }

    return new Response(
      JSON.stringify({
        checkout_url: session.url,
        url: session.url,
        sessionId: session.id,
        jobId: jobId || session.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("VibeCheck Checkout Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
