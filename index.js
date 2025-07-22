import express from 'express';
import Stripe from 'stripe';

const app = express();

/* 1) ROUTE WEBHOOK ------------------------------------------------------- */
app.post(
  '/webhook',
  express.raw({ type: '*/*' }),     // riceviamo il buffer grezzo da Stripe
  async (req, res) => {

    const sig    = req.headers['stripe-signature'];
    const stripe = new Stripe(process.env.STRIPE_API_KEY, {
      apiVersion: '2023-10-16',
    });

    /* 1.a  Verifica firma ------------------------------------------------- */
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,                   // buffer
        sig,
        process.env.STRIPE_WH_SECRET
      );
    } catch (err) {
      console.error('❌  Firma non valida:', err.message);
      return res.status(400).send('Invalid signature');
    }

    /* 1.b  Forward al backend (JSON) ------------------------------ */
try {
  const resp = await fetch(process.env.FORWARD_URL, {
    method: 'POST',
    body: JSON.stringify(event),          // ⬅️ inviamo JSON
    headers: {
      'Content-Type': 'application/json',
      'X-From-Render': 'stripe-proxy'     // nessuna Stripe‑Signature
    }
  });
  console.log(`Forward OK (${resp.status})`);
} catch (err) {
  console.error('⚠️  Forward error:', err.message);
}

/* 2) AVVIO SERVER -------------------------------------------------------- */
app.listen(process.env.PORT || 8080, () =>
  console.log('🚀  Stripe proxy in ascolto')
);
