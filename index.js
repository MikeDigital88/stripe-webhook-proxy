// index.js - Proxy Stripe → Replit (senza verifica firma, con wrapper)

import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import express from 'express';

const { FORWARD_URL, PORT = 8080, NODE_ENV = 'development' } = process.env;

if (!FORWARD_URL) {
  console.error('❌ FORWARD_URL mancante');
  process.exit(1);
}
console.log('FORWARD_URL =', FORWARD_URL);

const app = express();

app.post('/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  let stripeEvent = null;
  try {
    stripeEvent = JSON.parse(req.body.toString('utf8'));
  } catch (e) {
    console.error('⚠️ JSON parse (raw body) fallita:', e.message);
  }

  try {
    const resp = await fetch(FORWARD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-From-Render': 'stripe-proxy',
        'Stripe-Signature': req.headers['stripe-signature'] || ''
      },
      body: JSON.stringify({ __stripe_event: stripeEvent })
    });

    const txt = await resp.text();
    console.log(`➡️ Forward → ${resp.status}`);
    if (txt) console.log(`   Body: ${txt.slice(0, 400)}`);
  } catch (err) {
    console.error('⚠️ Forward error:', err.name, err.code, err.message);
  }

  res.send('ok');
});

app.get('/', (_req, res) => res.send(`Proxy OK - ${NODE_ENV}`));

app.listen(PORT, () => console.log('🚀 Proxy listening on', PORT));
