import express from 'express';
import { handleWebhook } from '../stripeConfig';

const router = express.Router();

router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, 'your-webhook-signing-secret');
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  handleWebhook(event);

  res.json({ received: true });
});

export default router;
