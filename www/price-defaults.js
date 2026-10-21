/* Research reviewed 16 October 2026. Budget inputs, not live supplier quotations. */
(function(root){
const data={
 'stock-6.096':[650,'Allowance','Reference: Ashirvad 1-inch SCH40, 6 m at ₹542 before GST. ₹650 is a rounded purchase-cost allowance for 20 ft, not a listed 20 ft price. 6 m is only 19 ft 8.22 in; confirm actual stock length before cutting.','https://www.artradingcompany.com/products/ashirvad-upvc-pipe-sch40-6m-1'],
 joint3:[110,'Listed / pack conversion','Vikon 1-inch 3-way: ₹220 for 2 pieces = ₹110 each. Listed pack tax-inclusive price; shipping extra.','https://vikon.in/index.php?product_id=1108&route=product/product'],
 joint4:[120,'Listed / pack conversion','Vikon 1-inch side-outlet 4-way: ₹240 for 2 pieces = ₹120 each. This is the corner side-outlet connector, not the flat cross.','https://vikon.in/index.php?product_id=1110&route=product/product'],
 joint5:[140,'Listed','Vikon 1-inch 5-way ₹140 each; listed as pre-order with advance payment. Confirm availability and shipping.','https://vikon.in/index.php?product_id=1111&route=product/product'],
 plug:[25,'Allowance','Planning allowance for a socket-fitting plug. A pipe end cap is a different fitting; match the actual socket. No exact supplier quote verified.',null],
 footcap:[24,'Listed','Mykit Star 1-inch UPVC end cap ₹24 inclusive of taxes. Confirm pipe fit.','https://mykit.in/star-upvc-end-cap-25-mm-1-inch'],
 mesh:[200,'Derived allowance','2 × 4 ft panel: Chennai supplier reference ₹15/sq ft × 8 = ₹120; ₹80 allowed for small-quantity cutting/finishing. ₹200 total is a budget, not a panel quote. Confirm gauge and support.','https://www.wiremeshindustries.com/weld-mesh.html'],
 tray:[175,'Pack conversion','Microgreen Studio 1020 tray set ₹350, with-hole + without-hole. Budget allocation ₹175 per physical tray; supplier sells the set. Four physical trays per shelf in this calculator; add additional bottom trays if required.','https://microgreenstudio.com/products/microgreens-growing-tray'],
 fan:[599,'Listed','POWERX 120 × 120 × 25 mm, 12 V, 7-blade fan ₹599. Tax treatment and delivery need checkout confirmation.','https://www.power-x.in/products/powerx-120mm-7-blade-normal-cooling-fan-black'],
 fanmount:[50,'Allowance','₹50 per locally made fan bracket and fasteners. Fabrication allowance; no exact matching supplier quote.',null],
 fanpower:[750,'Derived allowance','Reference adapter: Robocraze 12 V 5 A ₹549 incl. GST, shown out of stock. ₹201 allowed for distribution/connectors. Confirm supply capacity for actual fan load; not a verified kit quote.','https://robocraze.com/products/12v-5a-60w-smps-ac-dc-power-supply-adapter'],
 led2:[800,'Historical benchmark','2 ft Fluortronix two-pack recorded at ₹1,475 on 25 Jul 2025 (₹737.50 each). ₹800 each is a rounded budget; current seller price not verified.','https://price-history.in/product/fluortronix-high-efficiency-blooming-white-plant-aYGiZmmb'],
 led4:[1000,'Historical benchmark','4 ft Fluortronix two-pack recorded at ₹1,875 on 25 Sep 2025 (₹937.50 each). ₹1,000 each is a rounded budget; current seller price not verified.','https://price-history.in/product/fluortronix-blooming-white-4ft-20w-plant-UzCFZkmb'],
 lightclips:[20,'Allowance','₹20 per pair of mounting clips/fasteners. Set to zero if the selected LED package includes suitable clips.',null],
 lightchannel:[150,'Allowance','₹150 per 4 ft mounting channel, material plus cutting. Local fabrication budget; confirm dimensions and rate.',null],
 lightpower:[1000,'Allowance','₹1,000 for a light timer, plugs and distribution enclosure. Budget only; assumes lights with integrated drivers. Add a suitable external driver if required.',null],
 cable:[19,'Derived allowance','Polycab 0.75 sq mm 2-core reference ₹51/m + ₹9.18 GST = ₹60.18/m, or ₹18.34/ft, rounded to ₹19/ft. Rate benchmark only: select cable/earthing to actual equipment.','https://manibhadraenterprises.com/Polycab-0-75-Sqmm-2-Core-Copper-Flexible-Cable/'],
 cableclips:[3,'Allowance','₹3 per clip / tie and small fastener. Small-quantity allowance, not a verified supplier quote.',null],
 nozzle:[15,'Derived allowance','WaterSun adjustable 4 mm mist nozzle: ₹1,160 incl. GST for 100 = ₹11.60 each. ₹15 allows a small-quantity purchase; pack cost and working pressure need confirmation.','https://www.toolsvilla.com/adjustable-nozzel-with-4mm-pin'],
 tube:[3,'Derived allowance','Toolsvilla 4 mm tubing ₹470/100 m incl. GST = ₹1.43/ft; ₹3/ft allowed for short lengths. Verify tubing bore, pressure and flow; larger main lines may cost more.','https://www.toolsvilla.com/4-mm-online-drip-pipe-of-100-meter'],
 watertee:[11,'Pack conversion','Pinolex 4 mm tee ₹329 for 30 = ₹10.97 each, rounded to ₹11. Match the selected main/branch tubing sizes.','https://pinolex.in/store/shop/drip-low-volume/drippers-emitters-microsprays/pinolex-garden-irrigation-14-barb-drip-tee-bulk-connector-pack-of-30/'],
 watercap:[3,'Allowance','₹3 per tubing end plug for small-quantity purchasing. No exact retail quote verified; match tubing size.',null],
 valve:[35,'Allowance','₹35 per small irrigation flow-control valve. Budget only; confirm compatible size and working pressure.',null],
 waterclips:[3,'Allowance','₹3 per tubing clip / tie. Small-quantity allowance, not a verified supplier quote.',null],
 irrigationsource:[4500,'Derived allowance','RainPoint 1-zone timer listed ₹3,700; ₹800 allowed for filter, regulator and inlet adapters. ₹4,500 is a provisional kit budget. Excludes tank, pump, shipping and installation; verify timer interval and nozzle pressure.','https://rainpoint.in/index.php/product/rainpoint-itv105-mini-digital-sprinkler-timer-1-zone-hose-water-timer/']
};
function get(id,v={width:4,depth:2}){
 let entry=data[id],factor=1;
 if(id.startsWith('stock-')){const metres=Number(id.slice(6));if(!Number.isFinite(metres)||metres<=0)return null;entry=data['stock-6.096'];factor=metres/6.096;}
 if(!entry)return null;
 if(id==='mesh')factor=v.width*v.depth/8;
 if(id==='lightchannel')factor=v.width/4;
 return {value:Math.round(entry[0]*factor*100)/100,kind:entry[1],note:entry[2]+(Math.abs(factor-1)>.0001?' Initial allowance scaled to the configured length/area; confirm actual supplier rate.':''),url:entry[3],reviewed:'16 Oct 2026'};
}
const api={get,ids:Object.keys(data)};if(typeof module!=='undefined')module.exports=api;else root.RackPriceDefaults=api;
})(typeof window==='undefined'?globalThis:window);
