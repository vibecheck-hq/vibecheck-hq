import { SUPABASE_URL } from '@/lib/config';

export interface DecodeResult {
  headline: string;
  true_intent: string;
  red_flags: string[];
  green_flags: string[];
  executive_takeaway: string;
}

export type UnlockStatus =
  | { state: 'pending' }
  | { state: 'unlocked'; decode: DecodeResult; creditsRemaining: number };

export class CheckoutError extends Error {}

const CHECKOUT_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/create-checkout`;
const REQUEST_TIMEOUT_MS = 15000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isDecodeResult(value: unknown): value is DecodeResult {
  return (
    isRecord(value) &&
    typeof value.headline === 'string' &&
    typeof value.true_intent === 'string' &&
    typeof value.executive_takeaway === 'string' &&
    isStringArray(value.red_flags) &&
    isStringArray(value.green_flags)
  );
}

async function postToCheckout(body: Record<string, unknown>): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(CHECKOUT_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const serverMessage = isRecord(data) && typeof data.error === 'string' ? data.error : null;
      throw new CheckoutError(serverMessage ?? 'Something went wrong. Please try again.');
    }
    return data;
  } catch (err) {
    if (err instanceof CheckoutError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new CheckoutError('The request took too long. Check your connection and try again.');
    }
    throw new CheckoutError('Network error. Check your connection and try again.');
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function startCheckout(rawText: string): Promise<string> {
  const data = await postToCheckout({
    raw_text: rawText,
    return_origin: window.location.origin,
  });

  if (!isRecord(data) || typeof data.checkout_url !== 'string') {
    throw new CheckoutError('Checkout could not be started. Please try again.');
  }
  return data.checkout_url;
}

export async function verifyUnlock(sessionUuid: string, stripeSessionId: string): Promise<UnlockStatus> {
  const data = await postToCheckout({
    action: 'verify',
    session_uuid: sessionUuid,
    stripe_session_id: stripeSessionId,
  });

  if (isRecord(data) && data.status === 'pending') {
    return { state: 'pending' };
  }
  if (isRecord(data) && data.status === 'unlocked' && isDecodeResult(data.decode_result)) {
    return {
      state: 'unlocked',
      decode: data.decode_result,
      creditsRemaining: typeof data.credits_remaining === 'number' ? data.credits_remaining : 0,
    };
  }
  throw new CheckoutError('We could not confirm your payment. Please try again.');
}
