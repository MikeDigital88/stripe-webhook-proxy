import express from 'express';
import Stripe from 'stripe';

const app = express();

// 1️⃣  usiamo raw Buffer per la firma
app.post(
  '/webhook',
  express.raw({ type: '*/*' }),
  async (req, res) => {                 // <‑‑ questa graffa apre il callback
    const sig = req.headers['stripe-signature'];

    // Init Stripe SDK
    const stripe = new Stripe(process.env.STRIPE_API_KEY, {
      apiVersion: '2023-10-16',
    });

    let event;
    // 2️⃣  Verifica firma
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WH_SECRET
      );
    } catch (err) {
      console.error('❌  Firma non valida:', err.message);
      return res.status(400).send('Invalid signature'); // <-- ora è legale
    }

    // 3️⃣  Forward al backend Replit in vero JSON
    try {
      await fetch(process.env.FORWARD_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-From-Render': 'stripe-proxy',
          // se vuoi: 'Stripe-Signature': sig,
        },
        body: JSON.stringify(event),          // inviamo l’evento serializzato
      });
    } catch (err) {
      console.error('⚠️  Forward error:', err.message);
      // non blocchiamo Stripe: proseguiamo
    }

    res.send('ok');
  }                                         // <‑‑ questa graffa CHIUDE il callback
);

app.listen(process.env.PORT || 8080, () =>
  console.log('🚀  Stripe proxy in ascolto')
);
