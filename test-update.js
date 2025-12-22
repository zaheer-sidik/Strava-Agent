// Test script to check if update handler is working
import fetch from 'node-fetch';

const testUpdate = {
  object_type: "activity",
  aspect_type: "update",  // Testing UPDATE event
  object_id: 12996296588,  // Use a real activity ID from your Strava
  owner_id: 178923280,
  subscription_id: 321501,
  event_time: Math.floor(Date.now() / 1000)
};

console.log('Sending test update event to local server...');
console.log('Event:', JSON.stringify(testUpdate, null, 2));

// Test against Render
fetch('https://strava-agent.onrender.com/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testUpdate)
})
.then(response => {
  console.log('\nResponse status:', response.status);
  return response.text();
})
.then(body => {
  console.log('Response body:', body);
  console.log('\nNow check Render logs at: https://dashboard.render.com');
  console.log('You should see: "Processing activity update..."');
})
.catch(error => {
  console.error('Error:', error);
});
