// index.js
// -----------------------------------------------------------------------------
// Avviare con: node index.js
// Richiede: "type": "module" nel package.json
// -----------------------------------------------------------------------------

import express from 'express';
import Stripe from 'stripe';

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------
const {
  STRIPE_API_KEY,
  STRIPE_WH_SECRET,
  FORWARD_URL,          // es: https://tuo-backend-replit.app/webhook-stripe-inkcraft
  PORT = 8080,
  NODE_ENV = 'development'
} = process.env;

if (!STRIPE_API_KEY || !STRIPE_WH_SECRET || !FORWARD_URL) {
  console.error('❌  Manca una variabile d’ambiente (STRIPE_API_KEY / STRIPE_WH_SECRET / FORWARD_URL).');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2023-10-16' });
const app = express();

// -----------------------------------------------------------------------------
// 1) ROUTE WEBHOOK (Render) - verifica firma + forward JSON
// -----------------------------------------------------------------------------
app.post(
  '/webhook',
  express.raw({ type: '*/*' }), // Importante per la firma
  async (req, res) => {
    let event;

    // 1.a Verifica firma
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'],
        STRIPE_WH_SECRET
      );
    } catch (err) {
      console.error('❌  Firma non valida:', err.message);
      return res.status(400).send('Invalid signature');
    }

    // 1.b Forward al backend Replit (JSON)
    try {
      const resp = await fetch(FORWARD_URL, {
        method: 'POST',
        body: JSON.stringify(event),
        headers: {
          'Content-Type': 'application/json',
          'X-From-Render': 'stripe-proxy',
        },
      });

      const text = await resp.text(); // Leggiamo comunque, anche se JSON
      console.log(`➡️  Forward → ${resp.status}`);
      if (text) console.log(`   Body: ${text.slice(0, 500)}`);

    } catch (err) {
      console.error('⚠️  Forward error:', err.message);
      // Non blocchiamo la risposta a Stripe: rispondiamo comunque 200,
      // altrimenti Stripe ritenta in loop.
    }

    // ACK a Stripe
    res.send('ok');
  }
);

// -----------------------------------------------------------------------------
// 2) HEALTH CHECK
// -----------------------------------------------------------------------------
app.get('/', (_req, res) => res.send(`Stripe proxy ok - ${NODE_ENV}`));

// -----------------------------------------------------------------------------
// 3) START
// -----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀  Stripe proxy in ascolto sulla porta ${PORT}`);
});
