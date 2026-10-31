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
Analyze the user's pasted message and return ONLY valid JSON matching this exact structure:
{
  "headline": "A punchy 3-6 word summary of the underlying subtext",
  "true_intent": "2-3 clear sentences explaining what the sender actually means beneath the surface.",
  "red_flags": ["2 to 3 specific behavioral/linguistic caution signals in the message"],
  "green_flags": ["1 to 2 positive or constructive signals in the message, or honest baseline markers"],
  "executive_takeaway": "1-2 sentences of grounded, high-self-respect advice on how to respond or proceed."
}`;

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
            contents: [{ role: "user", parts: [{ text: `Decode this message:\n\n"${rawText}"` }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
          }),
        }
      );

      if (resp.ok) {
        const data = await resp.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
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
            { role: "user", content: `Decode this message:\n\n"${rawText}"` },
          ],
          temperature: 0.4,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content;
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
  const exclamCount = (text.match(/!/g) || []).length;
  const periodEnd = text.endsWith(".") && wordCount <= 6;

  const hedgeWords = ["maybe", "idk", "not sure", "busy", "later", "see how", "might", "tbh", "crazy week", "a lot on"];
  const warmWords = ["love", "can't wait", "definitely", "excited", "soon", "miss", "keen", "free"];
  const defensiveWords = ["whatever", "fine", "k.", "ok.", "up to you", "nevermind", "forget it", "done wrong"];

  const hasHedges = hedgeWords.some((w) => lower.includes(w));
  const hasWarmth = warmWords.some((w) => lower.includes(w));
  const hasDefensive = defensiveWords.some((w) => lower.includes(w)) || periodEnd;

  if (hasDefensive) {
    return {
      headline: "Guarded Withdrawal Disguised as Politeness",
      true_intent:
        "The clipped syntax and abrupt punctuation signal emotional friction or unspoken annoyance. They are pulling back to see if you will chase or over-explain.",
      red_flags: [
        "Abrupt phrasing shuts down open dialogue rather than addressing the issue",
        "Implicitly expects you to read between the lines instead of communicating openly",
      ],
      green_flags: [
        "They are still replying rather than ghosting completely",
        "Clear signal of their current mood so you don't waste energy pushing right now",
      ],
      executive_takeaway:
        "Do not double-text or send a paragraph. Match their brevity, give them space, and let them come to you when they are ready to use full sentences.",
    };
  }

  if (hasHedges && !hasWarmth && questionCount === 0) {
    return {
      headline: "Soft Cushioning Without Concrete Commitment",
      true_intent:
        "They want to keep the door warm without locking themselves into a firm plan right now. You are being placed on a low-stakes backburner while they manage other priorities.",
      red_flags: [
        "Non-committal phrasing leaves the scheduling burden on you",
        "No specific counter-offer or alternative date proposed",
      ],
      green_flags: [
        "Tone remains polite and avoids overt hostility",
        "Leaves room for casual low-pressure reconnection later",
      ],
      executive_takeaway:
        "Stop pitching dates. Reply warmly in one line ('No stress, let me know when your schedule clears up!') and shift your focus elsewhere until they initiate a concrete plan.",
    };
  }

  if (hasWarmth || exclamCount > 0 || questionCount > 0) {
    return {
      headline: "Genuine Engagement With Cautious Pacing",
      true_intent:
        "Their linguistic energy and forward-looking cues show real interest in keeping the momentum going, even if they are balancing normal day-to-day friction.",
      red_flags: [
        "Slight ambiguity in exact timing if not locked down soon",
        "Texting momentum can stall if it stays purely in chat mode",
      ],
      green_flags: [
        "Active engagement markers indicate genuine investment in the exchange",
        "Open-ended structure invites a natural, low-friction continuation",
      ],
      executive_takeaway:
        "Take their message at face value—respond with matching warmth and lock in one specific time/place rather than over-analyzing the subtext.",
    };
  }

  return {
    headline: "Measured Neutrality Testing Your Next Move",
    true_intent:
      "This message is intentionally low-exposure: they are sharing just enough information to keep the thread alive while gauging your tone and investment level.",
    red_flags: [
      "Low emotional specificity makes it easy to project your own anxiety onto the text",
      "Lack of a clear hook puts the conversational ball back in your court",
    ],
    green_flags: [
      "Clean, drama-free delivery with no manipulative guilt-tripping",
      "Neutral baseline that allows you to set the frame",
    ],
    executive_takeaway:
      "Reply with relaxed clarity—skip the over-analysis and steer the exchange toward a simple, concrete next step.",
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
      throw new Error("Missing STRIPE_SECRET_KEY in Supabase Edge Function Secrets");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://qnnnnvlissdqdwmkgrao.supabase.co";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();

    if (body.action === "verify" || body.session_uuid) {
      const sessionUuid: string = body.session_uuid;
      let stripeSessionId: string | null = body.stripe_session_id || null;
      let rawText = "";

      if (sessionUuid && !sessionUuid.startsWith("cs_")) {
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
          rawText = existingJob.raw_text || "";
          stripeSessionId = stripeSessionId || existingJob.stripe_session_id;
        }
      } else if (sessionUuid?.startsWith("cs_")) {
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

      if (sessionUuid && !sessionUuid.startsWith("cs_")) {
        await supabase
          .from("decode_jobs")
          .update({
            status: "unlocked",
            decode_result: decodeResult,
            stripe_session_id: stripeSessionId,
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

    const rawText: string = (body.raw_text || body.text || "").trim();
    const returnOrigin: string =
      body.return_origin || body.origin || req.headers.get("origin") || "https://vibecheck-hq.vercel.app";

    if (!rawText) {
      throw new Error("Please paste a message to decode.");
    }

    let jobId: string | null = null;

    try {
      const { data: insertedJob, error: dbErr } = await supabase
        .from("decode_jobs")
        .insert({
          raw_text: rawText,
          status: "pending",
        })
        .select("id")
        .single();

      if (!dbErr && insertedJob?.id) {
        jobId = insertedJob.id;
      }
    } catch (dbEx) {
      console.error("Non-fatal DB insert warning:", dbEx);
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
      success_url: successUrl,
      cancel_url: returnOrigin,
      client_reference_id: jobId || undefined,
      metadata: {
        job_id: jobId || "metadata_only",
        raw_text: rawText.slice(0, 450),
      },
    });

    if (jobId && session.id) {
      await supabase
        .from("decode_jobs")
        .update({ stripe_session_id: session.id })
        .eq("id", jobId);
    }

    return new Response(
      JSON.stringify({
        checkout_url: session.url,
        url: session.url,
        session_id: jobId || session.id,
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
