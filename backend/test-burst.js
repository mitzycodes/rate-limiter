const URL = 'http://localhost:5000/api/data';
const CLIENT_ID = 'test-user-1';
const CONCURRENT_REQUESTS = 15;

async function sendRequest(index) {
  try {
    const res = await fetch(URL, {
      method: 'GET',
      headers: {
        'X-Client-Id': CLIENT_ID,
      },
    });

    const status = res.status;
    const remaining = res.headers.get('x-ratelimit-remaining');
    const retryAfter = res.headers.get('retry-after');
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }

    return {
      'Request #': index + 1,
      'Status': status,
      'Remaining': remaining !== null ? remaining : 'N/A',
      'Retry-After': retryAfter !== null ? retryAfter : 'N/A',
      'Body': JSON.stringify(body),
    };
  } catch (error) {
    return {
      'Request #': index + 1,
      'Status': 'ERROR',
      'Remaining': 'N/A',
      'Retry-After': 'N/A',
      'Body': error.message,
    };
  }
}

async function runBurstTest() {
  console.log(`Sending ${CONCURRENT_REQUESTS} concurrent requests to ${URL} with client ID "${CLIENT_ID}"...\n`);

  // Fire all requests concurrently using Promise.all
  const promises = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) => sendRequest(i));
  const results = await Promise.all(promises);

  console.table(
    results.map((r) => ({
      'Request #': r['Request #'],
      'Status': r['Status'],
      'Remaining': r['Remaining'],
      'Retry-After': r['Retry-After'],
    }))
  );

  const count200 = results.filter((r) => r.Status === 200).length;
  const count429 = results.filter((r) => r.Status === 429).length;
  const countErrors = results.filter((r) => r.Status !== 200 && r.Status !== 429).length;

  console.log('\n--- Summary ---');
  console.log(`HTTP 200 (Accepted): ${count200}`);
  console.log(`HTTP 429 (Too Many Requests): ${count429}`);
  if (countErrors > 0) {
    console.log(`Other / Failed: ${countErrors}`);
  }

  if (count200 === 10 && count429 === 5) {
    console.log('\nSUCCESS: Rate limiting verified (10 accepted, 5 throttled).');
  } else {
    console.log(`\nNOTE: Expected 10 accepted and 5 throttled, got ${count200} accepted and ${count429} throttled.`);
  }

  return { count200, count429, countErrors };
}

runBurstTest().catch(console.error);
