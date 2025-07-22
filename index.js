import express from 'express';
import Stripe from 'stripe';

const app = express();

// Raw body per la verifica della firma
app.post('/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const stripe = new Stripe(process.env.STRIPE_API_KEY, {
    apiVersion: '2023-10-16',
  });

  try {
    stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WH_SECRET
    );
  } catch (err) {
    console.error('❌  Firma non valida:', err.message);
    return res.status(400).send('Invalid signature');
  }

  // Forward al backend Replit
  try {
    await fetch('https://inkcraftai.repl.co/api/payment/events', {
      method: 'POST',
      body: req.body,
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': sig,
        'X-From-Render': 'stripe-proxy',
      },
    });
  } catch (err) {
    console.error('⚠️  Forward error:', err.message);
  }

  res.send('ok');
});

app.listen(process.env.PORT || 8080, () =>
  console.log('🚀  Stripe proxy in ascolto')
);
