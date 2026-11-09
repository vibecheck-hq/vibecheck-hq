import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ping",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const PASS_CREDIT_LIMIT = 50;
const PASS_PRICE_PENCE = 99;

interface DecodeResult {
  headline: string;
  true_intent: string;
  red_flags: string[];
  green_flags: string[];
  executive_takeaway: string;
}

function sanitizeDecodeResult(raw: any): DecodeResult | null {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.headline !== "string" || typeof raw.true_intent !== "string" || typeof raw.executive_takeaway !== "string") {
    return null;
  }
  return {
    headline: raw.headline.trim(),
    true_intent: raw.true_intent.trim(),
    red_flags: Array.isArray(raw.red_flags) ? raw.red_flags.map(String) : [],
    green_flags: Array.isArray(raw.green_flags) ? raw.green_flags.map(String) : [],
    executive_takeaway: raw.executive_takeaway.trim(),
  };
}

async function decodeMessage(rawText: string): Promise<DecodeResult> {
  const trimmed = rawText.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const depthNote =
    wordCount <= 3
      ? "The user pasted a very short message (1-3 words). Give a crisp, literal pragmatic subtext read without inventing backstory."
      : "Analyze the interpersonal subtext, power dynamics, and linguistic cues in depth, and include a concrete reply script inside executive_takeaway.";

  const systemPrompt = `You are VibeCheck, an incisive, objective interpersonal subtext decoder.
${depthNote}
Analyze the user's pasted message and return ONLY valid JSON matching this exact structure:
{
  "headline": "A punchy 3-6 word summary of the underlying subtext",
  "true_intent": "2-3 clear sentences explaining what the sender actually means beneath the surface.",
  "red_flags": ["2 to 3 specific behavioral/linguistic caution signals in the message"],
  "green_flags": ["1 to 2 positive or constructive signals in the message, or honest baseline markers"],
  "executive_takeaway": "1-2 sentences of grounded, high-self-respect advice plus an exact copy-paste reply script in quotes."
}`;

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: `Decode this message:\n\n"${trimmed}"` }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
          }),
        }
      );

      if (resp.ok) {
        const data = await resp.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = sanitizeDecodeResult(JSON.parse(text));
          if (parsed) return parsed;
        }
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
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Decode this message:\n\n"${trimmed}"` },
          ],
          temperature: 0.4,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = sanitizeDecodeResult(JSON.parse(content));
          if (parsed) return parsed;
        }
      }
    } catch (e) {
      console.error("OpenAI decode fallback triggered:", e);
    }
  }

  const lower = trimmed.toLowerCase();
  const questionCount = (trimmed.match(/\?/g) || []).length;
  const exclamCount = (trimmed.match(/!/g) || []).length;
  const periodEnd = trimmed.endsWith(".") && wordCount <= 6;

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
        'Do not double-text or send a paragraph. Match their brevity, give them space, or reply simply: "All good—let me know when you\'re free to catch up properly."',
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
        'Stop pitching dates. Reply warmly in one line: "No stress at all, give me a shout when your week clears up!" and shift your focus elsewhere until they initiate.',
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
        'Take their message at face value—respond with matching warmth: "Love that—let\'s do Thursday at 7? Let me know if that works for you."',
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
      'Reply with relaxed clarity and steer toward a concrete next step: "Sounds good! How\'s your week looking for a quick drink?"',
  };
}

async function getRemainingCreditsForSession(
  supabase: any,
  stripeSessionId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("decode_jobs")
      .select("id", { count: "exact", head: true })
      .eq("stripe_session_id", stripeSessionId)
      .eq("status", "unlocked");

    if (!error && typeof count === "number") {
      return Math.max(0, PASS_CREDIT_LIMIT - count);
    }
  } catch (err) {
    console.error("Credit count lookup warning:", err);
  }
  return PASS_CREDIT_LIMIT - 1;
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
    const supabaseKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();

    // 1. VERIFY POST-PAYMENT REVEAL POLLING
    if (body.action === "verify" || body.session_uuid) {
      const sessionUuid: string = body.session_uuid || "";
      let stripeSessionId: string | null = body.stripe_session_id || null;
      let rawText = "";

      if (sessionUuid && !sessionUuid.startsWith("cs_")) {
        const { data: existingJob } = await supabase
          .from("decode_jobs")
          .select("*")
          .eq("id", sessionUuid)
          .maybeSingle();

        if (existingJob) {
          stripeSessionId = stripeSessionId || existingJob.stripe_session_id;
          if (existingJob.status === "unlocked" && existingJob.decode_result) {
            const creditsRemaining = stripeSessionId
              ? await getRemainingCreditsForSession(supabase, stripeSessionId)
              : PASS_CREDIT_LIMIT - 1;

            return new Response(
              JSON.stringify({
                status: "unlocked",
                instant_unlock: true,
                decode_result: existingJob.decode_result,
                stripe_session_id: stripeSessionId,
                credits_remaining: creditsRemaining,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
            );
          }
          rawText = existingJob.raw_text || "";
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

      const creditsRemaining = await getRemainingCreditsForSession(supabase, stripeSessionId);

      return new Response(
        JSON.stringify({
          status: "unlocked",
          instant_unlock: true,
          decode_result: decodeResult,
          stripe_session_id: stripeSessionId,
          credits_remaining: creditsRemaining,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 2. NEW DECODE OR INSTANT CREDIT UNLOCK
    const rawText: string = (body.raw_text || body.text || "").trim();
    const existingCsId: string | null = body.stripe_session_id || null;
    const returnOrigin: string =
      body.return_origin || body.origin || req.headers.get("origin") || "https://vibecheck-hq.vercel.app";

    if (!rawText) {
      throw new Error("Please paste a message to decode.");
    }

    // Check if user has an active, paid 50-Decode Pass with remaining credits
    if (existingCsId && existingCsId.startsWith("cs_")) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(existingCsId);
        if (existingSession.payment_status === "paid") {
          const creditsBefore = await getRemainingCreditsForSession(supabase, existingCsId);
          if (creditsBefore > 0) {
            const decodeResult = await decodeMessage(rawText);
            const { data: unlockedJob } = await supabase
              .from("decode_jobs")
              .insert({
                raw_text: rawText,
                status: "unlocked",
                decode_result: decodeResult,
                stripe_session_id: existingCsId,
              })
              .select("id")
              .single();

            const creditsRemaining = Math.max(0, creditsBefore - 1);

            return new Response(
              JSON.stringify({
                instant_unlock: true,
                status: "unlocked",
                decode_result: decodeResult,
                session_id: unlockedJob?.id || existingCsId,
                stripe_session_id: existingCsId,
                credits_remaining: creditsRemaining,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
            );
          }
        }
      } catch (csErr) {
        console.warn("Saved Stripe session check failed, creating fresh checkout:", csErr);
      }
    }

    // 3. CREATE FRESH STRIPE CHECKOUT SESSION (99p GBP FOR 50 DECODES)
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

    const lineItem = {
      price_data: {
        currency: "gbp",
        product_data: {
          name: "VibeCheck — 50-Decode Pass",
          description: "Instant True Intent, Red/Green Flags & Reply Playbook (50 Decodes)",
        },
        unit_amount: PASS_PRICE_PENCE,
      },
      quantity: 1,
    };

    const successUrl = jobId
      ? `${returnOrigin}/?session=${jobId}&cs={CHECKOUT_SESSION_ID}`
      : `${returnOrigin}/?session={CHECKOUT_SESSION_ID}&cs={CHECKOUT_SESSION_ID}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "link"],
      mode: "payment",
      billing_address_collection: "auto",
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
