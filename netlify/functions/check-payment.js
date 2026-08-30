const { getStore } = require('@netlify/blobs');

/**
 * Polled by the browser every 3 seconds after the user clicks Pay.
 * Returns { paid: true } once the Gumroad Ping has been stored.
 * URL: /.netlify/functions/check-payment?session=SESSION_ID
 */
exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };

  const sessionId = event.queryStringParameters && event.queryStringParameters.session;

  if (!sessionId) {
    return { statusCode: 200, headers, body: JSON.stringify({ paid: false }) };
  }

  try {
    // Pass lambda context so Netlify Blobs knows which site/deployment to use
    const store = getStore({ name: 'biopoint-sessions', context });
    let data = null;

    try { data = await store.get(sessionId, { type: 'json' }); } catch(e) {
      // Not found yet - payment not confirmed
    }

    const paid = data !== null && data.paid === true;

    // Delete after confirming - one-time use token
    if (paid) {
      try { await store.delete(sessionId); } catch(e) {}
    }

    return { statusCode: 200, headers, body: JSON.stringify({ paid }) };
  } catch (e) {
    console.error('check-payment error:', e.message);
    return { statusCode: 200, headers, body: JSON.stringify({ paid: false }) };
  }
};
