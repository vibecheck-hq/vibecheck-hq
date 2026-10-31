import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ping",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const MAX_CREDITS_PER_PASS = 5;

interface DecodeResult {
  headline: string;
  true_intent: string;
  red_flags: string[];
  green_flags: string[];
  executive_takeaway: string;
}

async function decodeMessage(rawText: string): Promise<DecodeResult> {
  const cleanText = rawText.trim();
  const words = cleanText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const depthInstruction =
    wordCount <= 3
      ? `THE INPUT IS ULTRA-SHORT (${wordCount} word(s): "${cleanText}").
Do NOT hallucinate complex hidden backstory that isn't there.
- If it is a blunt insult/profanity (e.g., "cunt", "fuck off", "twat"), call it out directly as overt hostility/dysregulation or banter depending on tone, keep "true_intent" to 2 sharp, realistic sentences stating that a 1-word insult leaves zero constructive subtext to over-analyze, and give a 1-sentence boundary takeaway.
- If it is a dry 1-3 word reply (e.g., "k.", "fine", "lol yeah", "we'll see"), diagnose the exact lexical curtailment/breadcrumbing concisely.`
      : wordCount <= 18
      ? `THE INPUT IS A SHORT MESSAGE (${wordCount} words).
Provide a sharp, medium-depth forensic breakdown (3-4 sentences in "true_intent"). Quote specific words or punctuation choices from the message, explain the interpersonal power dynamic, list 2-3 specific red flags and 1-2 green/baseline flags, and provide 2 ready-to-send reply options in "executive_takeaway" ([Match Energy] and [High-Value Boundary]).`
      : `THE INPUT IS A SUBSTANTIAL MESSAGE OR THREAD (${wordCount} words).
The user has provided rich context—deliver a comprehensive, deeply insightful forensic analysis:
- "headline": A razor-sharp 4-8 word clinical diagnosis of the core dynamic.
- "true_intent": 4-6 detailed, incisive sentences dissecting their exact phrasing, emotional pacing, hedging vs. investment, and what they are trying to achieve beneath the surface (e.g., guilt-alleviation, option-keeping, genuine vulnerability, or blame-shifting). Quote exact phrases from their text.
- "red_flags": 3-4 highly specific linguistic or behavioral caution signals, citing exact words/patterns from their text.
- "green_flags": 2-3 specific constructive signals, honest admissions, or baseline markers in the text.
- "executive_takeaway": Detailed strategic advice (3-4 sentences) on how to play the next move, INCLUDING two exact copy-pasteable reply scripts: one [Match Energy / Low-Investment] option and one [High-Value Boundary / Direct] option.`;

  const systemPrompt = `You are VibeCheck, an elite UK/Gen-Z interpersonal subtext analyst and behavioral linguist.
Your job is to give the user an unvarnished, psychologically accurate, and genuinely helpful read of the message they pasted.
Never use generic horoscope filler—anchor every insight directly to the exact words, tone, and length of the input.

${depthInstruction}

Return ONLY valid JSON matching this exact structure:
{
  "headline": "String",
  "true_intent": "String",
  "red_flags": ["String", "String"],
  "green_flags": ["String"],
  "executive_takeaway": "String"
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
            contents: [
              {
                role: "user",
                parts: [{ text: `Analyze this exact message (${wordCount} words):\n\n"${cleanText}"` }],
              },
            ],
            generationConfig: { responseMimeType: "application/json", temperature: 0.35 },
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
            { role: "user", content: `Analyze this exact message (${wordCount} words):\n\n"${cleanText}"` },
          ],
          temperature: 0.35,
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

  // Deterministic fallback scaled by word count
  const lower = cleanText.toLowerCase();
  const profanityList = ["cunt", "fuck", "twat", "bitch", "dick", "prick", "asshole", "wanker", "piss off"];
  const hasProfanity = profanityList.some((w) => lower.includes(w));

  if (wordCount <= 2 && hasProfanity) {
    return {
      headline: "Blunt Hostility or Zero-Filter Banter",
      true_intent: `Because the entire message is just "${cleanText}", there is no hidden romantic subtext to excavate. Either this is blunt hostility meant to provoke a reaction, or unfiltered British/mates banter depending on your baseline relationship.`,
      red_flags: [
        "Zero effort at constructive communication",
        "Designed to trigger an emotional reaction if sent during an argument",
      ],
      green_flags: [
        "Completely transparent—no manipulative paragraphs or fake politeness",
      ],
      executive_takeaway:
        "If this was sent in anger, do not dignify a one-word insult with a paragraph—leave it on read. If it's banter with a mate, fire back in kind.",
    };
  }

  if (wordCount <= 3) {
    return {
      headline: "Extreme Lexical Curtailment (Low-Investment Reply)",
      true_intent: `At just ${wordCount} word(s) ("${cleanText}"), the sender is deliberately withholding emotional effort. They are acknowledging receipt of your message while refusing to carry any conversational weight.`,
      red_flags: [
        "Leaves 100% of the conversational burden on you",
        "Zero follow-up question or forward momentum",
      ],
      green_flags: [
        "Clear signal of their current bandwidth so you don't over-invest",
      ],
      executive_takeaway:
        "Do not send a follow-up text or ask if something is wrong. Match their silence and wait for them to initiate with a full sentence.",
    };
  }

  return {
    headline: "Guarded Pacing & Subtext Hedging",
    true_intent:
      "The phrasing balances surface-level politeness with careful emotional distance. Rather than stating their needs or locking in a firm commitment directly, they are testing your reaction and keeping their options flexible.",
    red_flags: [
      "Ambiguous phrasing shifts the interpretive labor onto you",
      "Lack of a concrete time/place anchor keeps the dynamic on standby",
    ],
    green_flags: [
      "Maintains an open channel of communication without overt hostility",
      "Gives you enough linguistic signal to set a clean boundary",
    ],
    executive_takeaway:
      "[Match Energy]: 'No stress at all, catch up soon!' | [High-Value Boundary]: 'Sounds like your week is packed—give me a shout when you know what day works and we'll lock it in.'",
  };
}

async function getRemainingCredits(supabase: any, stripeSessionId: string): Promise<number> {
  const { count } = await supabase
    .from("decode_jobs")
    .select("id", { count: "exact", head: true })
    .eq("stripe_session_id", stripeSessionId)
    .eq("status", "unlocked");

  const used = count || 0;
  return Math.max(0, MAX_CREDITS_PER_PASS - used);
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

    // 1. VERIFY OR CHECK CREDITS
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
          stripeSessionId = stripeSessionId || existingJob.stripe_session_id;
          if (existingJob.status === "unlocked" && existingJob.decode_result) {
            const creditsRemaining = stripeSessionId
              ? await getRemainingCredits(supabase, stripeSessionId)
              : 0;
            return new Response(
              JSON.stringify({
                status: "unlocked",
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

      const creditsRemaining = await getRemainingCredits(supabase, stripeSessionId);

      return new Response(
        JSON.stringify({
          status: "unlocked",
          decode_result: decodeResult,
          stripe_session_id: stripeSessionId,
          credits_remaining: creditsRemaining,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 2. NEW DECODE REQUEST (CHECK EXISTING 5-PASS CREDIT FIRST, ELSE STRIPE CHECKOUT)
    const rawText: string = (body.raw_text || body.text || "").trim();
    const existingStripePass: string | null = body.stripe_session_id || null;
    const returnOrigin: string =
      body.return_origin || body.origin || req.headers.get("origin") || "https://vibecheck-hq.vercel.app";

    if (!rawText) {
      throw new Error("Please paste a message to decode.");
    }

    // Check if the user already has an active paid 5-Decode Pass with remaining credits
    if (existingStripePass && existingStripePass.startsWith("cs_")) {
      try {
        const checkoutSession = await stripe.checkout.sessions.retrieve(existingStripePass);
        if (checkoutSession.payment_status === "paid") {
          const creditsBefore = await getRemainingCredits(supabase, existingStripePass);
          if (creditsBefore > 0) {
            const decodeResult = await decodeMessage(rawText);
            const { data: unlockedJob } = await supabase
              .from("decode_jobs")
              .insert({
                raw_text: rawText,
                status: "unlocked",
                decode_result: decodeResult,
                stripe_session_id: existingStripePass,
              })
              .select("id")
              .single();

            const creditsAfter = Math.max(0, creditsBefore - 1);

            return new Response(
              JSON.stringify({
                instant_unlock: true,
                session_id: unlockedJob?.id || existingStripePass,
                stripe_session_id: existingStripePass,
                decode_result: decodeResult,
                credits_remaining: creditsAfter,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
            );
          }
        }
      } catch (passErr) {
        console.warn("Saved pass check failed, falling back to new checkout:", passErr);
      }
    }

    // Otherwise create a new pending job and a £2.99 Checkout Session for 5 Goes
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
          name: "VibeCheck — 5-Decode Pass (£2.99)",
          description: "5 Full Message Subtext Decodes (True Intent, Red/Green Flags & Reply Scripts)",
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
        pass_credits: "5",
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
