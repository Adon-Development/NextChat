import Stripe from 'stripe';

const stripe = new Stripe('sk_test_51QyaScAZ2N7iZXB4BUqgSjxaaM3hF7R6uWFPhscPZzaVgswCgS8PeMtSOxqgEaW20V7f3ipTjiFNJLs8mZhjuyEx00kQQWagGS', {
  apiVersion: '2020-08-27',
});

export async function createCheckoutSession(userId: string) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Subscription',
          },
          unit_amount: 1000, // $10.00
        },
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `https://yourdomain.com/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `https://yourdomain.com/cancel`,
    metadata: {
      userId,
    },
  });

  return session.url;
}

export async function handleWebhook(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.metadata.userId;

  if (event.type === 'checkout.session.completed') {
    // Update user subscription status in your database
    // Example: updateUserSubscription(userId, 'Paid');
  }
}
