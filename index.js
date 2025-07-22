import express from 'express';
import Stripe  from 'stripe';

const app = express();

/* 1) ROUTE WEBHOOK ------------------------------------------------------- */
app.post(
  '/webhook',
  express.raw({ type: '*/*' }),         // riceviamo il buffer grezzo da Stripe
  async (req, res) => {

    /* 1.a  Verifica firma ------------------------------------------------- */
    const stripe = new Stripe(process.env.STRIPE_API_KEY, {
      apiVersion: '2023-10-16',
    });
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'],
        process.env.STRIPE_WH_SECRET
      );
    } catch (err) {
      console.error('❌  Firma non valida:', err.message);
      return res.status(400).send('Invalid signature');
    }

    /* 1.b  Inoltra al backend (JSON) ------------------------------------- */
    try {
      const resp = await fetch(process.env.FORWARD_URL, {
        method: 'POST',
        body: JSON.stringify(event),      // ⬅️  JSON, non buffer
        headers: {
          'Content-Type': 'application/json',
          'X-From-Render': 'stripe-proxy'
        }
      });
      console.log(`Forward OK (${resp.status})`);
    } catch (err) {
      console.error('⚠️  Forward error:', err.message);
    }

    res.send('ok');
  }
);                                        // **chiusura app.post**

/* 2) AVVIO SERVER -------------------------------------------------------- */
app.listen(process.env.PORT || 8080, () =>
  console.log('🚀  Stripe proxy in ascolto')
);

