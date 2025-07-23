// index.js – Proxy Stripe → Replit (niente firma, wrapper raw)

/* 1 – Forza IPv4 (Render a volte preferisce AAAA) */
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import express from 'express';

const { FORWARD_URL, PORT = 8080, NODE_ENV = 'development' } = process.env;
if (!FORWARD_URL) {
  console.error('❌  FORWARD_URL mancante');
  process.exit(1);
}
console.log('FORWARD_URL =', FORWARD_URL);

const app = express();

/* 2 – Webhook: ricevi RAW e inoltra “as is” */
app.post('/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  // buffer → stringa (niente JSON.parse qui!)
  const raw = req.body.toString('utf8');

  try {
    const resp = await fetch(FORWARD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-From-Render': 'stripe-proxy',
        'Stripe-Signature': req.headers['stripe-signature'] || ''
      },
      // wrapper: { "__stripe_raw": "<stringa raw>" }
      body: JSON.stringify({ __stripe_raw: raw })
    });

    const txt = await resp.text();
    console.log(`➡️ Forward → ${resp.status}`);
    if (txt) console.log(`   Body: ${txt.slice(0, 400)}`);
  } catch (err) {
    console.error('⚠️  Forward error:', err.name, err.code, err.message);
  }

  // Stripe deve SEMPRE ricevere 200
  res.send('ok');
});

/* Health‑check semplice */
app.get('/', (_req, res) => res.send(`Proxy OK – ${NODE_ENV}`));

app.listen(PORT, () => console.log('🚀  Proxy listening on', PORT));

