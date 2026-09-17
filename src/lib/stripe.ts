import { supabase } from '@/lib/supabase';

export async function createCheckoutSession(priceId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { priceId },
  });

  if (error || !data?.url) {
    throw new Error(error?.message ?? 'Failed to create checkout session');
  }

  window.location.href = data.url;
}
