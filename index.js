// index.js – Proxy Stripe → Replit (senza verifica firma, invia RAW nel wrapper)

import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');            // evita problemi IPv6 su Render

import express from 'express';

const { FORWARD_URL, PORT = 8080, NODE_ENV = 'development' } = process.env;
if (!FORWARD_URL) {
  console.error('❌  FORWARD_URL mancante');
  process.exit(1);
}
console.log('FORWARD_URL =', FORWARD_URL);

const app = express();

/* 1) Webhook – ricevi RAW da Stripe e inoltra “così com’è”  */
app.post('/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  // buffer  → stringa  (⚠️ NON fare JSON.parse qui!)
  const rawBody = req.body.toString('utf8');

  try {
    const resp = await fetch(FORWARD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-From-Render': 'stripe-proxy',
        'Stripe-Signature': req.headers['stripe-signature'] || ''
      },
      // wrapper: { "__stripe_raw": "<stringa raw>" }
      body: JSON.stringify({ __stripe_raw: rawBody })
    });

    const txt = await resp.text();
    console.log(`➡️ Forward → ${resp.status}`);
    if (txt) console.log(`   Body: ${txt.slice(0, 400)}`);
  } catch (err) {
    console.error('⚠️  Forward error:', err.name, err.code, err.message);
    // non bloccare Stripe: rispondi comunque 200
  }

  res.send('ok');                                  // sempre 200 a Stripe
});

/* 2) Health‑check semplice */
app.get('/', (_req, res) => res.send(`Proxy OK – ${NODE_ENV}`));

app.listen(PORT, () => console.log('🚀  Proxy listening on', PORT));
