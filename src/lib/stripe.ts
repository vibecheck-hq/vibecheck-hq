import { supabase } from './supabase';

export async function triggerSubtextCheckout(targetDob: string) {
  try {
    // Invoke the deployed Deno Edge Function
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { 
        tier: 'clarity_pro', // Modify based on how your Edge Function expects the price trigger
        metadata: {
          target_dob: targetDob,
          demographic_source: "Subtext_Engine_V1"
        }
      }
    });

    if (error) {
      console.error("Edge Function Error:", error);
      throw new Error("Failed to initialize secure checkout.");
    }

    // The Edge Function should return the Stripe Session URL
    if (data?.url) {
      window.location.href = data.url; // Instant redirect to Stripe Paywall
    } else {
      throw new Error("No checkout URL returned from gateway.");
    }
  } catch (err) {
    console.error("Checkout Execution Failed:", err);
    alert("Connection unstable. Please try again.");
  }
}
