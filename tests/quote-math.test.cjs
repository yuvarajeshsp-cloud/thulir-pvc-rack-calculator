const test = require('node:test');
const assert = require('node:assert/strict');
const q = require('../www/quote-math.js');

test('markup is applied to every customer unit rate and scaled across racks', () => {
  const s = q.calculate({
    rows: [{id:'pipe', qty:2, label:'Pipe'}, {id:'fan', qty:1, label:'Fan'}],
    prices: {pipe:100, fan:250},
    profit:20, rackQuantity:3, installation:250, discount:70, tax:18
  });
  assert.deepEqual(s.lines.map(x=>[x.totalQty,x.unitRate,x.amount]), [[6,120,720],[3,300,900]]);
  assert.equal(s.componentSubtotal,1620);
  assert.equal(s.markupIncluded,270);
  assert.equal(s.installationTotal,750);
  assert.equal(s.subtotal,2370);
  assert.equal(s.discount,70);
  assert.equal(s.tax,414);
  assert.equal(s.total,2714);
});

test('legacy configuration uses one rack, no markup and no installation', () => {
  const s = q.calculate({rows:[{id:'tray',qty:4}],prices:{tray:50}});
  assert.equal(s.quantity,1);
  assert.equal(s.lines[0].totalQty,4);
  assert.equal(s.lines[0].unitRate,50);
  assert.equal(s.total,200);
});

test('unpriced lines remain flagged; explicit zero is a valid price', () => {
  const s = q.calculate({rows:[{id:'unknown',qty:2},{id:'free',qty:3},{id:'ignored',qty:0}],prices:{free:0},rackQuantity:2});
  assert.equal(s.missing,1);
  assert.equal(s.lines[0].amount,null);
  assert.equal(s.lines[1].amount,0);
  assert.equal(s.total,0);
});

test('quantity and discount are clamped and tax is never charged on negatives', () => {
  const s = q.calculate({rows:[{id:'a',qty:1}],prices:{a:100},rackQuantity:-2,discount:10000,tax:120});
  assert.equal(s.quantity,1);
  assert.equal(s.discount,100);
  assert.equal(s.tax,0);
  assert.equal(s.total,0);
  assert.equal(q.quantity(2.9),2);
  assert.equal(q.quantity(10000),999);
});

test('selling-rate calculation rounds currency and only once in line totals', () => {
  const s = q.calculate({rows:[{id:'item',qty:3}],prices:{item:19.99},profit:15,rackQuantity:2});
  assert.equal(s.lines[0].unitRate,22.99);
  assert.equal(s.lines[0].amount,137.94);
  assert.equal(s.total,137.94);
});
