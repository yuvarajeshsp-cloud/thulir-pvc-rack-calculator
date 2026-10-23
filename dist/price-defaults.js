/* Research reviewed 16 October 2026; Thulir's own supplier prices added 23 October 2026. Editable defaults, not live quotations. */
(function(root){
const data={
 'stock-6.096':[350,'Your supplier price','1-inch PVC pipe, 20 ft length: Thulir actual component price ₹350, updated 23 Oct 2026.',null,'23 Oct 2026'],
 joint3:[19,'Your supplier price','1-inch 3-way PVC fitting: Thulir actual component price ₹19, updated 23 Oct 2026.',null,'23 Oct 2026'],
 jointT:[13,'Your supplier price','1-inch PVC equal tee: Thulir actual component price ₹13, updated 23 Oct 2026.',null,'23 Oct 2026'],
 jointX:[22,'Your supplier price','1-inch PVC cross T: Thulir actual component price ₹22, updated 23 Oct 2026.',null,'23 Oct 2026'],
 joint4:[37,'Your supplier price','1-inch 4-way side-outlet PVC fitting: Thulir actual component price ₹37, updated 23 Oct 2026.',null,'23 Oct 2026'],
 joint5:[54,'Your supplier price','1-inch 5-way PVC fitting: Thulir actual component price ₹54, updated 23 Oct 2026.',null,'23 Oct 2026'],
 plug:[25,'Allowance','Planning allowance for a socket-fitting plug. A pipe end cap is a different fitting; match the actual socket. No exact supplier quote verified.',null],
 driptotal:[1200,'Your supplier price','Drip irrigation, total per rack: Thulir actual component price ₹1200, updated 23 Oct 2026.',null,'23 Oct 2026'],
 footcap:[17,'Your supplier price','1-inch PVC end cap: Thulir actual component price ₹17, updated 23 Oct 2026.',null,'23 Oct 2026'],
 mesh:[200,'Derived allowance','2 × 4 ft panel: Chennai supplier reference ₹15/sq ft × 8 = ₹120; ₹80 allowed for small-quantity cutting/finishing. ₹200 total is a budget, not a panel quote. Confirm gauge and support.','https://www.wiremeshindustries.com/weld-mesh.html'],
 tray:[175,'Pack conversion','Microgreen Studio 1020 tray set ₹350, with-hole + without-hole. Budget allocation ₹175 per physical tray; supplier sells the set. Four physical trays per shelf in this calculator; add additional bottom trays if required.','https://microgreenstudio.com/products/microgreens-growing-tray'],
 fan:[300,'Your supplier price','120 mm PC fan: Thulir actual component price ₹300, updated 23 Oct 2026.',null,'23 Oct 2026'],
 fanmount:[50,'Allowance','₹50 per locally made fan bracket and fasteners. Fabrication allowance; no exact matching supplier quote.',null],
 fanpower:[750,'Derived allowance','Reference adapter: Robocraze 12 V 5 A ₹549 incl. GST, shown out of stock. ₹201 allowed for distribution/connectors. Confirm supply capacity for actual fan load; not a verified kit quote.','https://robocraze.com/products/12v-5a-60w-smps-ac-dc-power-supply-adapter'],
 led2:[130,'Your supplier price','2 ft LED grow light: Thulir actual component price ₹130, updated 23 Oct 2026.',null,'23 Oct 2026'],
 led4:[150,'Your supplier price','4 ft LED grow light: Thulir actual component price ₹150, updated 23 Oct 2026.',null,'23 Oct 2026'],
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
 return {value:Math.round(entry[0]*factor*100)/100,kind:entry[1],note:entry[2]+(Math.abs(factor-1)>.0001?' Initial allowance scaled to the configured length/area; confirm actual supplier rate.':''),url:entry[3],reviewed:entry[4]||'16 Oct 2026'};
}
const api={get,ids:Object.keys(data)};if(typeof module!=='undefined')module.exports=api;else root.RackPriceDefaults=api;
})(typeof window==='undefined'?globalThis:window);
