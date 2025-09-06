// IMPORTANT: To use this function, you must install the Stripe Node.js library:
// npm install stripe
//
// You also need to set your Stripe secret key as an environment variable in your Netlify dashboard:
// STRIPE_SECRET_KEY = sk_live_...

import { Handler } from '@netlify/functions';
// FIX: Switched from `require` to an ES module `import` to resolve TypeScript compilation errors.
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set.");
}
const stripe = new Stripe(stripeSecretKey);

const handler: Handler = async (event) => {
  const origin = event.headers.origin;
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Origin': '*' // In production, you should lock this down to your site's origin for better security
  };

  // Handle preflight CORS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Successful preflight call.' }),
    };
  }

  if (event.httpMethod !== 'POST' || !event.body) {
    return {
      statusCode: 405,
      headers,
      body: 'Method Not Allowed',
    };
  }

  try {
    const { priceId, userEmail } = JSON.parse(event.body);

    if (!priceId) {
        throw new Error("Price ID is required.");
    }

    const subscriptionPriceIds = [
        'price_1PScF3A5qkZtHvNNs4v5L2pX', // Básico
        'price_1PScGBA5qkZtHvNN3N0aEeyB', // Profissional
        'price_1PScGgA5qkZtHvNNTj4bXh2C', // Premium
    ];

    const mode = subscriptionPriceIds.includes(priceId) ? 'subscription' : 'payment';
    
    const successUrl = `${origin || 'https://main--brilliant-buttercream-cbfb40.netlify.app'}/?payment_success=true`;
    const cancelUrl = `${origin || 'https://main--brilliant-buttercream-cbfb40.netlify.app'}/plans?payment_canceled=true`;
    
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
    };
    
    if (mode === 'subscription') {
      if (!userEmail) {
        throw new Error("User email is required for subscriptions.");
      }
      sessionParams.customer_email = userEmail;
    }
    
    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error: any) {
    console.error('Stripe session creation failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };