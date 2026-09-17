import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { encode } from "npm:gpt-tokenizer@2.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const E_ABS = 10.0;
const E_ABS_TOLERANCE = 0.0001;

function shannonEntropy(values: number[]): number {
  if (values.length === 0) return 0;
  const freq = new Map<number, number>();
  for (const v of values) {
    freq.set(v, (freq.get(v) ?? 0) + 1);
  }
  let entropy = 0;
  const n = values.length;
  for (const count of freq.values()) {
    const p = count / n;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function typeTokenRatio(tokenIds: number[]): number {
  if (tokenIds.length === 0) return 0;
  const unique = new Set(tokenIds).size;
  return unique / tokenIds.length;
}

function averageTokenLength(text: string, tokenCount: number): number {
  if (tokenCount === 0) return 0;
  const stripped = text.trim();
  if (stripped.length === 0) return 0;
  return stripped.length / tokenCount;
}

function sentenceCount(text: string): number {
  const matches = text.match(/[.!?]+/g);
  return matches ? matches.length : 1;
}

function wordCount(text: string): number {
  const stripped = text.trim();
  if (stripped.length === 0) return 0;
  return stripped.split(/\s+/).length;
}

function fleschReadingEase(text: string): number {
  const sentences = Math.max(sentenceCount(text), 1);
  const words = Math.max(wordCount(text), 1);
  const wordsPerSentence = words / sentences;
  const cleanText = text.replace(/[^a-zA-Z\s]/g, " ");
  const vowels = (cleanText.match(/[aeiouyAEIOUY]/g) ?? []).length;
  const syllables = Math.max(vowels, words);
  const syllablesPerWord = syllables / words;
  const score = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  return Math.max(0, Math.min(100, score));
}

function sentimentPolarity(text: string): number {
  const positiveWords = [
    "good", "great", "excellent", "positive", "happy", "success",
    "benefit", "improve", "best", "perfect", "amazing", "outstanding",
    "remarkable", "superior", "effective", "efficient", "optimal",
  ];
  const negativeWords = [
    "bad", "poor", "negative", "error", "fail", "failure",
    "broken", "critical", "warning", "issue", "problem", "wrong",
    "terrible", "awful", "defective", "degraded", "unstable",
  ];
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  let score = 0;
  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, "");
    if (positiveWords.includes(clean)) score += 1;
    if (negativeWords.includes(clean)) score -= 1;
  }
  if (words.length === 0) return 0;
  return Math.max(-1, Math.min(1, score / Math.sqrt(words.length)));
}

function hashTokenIds(tokenIds: number[]): string {
  const str = tokenIds.join(",");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // --- JWT authentication ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Only POST is supported ---
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const { text, sample_label, e_abs } = body as {
      text?: string;
      sample_label?: string;
      e_abs?: number;
    };

    // --- Validate text ---
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing or empty 'text' field in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- RW-IDP v1.0 thermodynamic anchor enforcement ---
    if (e_abs === undefined || typeof e_abs !== "number") {
      return new Response(
        JSON.stringify({
          error: "RW-IDP v1.0 protocol violation: missing 'e_abs' thermodynamic anchor in payload",
          expected: E_ABS,
          received: "absent",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (Math.abs(e_abs - E_ABS) > E_ABS_TOLERANCE) {
      return new Response(
        JSON.stringify({
          error: "RW-IDP v1.0 protocol violation: thermodynamic anchor E_ABS mismatch",
          expected: E_ABS.toFixed(4),
          received: e_abs.toFixed(4),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- BPE tokenization via gpt-tokenizer (pure JS BPE, edge-compatible) ---
    const tokenIds: number[] = encode(text);

    if (tokenIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Tokenization produced zero tokens" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Map token IDs into stylometry vector components ---
    const lexicalDiversity = Math.min(typeTokenRatio(tokenIds), 1.0);
    const syntacticComplexity = Math.min(
      averageTokenLength(text, tokenIds.length) / 8.0,
      1.0,
    );
    const structuralEntropy = Math.min(shannonEntropy(tokenIds) / 10.0, 1.0);
    const readabilityScore = fleschReadingEase(text);
    const sentiment = sentimentPolarity(text);
    const vectorHash = hashTokenIds(tokenIds);

    // --- Insert into stylometry_vectors ---
    const label = sample_label || text.slice(0, 60).replace(/\n/g, " ").trim();

    const { data, error: insertError } = await client
      .from("stylometry_vectors")
      .insert({
        sample_label: label,
        lexical_diversity: lexicalDiversity,
        syntactic_complexity: syntacticComplexity,
        structural_entropy: structuralEntropy,
        readability_score: readabilityScore,
        sentiment_polarity: sentiment,
        vector_hash: vectorHash,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Return the vector and token analysis ---
    return new Response(
      JSON.stringify({
        vector: data,
        token_analysis: {
          tokenizer: "gpt-tokenizer (BPE, cl100k_base)",
          token_count: tokenIds.length,
          unique_tokens: new Set(tokenIds).size,
          type_token_ratio: lexicalDiversity,
          shannon_entropy_bits: shannonEntropy(tokenIds),
          vector_hash: vectorHash,
        },
        e_abs: E_ABS,
        protocol: "RW-IDP v1.0",
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
