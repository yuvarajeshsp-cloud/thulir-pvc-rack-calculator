const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const math=require('../dist/quote-math.js');
const {calculate,defaults,feetInches}=require('../dist/app.js');
function boot(saved){
 const nodes=new Map();
 function node(){return {innerHTML:'',value:'',dataset:{},classList:{add(){},remove(){}},listeners:{},append(){},addEventListener(type,fn){this.listeners[type]=fn;}};}
 const document={getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},createElement:node,body:node()};
 const storage=new Map([['thulirEstimateV1',JSON.stringify(saved)]]);
 // Rack quantity now lives on Configure; seed it from the saved estimate as the one-time migration does.
 const values={...defaults,racks:saved.rackQuantity||1};const window={RackQuoteMath:math,currentRack:{values,model:calculate(values)},addEventListener(){},print(){}};
 const ctx={window,document,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},Intl,feetInches};
 vm.runInNewContext(fs.readFileSync(require.resolve('../dist/estimate.js'),'utf8'),ctx);
 return {nodes,storage,window};
}
test('estimate screen and print use the same saved pricing and quantity',()=>{
 const {nodes,storage}=boot({profit:20,installation:500,rackQuantity:3,prices:{'stock-6.096':0,joint3:100,joint4:0,joint5:0,'stock-3':999},stockCatalogue:{'stock-3':{id:'stock-3',label:'PVC stock pipe · 9.84 ft'}},customer:'Existing customer',extra:[]});
 assert.match(nodes.get('priceRows').innerHTML,/4 × 3 = 12/);
 assert.match(nodes.get('priceRows').innerHTML,/₹120.00/);
 assert.match(nodes.get('quoteTotals').innerHTML,/₹2,940.00/);
 assert.doesNotMatch(nodes.get('catalogueRows').innerHTML,/9.84|stock-3/);
 nodes.get('printEstimate').onclick();
 const print=nodes.get('customerEstimatePrint').innerHTML;
 assert.match(print,/₹2,940.00/);assert.match(print,/₹1,500.00/);assert.match(print,/₹1,440.00/);assert.match(print,/4 × 3 = 12/);assert.match(print,/Existing customer/);
 assert.equal(JSON.parse(storage.get('thulirEstimateV1')).prices['stock-3'],undefined);
});
test('screen, print and reload keep extras estimate-wide',()=>{
 const saved={profit:20,installation:500,rackQuantity:3,prices:{'stock-6.096':0,joint3:100,joint4:0,joint5:0,delivery:200},extra:[{id:'delivery',qty:1,label:'Delivery',unit:'each'}]};
 const {nodes,storage}=boot(saved);
 assert.match(nodes.get('quoteTotals').innerHTML,/₹3,140.00/);
 nodes.get('printEstimate').onclick();
 assert.match(nodes.get('customerEstimatePrint').innerHTML,/1 each · estimate-wide/);
 assert.match(nodes.get('customerEstimatePrint').innerHTML,/₹3,140.00/);
 const reloaded=boot(JSON.parse(storage.get('thulirEstimateV1')));
 assert.match(reloaded.nodes.get('quoteTotals').innerHTML,/₹3,140.00/);
});
test('rack plans retain connector and equipment counts across power switches',()=>{
 for(const layout of ['vertical','step']){
  const v={...defaults,layout,fans:true,lights:true,irrigation:true};
  const a=calculate(v),b=calculate({...v,fansOn:false,lightsOn:false,sprinklerOn:false});
  assert.deepEqual(a.equipment.bill,b.equipment.bill);
  assert.deepEqual(a.cuts,b.cuts);
  assert.ok(a.cuts.length>0);assert.ok(a.joints.length>0);
  assert.ok(a.cuts.every(c=>Number.isFinite(c.cut)&&c.cut>0));
 }
});
test('estimate quantity follows the configured number of racks',()=>{
 const {nodes}=boot({profit:20,installation:500,rackQuantity:2,prices:{'stock-6.096':0,joint3:100,joint4:0,joint5:0},extra:[]});
 assert.match(nodes.get('priceRows').innerHTML,/4 × 2 = 8/);
 assert.equal(String(nodes.get('quoteRackQuantity').value),'2');
});
test('rack plan geometry is per rack and independent of the rack quantity',()=>{
 const one=calculate({...defaults,racks:1}),five=calculate({...defaults,racks:5});
 assert.deepEqual(one.cuts,five.cuts);assert.deepEqual(one.counts,five.counts);assert.deepEqual(one.equipment.bill,five.equipment.bill);
});
