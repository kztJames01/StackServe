const Stripe = require('stripe');

let stripeClient = null;

function getStripe() {
  if (stripeClient) return stripeClient;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  const apiVersion = process.env.STRIPE_API_VERSION;
  stripeClient = apiVersion
    ? new Stripe(secretKey, { apiVersion })
    : new Stripe(secretKey);
  return stripeClient;
}

module.exports = { getStripe };
