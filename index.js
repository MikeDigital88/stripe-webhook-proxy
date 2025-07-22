// index.js - PROXY SEMPLICE
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import express from 'express';

const {
  FORWARD_URL,          // es: https://inkcraft-ai.replit.app/webhook-stripe-inkcraft
  PORT = 8080,
  NODE_ENV = 'development'
} = process.env;

if (!FORWARD_URL) {
  console.error('❌ FORWARD_URL mancante');
  process.exit(1);
}

const app = express();

// ❗ Riceviamo il RAW da Stripe (firma ignorata)
app.post('/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const resp = await fetch(FORWARD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-From-Render': 'stripe-proxy',
        'Stripe-Signature': req.headers['stripe-signature'] || '',
      },
      // inoltro l'evento convertendolo in JSON “pulito”
      body: req.body.toString('utf8'),
    });

    const txt = await resp.text();
    console.log(`➡️ Forward → ${resp.status}`);
    if (txt) console.log(`   Body: ${txt.slice(0, 500)}`);
  } catch (err) {
    console.error('⚠️ Forward error:', err.name, err.code, err.message);
    // Non facciamo fallire Stripe
  }

  // Rispondiamo SEMPRE 200 a Stripe
  return res.send('ok');
});

app.get('/', (_req, res) => res.send(`Stripe proxy ok - ${NODE_ENV}`));

app.listen(PORT, () => {
  console.log(`🚀 Proxy in ascolto su ${PORT}`);
});

