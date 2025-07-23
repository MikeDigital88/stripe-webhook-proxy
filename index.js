// index.js – Proxy Stripe → Replit (firma verificata)

import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import express from 'express';
import Stripe  from 'stripe';

const {
  PORT        = 8080,
  NODE_ENV    = 'development',
  FORWARD_URL,               // https://inkcraft-ai.replit.app/proxy-intake
  STRIPE_API_KEY,            // chiave segreta live
  STRIPE_WH_SECRET           // webhook signing secret
} = process.env;

if (!FORWARD_URL || !STRIPE_API_KEY || !STRIPE_WH_SECRET) {
  console.error('❌  Variabili d’ambiente mancanti');
  process.exit(1);
}
console.log('FORWARD_URL =', FORWARD_URL);

const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2023-10-16' });
const app    = express();

/* 1) Webhook: ricevi RAW, verifica firma, inoltra JSON sicuro */
app.post('/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,                          // buffer grezzo
      req.headers['stripe-signature'],
      STRIPE_WH_SECRET
    );
  } catch (err) {
    console.error('❌  Firma NON valida:', err.message);
    return res.status(400).send('Invalid signature');
  }

  /* inoltra l’evento già verificato */
  try {
    const resp = await fetch(FORWARD_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-From-Render': 'stripe-proxy' },
      body:    JSON.stringify({ __stripe_event: event })   // wrapper sicuro
    });
    console.log(`➡️  Forward → ${resp.status}`);
  } catch (err) {
    console.error('⚠️  Forward error:', err.name, err.message);
  }

  res.send('ok');                         // sempre 200 a Stripe
});

/* 2) Health‑check */
app.get('/', (_req, res) => res.send(`Proxy OK – ${NODE_ENV}`));
app.listen(PORT, () => console.log('🚀  Proxy listening on', PORT));


