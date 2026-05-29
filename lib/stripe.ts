import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

export const PLANS = {
  standard: {
    name: "Standard",
    priceId: process.env.STRIPE_STANDARD_PRICE_ID!,
    amount: 12900,
    features: ["1 location", "Weekly performance digest", "Up to 20 staff members"],
  },
  plus: {
    name: "Plus",
    priceId: process.env.STRIPE_PLUS_PRICE_ID!,
    amount: 22900,
    features: ["Up to 4 locations", "Daily insights", "Unlimited staff", "API integrations"],
  },
};
