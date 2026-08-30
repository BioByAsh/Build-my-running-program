/**
 * Receives Gumroad's Ping webhook on every sale.
 * Stores the sale timestamp so the browser can detect a recent payment.
 */
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const params = new URLSearchParams(event.body || '');
  const permalink = params.get('product_permalink') || '';
  console.log('Ping received. permalink:', permalink);

  if (!permalink.includes('woksrk')) {
    console.log('Not our product, ignoring');
    return { statusCode: 200, body: 'OK' };
  }

  const saleId = params.get('sale_id') || '';
  const ts = Date.now();
  console.log('Valid sale. saleId:', saleId, 'ts:', ts);

  try {
    // Store the sale timestamp under a fixed key, expires in 10 minutes
    const res = await fetch(
      process.env.UPSTASH_URL + '/set/latest_sale/' + ts + '/ex/600',
      { headers: { Authorization: 'Bearer ' + process.env.UPSTASH_TOKEN } }
    );
    const result = await res.json();
    console.log('Stored sale timestamp. Upstash:', JSON.stringify(result));
  } catch(e) {
    console.error('Upstash error:', e.message);
  }

  return { statusCode: 200, body: 'OK' };
};
