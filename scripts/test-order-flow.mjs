import assert from 'node:assert/strict';

// Creates synthetic records only on a local development server.
const base = new URL(process.argv[2] || 'http://127.0.0.1:5173');
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname), 'Run against localhost only.');
const key = crypto.randomUUID();
const body = {
  items: [{ productId: 'neem-tulsi', quantity: 1 }, { productId: 'rose-clay', quantity: 1 }],
  coupon: 'WELCOME10', paymentMethod: 'cod', website: '',
  customer: { name: 'Maa Test', email: 'qa@example.invalid', phone: '9899999999', address: '12 Test Lane, Sample Area', city: 'Pune', state: 'Maharashtra', postcode: '411001' },
};
async function post(path, data, overrides = {}) {
  const response = await fetch(new URL(path, base), { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base.origin, 'Idempotency-Key': key, ...overrides }, body: JSON.stringify(data) });
  const text = await response.text();
  let result;
  try { result = JSON.parse(text); } catch { result = { error: text }; }
  return { status: response.status, data: result, cache: response.headers.get('cache-control') };
}
const first = await post('/api/orders', body);
assert.equal(first.status, 201, JSON.stringify(first.data));
assert.equal(first.data.order.total, 53520);
assert.equal(first.cache, 'no-store');
const replay = await post('/api/orders', body);
assert.equal(replay.status, 200);
assert.deepEqual(replay.data, first.data);
assert.equal((await post('/api/orders', { ...body, coupon: '' })).status, 409);
for (const invalid of [
  { ...body, items: [{ productId: 'neem-tulsi', quantity: 11 }] },
  { ...body, items: [{ productId: 'unknown', quantity: 1 }] },
  { ...body, coupon: 'NOTVALID' },
  { ...body, customer: { ...body.customer, postcode: '000000' } },
]) assert.equal((await post('/api/orders', invalid)).status, 400);
assert.ok([400, 403].includes((await post('/api/orders', body, { Origin: 'https://example.invalid' })).status));
const track = await post('/api/orders/track', { reference: first.data.order.reference, email: body.customer.email });
assert.equal(track.status, 200);
assert.equal(track.data.order.total, 53520);
assert.equal(track.data.order.items.length, 2);
for (const field of ['phone', 'address', 'fingerprint', 'email']) assert.ok(!(field in track.data.order));
assert.equal((await post('/api/orders/track', { reference: first.data.order.reference, email: 'wrong@example.invalid' })).status, 404);
assert.equal((await post('/api/contact', { name: 'Maa Test', email: 'qa@example.invalid', message: 'Synthetic local verification message.', website: '' })).status, 201);
const concurrentKey = crypto.randomUUID();
const concurrent = await Promise.all([post('/api/orders', body, { 'Idempotency-Key': concurrentKey }), post('/api/orders', body, { 'Idempotency-Key': concurrentKey })]);
assert.deepEqual(concurrent.map(x => x.status).sort(), [200, 201]);
assert.equal(concurrent[0].data.order.reference, concurrent[1].data.order.reference);
console.log('PASS: pricing, persistence, idempotency, concurrent replay, validation, origin checks, private tracking, and contact storage.');
