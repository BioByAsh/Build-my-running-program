/**
 * Polled by the browser after the user clicks Pay.
 * Returns { paid: true } if a confirmed sale happened after the user clicked Pay.
 */
exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  const clickTime = parseInt(event.queryStringParameters?.clickTime || '0', 10);

  if (!clickTime) {
    return { statusCode: 200, headers, body: JSON.stringify({ paid: false }) };
  }

  try {
    const res = await fetch(
      process.env.UPSTASH_URL + '/get/latest_sale',
      { headers: { Authorization: 'Bearer ' + process.env.UPSTASH_TOKEN } }
    );
    const data = await res.json();
    const saleTime = parseInt(data.result || '0', 10);
    console.log('clickTime:', clickTime, 'saleTime:', saleTime);

    const paid = saleTime > clickTime;

    if (paid) {
      // Delete so this sale can't unlock a different session
      fetch(
        process.env.UPSTASH_URL + '/del/latest_sale',
        { headers: { Authorization: 'Bearer ' + process.env.UPSTASH_TOKEN } }
      ).catch(() => {});
    }

    return { statusCode: 200, headers, body: JSON.stringify({ paid }) };
  } catch(e) {
    console.error('Upstash error:', e.message);
    return { statusCode: 200, headers, body: JSON.stringify({ paid: false }) };
  }
};
