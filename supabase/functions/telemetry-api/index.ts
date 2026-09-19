import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, targetDob } = await req.json();

    if (!text) {
      throw new Error("Target text is missing from payload.");
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error("Gemini API Key not configured.");

    // The Weaponized Brain Trust Prompt (Targeting 18-29 Demographic Anxiety)
    const systemPrompt = `
      Act as an elite behavioral profiler and linguist. You are analyzing communication for a high-stakes client.
      You must decode the provided text message and output a clinical, psychological dossier. 
      The target's Date of Birth is ${targetDob}.
      
      Do not be polite. Be brutally analytical. Focus on power dynamics, passive-aggression, evasion, and hidden leverage.
      
      You MUST return the output EXACTLY as a raw JSON object with the following keys:
      {
        "archetype": "A 2-3 word clinical title for the target (e.g., 'The Evasive Narcissist', 'The Anxious Avoider')",
        "unfiltered_translation": "What the target's text ACTUALLY means, stripped of all politeness.",
        "power_dynamic": "Who currently holds the power in this interaction, and why.",
        "depressed_intelligences": [
          "Name 3 psychological vulnerabilities or 'Depressed Intelligences' the target exhibits based on their syntax (e.g., 'Unfiltered Emotional Contagion', 'Implicit Ambiguity Intolerance')."
        ],
        "strategic_rebuttal": "The exact, word-for-word text message our client should send back to seize total control of the dynamic."
      }
      
      Return ONLY valid JSON. No markdown formatting, no backticks, no explanations.
    `;

    // Fetch call to Google Gemini 3 Pro
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              { text: `TARGET TEXT TO DECODE: "${text}"` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2, // Low temperature for cold, clinical certainty
        }
      })
    });

    const geminiData = await response.json();
    const rawContent = geminiData.candidates[0].content.parts[0].text;
    
    // Parse the strict JSON returned by Gemini
    const dossier = JSON.parse(rawContent.trim());

    return new Response(JSON.stringify(dossier), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error("Gemini 3 Pro Execution Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
