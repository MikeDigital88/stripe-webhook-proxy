// Dopo la verifica firma OK
let event;
try {
  event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    process.env.STRIPE_WH_SECRET
  );
} catch (err) {
  console.error('❌  Firma non valida:', err.message);
  return res.status(400).send('Invalid signature');
}

// Forward al backend Replit – adesso in vero JSON
try {
  await fetch(process.env.FORWARD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-From-Render': 'stripe-proxy'
      // se vuoi puoi aggiungere 'Stripe-Signature': sig
    },
    body: JSON.stringify(event),
  });
} catch (err) {
  console.error('⚠️  Forward error:', err.message);
}

res.send('ok');
