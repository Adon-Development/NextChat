import React, { useState, useEffect } from 'react';
import { createCheckoutSession } from '../stripeConfig';

const UserProfile = ({ user }) => {
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
      <h1>{user.username}</h1>
      <p>Logged in as: {user.username}</p>
      <p>Tier: {subscriptionStatus}</p>
      {user && subscriptionStatus === 'Free' && (
        <button onClick={handleSubscribe}>Subscribe</button>
      )}
    </div>
  );
};

export default UserProfile;
