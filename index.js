// index.js  (Render)

// 1) Forza IPv4 (bug DNS su alcune piattaforme)
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

// 2) Ricevi raw da Stripe (non facciamo verifica firma qui)
app.post('/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const resp = await fetch(FORWARD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-From-Render': 'stripe-proxy',
        // passo comunque la signature, se mai ti servisse lato Replit
        'Stripe-Signature': req.headers['stripe-signature'] || ''
      },
      body: req.body.toString('utf8')
    });

    const txt = await resp.text();
    console.log(`➡️ Forward → ${resp.status}`);
    if (txt) console.log(`   Body: ${txt.slice(0, 400)}`);
  } catch (err) {
    console.error('⚠️ Forward error:', err.name, err.code, err.message);
  }

  // Rispondi SEMPRE 200 a Stripe
  res.send('ok');
});

// 3) Healthcheck
app.get('/', (_req, res) => res.send(`Proxy OK - ${NODE_ENV}`));

app.listen(PORT, () => console.log('🚀 Proxy listening on', PORT));
