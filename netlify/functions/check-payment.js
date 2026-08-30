const { getStore } = require('@netlify/blobs');

/**
 * Called by the browser every 3 seconds while the Gumroad popup is open.
 * Returns { paid: true } as soon as the Gumroad Ping has been received.
 * Deletes the entry after confirming so it cannot be replayed.
 *
 * URL: /.netlify/functions/check-payment?session=SESSION_ID
 */
exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };

  const sessionId = event.queryStringParameters && event.queryStringParameters.session;

  if (!sessionId) {
    return { statusCode: 200, headers, body: JSON.stringify({ paid: false }) };
  }

  const store = getStore('biopoint-sessions');
  let data = null;

  try {
    data = await store.get(sessionId, { type: 'json' });
  } catch (e) {
    // Entry not found yet - payment not confirmed
  }

  const paid = data !== null && data.paid === true;

  // Delete after confirming - one-time use
  if (paid) {
    try { await store.delete(sessionId); } catch (e) {}
  }

  return { statusCode: 200, headers, body: JSON.stringify({ paid }) };
};
