import React, { useState, useEffect } from 'react';
import { createCheckoutSession } from '../stripeConfig';
// ...existing imports...

const Chat = ({ user }) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState('Free');

  useEffect(() => {
    // Fetch subscription status from your backend
    // Example: fetchSubscriptionStatus(user.id).then(status => setSubscriptionStatus(status));
  }, [user.id]);

  const handleSubscribe = async () => {
    const url = await createCheckoutSession(user.id);
    window.location.href = url;
  };

  return (
    <div>
      {/* ...existing chat UI... */}
      <div>
        <p>Logged in as: {user.username}</p>
        <p>Tier: {subscriptionStatus}</p>
        {user && subscriptionStatus === 'Free' && (
          <button onClick={handleSubscribe}>Subscribe</button>
        )}
      </div>
      {/* ...existing chat UI... */}
    </div>
  );
};

export default Chat;
