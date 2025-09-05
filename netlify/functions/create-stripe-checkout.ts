// IMPORTANT: To use this function, you must install the Stripe Node.js library:
// npm install stripe
//
// You also need to set your Stripe secret key as an environment variable in your Netlify dashboard:
// STRIPE_SECRET_KEY = sk_live_...

import { Handler } from '@netlify/functions';
// Using `require` for Stripe as it can sometimes have issues with ES module imports in Netlify Functions.
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const handler: Handler = async (event) => {
  // Allow requests from your production domain
  const origin = event.headers.origin;
  const allowedOrigins = [
      'https://main--brilliant-buttercream-cbfb40.netlify.app', 
      'http://localhost:8888', // for local development
    ];

  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Origin': '*' // In production, you should lock this down to your site's origin for better security
  };
  
//   if (origin && allowedOrigins.includes(origin)) {
//     headers['Access-Control-Allow-Origin'] = origin;
//   } else {
//       return {
//           statusCode: 403,
//           body: JSON.stringify({ error: 'Origin not allowed' }),
//       }
//   }

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
    const { priceId } = JSON.parse(event.body);

    if (!priceId) {
        throw new Error("Price ID is required.");
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment', // Use 'subscription' for recurring plans
      // IMPORTANT: Replace these with your actual success and cancel URLs
      success_url: `${origin}/?payment_success=true`,
      cancel_url: `${origin}/plans?payment_canceled=true`,
    });

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
