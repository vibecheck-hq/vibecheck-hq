import { supabase } from './supabase';

// 1. Legacy bypass added by bolt.new AI to keep Pricing.tsx from crashing
export const createCheckoutSession = async (priceId: string) => {
  console.log('Legacy pricing bypass active for:', priceId);
};

// 2. The Brain Trust Secure Edge Invocation
export async function triggerSubtextCheckout(targetDob: string) {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { 
        tier: 'clarity_pro', 
        metadata: {
          target_dob: targetDob,
          demographic_source: "World_Demographics_Bracket_18_29"
        }
      }
    });

    if (error) {
      console.error("Edge Function Error:", error);
      throw new Error("Failed to initialize secure checkout.");
    }

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
