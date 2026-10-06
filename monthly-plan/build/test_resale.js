// Resale: a reseller's items, lots, sales, returns and true profit. Money in cents.
const path=require('path'),{extractImportTo}=require('./extract.js');
module.exports=({eq,ok})=>{
  const {Resale:R}=require(extractImportTo(path.join(__dirname,'../app/DebtFreePlan.html'),path.join(__dirname,'import.resale.js')));
  const ebay=R.plat({},'ebay');
  eq('resale: eBay fee on price + shipping, plus the per-order fee',R.estFee(ebay,4500,800),Math.round(5300*ebay.pct/10000)+ebay.fixed);
  eq('resale: Poshmark under $15 is a flat fee',R.estFee(R.plat({},'poshmark'),1200),295);
  eq('resale: Poshmark over $15 is a share',R.estFee(R.plat({},'poshmark'),3000),600);
  eq('resale: local sales cost nothing',R.estFee(R.plat({},'local'),3000,0),0);
  const jacket={id:'j',title:'Wool jacket',qty:1,cost:1000,bought:'2026-03-02',listed:'2026-03-05'};
  const s1={id:'s1',item:'j',date:'2026-03-25',plat:'ebay',qty:1,price:4500,ship:800,fee:761,label:650,other:0};
  let S={items:[jacket],sales:[s1]};
  let x=R.sale(S,s1);
  eq('resale: profit = price + shipping − fees − label − cost',x.profit,4500+800-761-650-1000);
  eq('resale: ROI is profit over cost',Math.round(x.roi*100),Math.round(x.profit/1000*100));
  eq('resale: days to sell count from listing',x.days,20);
  eq('resale: a sold single item has nothing left',R.item(S,jacket,'2026-04-01').left,0);
  eq('resale: and reads as sold',R.item(S,jacket,'2026-04-01').status,'sold');
  // a return that comes back to stock: the cost isn't spent, the refund and the lost label are
  const s1r={...s1,ret:{date:'2026-04-03',refund:5300,back:true,feeBack:721}};S={items:[jacket],sales:[s1r]};x=R.sale(S,s1r);
  eq('resale: return to stock: profit is only what the return cost',x.profit,4500+800-761-650-5300+721);
  eq('resale: returned item is back on the shelf',R.onHand(S,jacket,'2026-04-05'),1);
  eq('resale: …but not before the return date',R.onHand(S,jacket,'2026-04-01'),0);
  eq('resale: back in stock is listed again',R.item(S,jacket,'2026-04-05').status,'listed');
  const s1n={...s1,ret:{date:'2026-04-03',refund:2000,back:false,feeBack:0}};x=R.sale({items:[jacket]},s1n);
  eq('resale: partial refund, item kept by the buyer: cost still spent',x.profit,4500+800-761-650-1000-2000);
  // lots: one price for many items, split to the cent
  const lot={id:'L',name:'Estate sale bin',cost:1000,date:'2026-05-01',split:'even'},a={id:'a',qty:1,lot:'L',bought:'2026-05-01'},b={id:'b',qty:1,lot:'L',bought:'2026-05-01'},c={id:'c',qty:1,lot:'L',bought:'2026-05-01'};
  let C=R.costs({items:[a,b,c],lots:[lot]});
  eq('resale: a lot splits to the cent',C.get('a')+C.get('b')+C.get('c'),1000);
  ok('resale: even split is within a cent',Math.max(C.get('a'),C.get('b'),C.get('c'))-Math.min(C.get('a'),C.get('b'),C.get('c'))<=1);
  C=R.costs({items:[{...a,list:3000},{...b,list:1000},{...c,list:1000}],lots:[{...lot,split:'list'}]});
  eq('resale: split by list price weights the dearer item',C.get('a'),600);
  C=R.costs({items:[{...a,list:3000},{...b},{...c,list:1000}],lots:[{...lot,split:'list'}]});
  eq('resale: by list price falls back to even when a price is missing',C.get('a')+C.get('b')+C.get('c'),1000);
  // several identical units
  const socks={id:'k',title:'Wool socks',qty:10,cost:2000,bought:'2026-01-10'},s2={id:'s2',item:'k',date:'2026-02-01',plat:'local',qty:3,price:1500,ship:0,fee:0,label:0};
  S={items:[socks],sales:[s2]};
  eq('resale: a multi-unit sale costs its share',R.sale(S,s2).cogs,600);
  eq('resale: units left',R.item(S,socks,'2026-02-02').left,7);
  eq('resale: still unlisted with units left',R.item(S,socks,'2026-02-02').status,'unlisted');
  // profit & loss across dates: the refund lands on the return date
  S={items:[jacket],sales:[s1r]};
  let P=R.pnl(S,'2026-03-01','2026-03-31');
  eq('resale: March P&L: net sales',P.netSales,5300);
  eq('resale: March P&L: cost of goods',P.cogs,1000);
  eq('resale: March P&L: selling costs',P.selling,761+650);
  P=R.pnl(S,'2026-04-01','2026-04-30');
  eq('resale: April P&L: the refund',P.refunds,5300);
  eq('resale: April P&L: the cost comes back with the item',P.cogs,-1000);
  eq('resale: April P&L: fee refunded lowers fees',P.fees,-721);
  P=R.pnl(S,'2026-01-01','2026-12-31');
  eq('resale: the year adds up to the sale’s own profit',P.contribution,R.sale(S,s1r).profit);
  // given away, lost and kept
  const vase={id:'v',title:'Vase',qty:1,cost:800,bought:'2026-02-01',gone:'2026-06-01',status:'donated'},mug={id:'m',title:'Mug',qty:1,cost:300,bought:'2026-02-01',gone:'2026-06-02',status:'kept'};
  S={items:[vase,mug]};P=R.pnl(S,'2026-01-01','2026-12-31');
  eq('resale: a donated item is written off',P.writeOff,800);
  eq('resale: a kept item is not an expense',P.gross,-800);
  eq('resale: written off the day it was bought still counts',R.pnl({items:[{...vase,bought:'2026-06-01'}]},'2026-01-01','2026-12-31').writeOff,800);
  eq('resale: gone items leave the shelf',R.stock(S,'2026-07-01').units,0);
  // Schedule C part III: begin + purchases − personal use − end = cost of goods sold
  const old={id:'o',title:'Lamp',qty:1,cost:1500,bought:'2025-11-01'},sOld={id:'so',item:'o',date:'2026-02-10',plat:'ebay',qty:1,price:4000,ship:0,fee:500,label:700};
  S={items:[old,jacket,socks,vase,mug],sales:[sOld,s1,s2],rate:700,trips:[{id:'t',date:'2026-03-01',miles:10}],exps:[{id:'e',date:'2026-01-15',amount:1299,cat:'software',repeat:'monthly'}]};
  const Y=R.scheduleC(S,2026,'2026-12-31');
  eq('resale: Schedule C beginning inventory is last year’s stock',Y.begin,1500);
  eq('resale: purchases are this year’s buys',Y.purchases,1000+2000+800+300);
  eq('resale: personal use comes off purchases',Y.kept,300);
  eq('resale: ending inventory is what’s left',Y.end,1400);
  const PY=R.pnl(S,'2026-01-01','2026-12-31');
  eq('resale: COGS from inventory matches the sales and write-offs',Y.cogs,PY.cogs+PY.writeOff);
  eq('resale: gross receipts include shipping charged',Y.receipts,4000+4500+800+1500);
  eq('resale: mileage at the rate (10 mi × $0.70)',R.expenses(S,'2026-03-01','2026-03-31').find(x=>x.cat==='car').amount,700);
  eq('resale: a monthly subscription repeats',R.expenses(S,'2026-01-01','2026-12-31').filter(x=>x.cat==='software').length,12);
  ok('resale: car & truck goes on line 9',Y.lines.some(l=>l.key==='car'&&l.line==='9'&&l.amount===700));
  ok('resale: platform fees go on line 10',Y.lines.some(l=>l.key==='fees'&&l.line==='10'&&l.amount===500+761));
  eq('resale: net profit = gross profit − expenses',Y.net,Y.gross-Y.expenses);
  // stock and aging
  const st=R.stock({items:[{...socks},{id:'n',title:'New',qty:1,cost:500,bought:'2026-09-30',listed:'2026-10-01'}],sales:[]},'2026-10-20');
  eq('resale: units on hand',st.units,11);
  eq('resale: stock at cost',st.cost,2500);
  eq('resale: sitting over 90 days',st.stale.length,1);
  eq('resale: aging buckets hold every unit',st.buckets.reduce((a,b)=>a+b.units,0),11);
  // platforms side by side
  S={items:[old,jacket,socks],sales:[sOld,s1,s2]};
  const pl=R.platforms(S,'2026-01-01','2026-12-31'),eb=pl.find(p=>p.id==='ebay');
  eq('resale: eBay sales counted',eb.count,2);
  eq('resale: eBay fee share',Math.round(eb.feePct*1000),Math.round((500+761)/(4000+5300)*1000));
  ok('resale: platforms with no sales are left out',!pl.some(p=>p.id==='depop'));
  eq('resale: next SKU follows the highest',R.nextSku([{sku:'A-0009'},{sku:'A-0012'},{sku:'B-0100'}],'A-'),'A-0013');
  eq('resale: first SKU',R.nextSku([],''),'0001');
  eq('resale: guesses packaging',R.guess('ULINE poly mailers 100ct'),'supplies');
  eq('resale: guesses postage',R.guess('USPS Click-N-Ship'),'postage');
  eq('resale: guesses crosslisting software',R.guess('Vendoo monthly'),'software');
  eq('resale: first month with anything in it',R.firstMonth(S),'2025-11');
};
