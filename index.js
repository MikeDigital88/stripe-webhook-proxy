import express from 'express';
import Stripe  from 'stripe';

const app = express();

/* 1) ROUTE WEBHOOK ------------------------------------------------------- */
app.post(
  '/webhook',
  express.raw({ type: '*/*' }),    // <-- raw body per la firma
  async (req, res) => {            // <‑‑‑‑‑‑‑‑‑‑‑ APERTURA callback

    const sig    = req.headers['stripe-signature'];
    const stripe = new Stripe(process.env.STRIPE_API_KEY, {
      apiVersion: '2023-10-16',
    });

    /* 1.a Verifica firma -------------------------------------------------- */
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WH_SECRET
      );
    } catch (err) {
      console.error('❌  Firma non valida:', err.message);
      return res.status(400).send('Invalid signature');   // <‑‑‑‑ OK (dentro)
    }

    /* 1.b Forward a Replit ------------------------------------------------ */
    try {
      await fetch(process.env.FORWARD_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-From-Render': 'stripe-proxy',
        },
        body: JSON.stringify(event),   // inviamo JSON valido
      });
    } catch (err) {
      console.error('⚠️  Forward error:', err.message);
      /* NON rilanciamo: rispondiamo comunque 200 a Stripe */
    }

    res.send('ok');
  }                                  // <‑‑‑‑‑‑‑‑‑‑‑ CHIUSURA callback
);

/* 2) AVVIO SERVER -------------------------------------------------------- */
app.listen(process.env.PORT || 8080, () =>
  console.log('🚀  Stripe proxy in ascolto')
);
