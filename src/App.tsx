import React from 'react';
import { VibeCheckCheckoutButton } from './components/VibeCheckCheckoutButton';

export default function App() {
  // Replace with your actual Stripe Payment Link generated in your dashboard
  const liveStripeUrl = "https://buy.stripe.com/your_live_payment_link_here";

  return (
    <main className="min-h-screen bg-[#08090C] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <VibeCheckCheckoutButton 
          price="£4.99" 
          stripeCheckoutUrl={liveStripeUrl} 
        />
      </div>
    </main>
  );
}
