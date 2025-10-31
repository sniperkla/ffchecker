// Test cases for /checknews endpoint
// Run with: node test.js (after starting the server)

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

async function testCheckNews(description, expectedStatus, expectedHasEvent, expectedNextEvent) {
  try {
    const response = await fetch(`${BASE_URL}/checknews`);
    const data = await response.json();
    console.log(`\n${description}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('Status check:', data.status === expectedStatus ? 'PASS' : `FAIL (expected ${expectedStatus}, got ${data.status})`);
    console.log('Event check:', (data.event !== undefined) === expectedHasEvent ? 'PASS' : `FAIL (expected event: ${expectedHasEvent})`);
    console.log('Next event check:', (data.next_event !== undefined) === expectedNextEvent ? 'PASS' : `FAIL (expected next_event: ${expectedNextEvent})`);
  } catch (error) {
    console.error(`Error in ${description}:`, error.message);
  }
}

// Example test cases (adjust based on actual events in DB)
// These are hypothetical; replace with real scenarios

console.log('Testing /checknews endpoint...');

// Test 1: Normal status with next event
await testCheckNews('Normal status before any event window', 'normal', false, true);

// Test 2: Stop trading during event window
await testCheckNews('Stop trading during event window', 'stoptrading', true, true);

// Test 3: Normal status between events
await testCheckNews('Normal status between events', 'normal', false, true);

// Test 4: Stop trading for last event
await testCheckNews('Stop trading for last event', 'stoptrading', true, false);

console.log('\nTest completed.');
