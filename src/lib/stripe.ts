import { supabase } from './supabase';

export async function createCheckoutSession(priceId?: string, email?: string) {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { email },
    });

    if (error) {
      throw new Error('Failed to initialize checkout.');
    }

    if (data?.url) {
      window.location.href = data.url;
    } else {
      throw new Error('No checkout URL returned.');
    }
  } catch (err) {
    console.error('Checkout failed:', err);
    alert('Connection unstable. Please try again.');
  }
}

export async function triggerSubtextCheckout(targetDob: string, email?: string) {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        email,
        metadata: {
          target_dob: targetDob,
          demographic_source: 'World_Demographics_Bracket_18_29',
        },
      },
    });

    if (error) {
      throw new Error('Failed to initialize secure checkout.');
    }

    if (data?.url) {
      window.location.href = data.url;
    } else {
      throw new Error('No checkout URL returned from gateway.');
    }
  } catch (err) {
    console.error('Checkout Execution Failed:', err);
    alert('Connection unstable. Please try again.');
  }
}
