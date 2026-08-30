/**
 * Polled by the browser every 3 seconds after the user clicks Pay.
 * Checks Upstash Redis for payment confirmation.
 * No npm packages needed - uses Upstash's REST API with fetch.
 */
exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  const sessionId = event.queryStringParameters && event.queryStringParameters.session;

  if (!sessionId) {
    return { statusCode: 200, headers, body: JSON.stringify({ paid: false }) };
  }

  try {
    const res = await fetch(
      process.env.UPSTASH_URL + '/get/' + encodeURIComponent(sessionId),
      { headers: { Authorization: 'Bearer ' + process.env.UPSTASH_TOKEN } }
    );
    const data = await res.json();
    const paid = data.result === 'paid';

    if (paid) {
      // Delete after confirming - one-time use token
      fetch(
        process.env.UPSTASH_URL + '/del/' + encodeURIComponent(sessionId),
        { headers: { Authorization: 'Bearer ' + process.env.UPSTASH_TOKEN } }
      ).catch(() => {});
    }

    return { statusCode: 200, headers, body: JSON.stringify({ paid }) };
  } catch(e) {
    console.error('Upstash error:', e.message);
    return { statusCode: 200, headers, body: JSON.stringify({ paid: false }) };
  }
};
