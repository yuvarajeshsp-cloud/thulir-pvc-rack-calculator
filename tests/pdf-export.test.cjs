const test=require('node:test');
const assert=require('node:assert/strict');
const {txt}=require('../dist/pdf-export.js');

test('PDF text is reduced to characters the standard PDF fonts can draw',()=>{
 assert.equal(txt('₹1,200 − 4 × 3 · Tom &amp; Co'),'Rs 1,200 - 4 × 3 · Tom & Co');
 assert.equal(txt('Fan 🌱 “quote”'),'Fan  "quote"');
 assert.equal(txt(null),'');
});
