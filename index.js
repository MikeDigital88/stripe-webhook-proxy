// index.js  – Proxy Stripe → Replit (invio RAW nel wrapper)

import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');               // evita i problemi IPv6

import express from 'express';

const { FORWARD_URL, PORT = 8080, NODE_ENV = 'development' } = process.env;
if (!FORWARD_URL) {
  console.error('❌  FORWARD_URL mancante');
  process.exit(1);
}
console.log('FORWARD_URL =', FORWARD_URL);

const app = express();

/* ---  POST /webhook  ---------------------------------------------------- */
app.post('/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  // 1.  buffer Stripe → stringa (NON fare JSON.parse qui!)
  const rawBody = req.body.toString('utf8');

  // 2.  inoltra al backend Replit dentro un wrapper
  try {
    const resp = await fetch(FORWARD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-From-Render': 'stripe-proxy',
        'Stripe-Signature': req.headers['stripe-signature'] || ''
      },
      body: JSON.stringify({ __stripe_raw: rawBody })   //  ← wrapper
    });

    const txt = await resp.text();
    console.log(`➡️  Forward → ${resp.status}`);
    if (txt) console.log(`   Body: ${txt.slice(0, 400)}`);
  } catch (err) {
    console.error('⚠️  Forward error:', err.name, err.code, err.message);
  }

  // 3.  sempre 200 a Stripe
  res.send('ok');
});

/* ----------------------------------------------------------------------- */
app.get('/', (_req, res) => res.send(`Proxy OK – ${NODE_ENV}`));
app.listen(PORT, () => console.log('🚀  Proxy listening on', PORT));

