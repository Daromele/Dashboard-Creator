// Handmade: materials, recipes, batches, sales, adjustments and events, with stock replayed from movements. Cents.
const path=require('path'),{extractImportTo}=require('./extract.js');
module.exports=({eq,ok})=>{
  const {Handmade:H}=require(extractImportTo(path.join(__dirname,'../app/DebtFreePlan.html'),path.join(__dirname,'import.handmade.js')));
  const wax={id:'wax',name:'Soy wax',unit:'lb',reorder:5},jar={id:'jar',name:'Amber jar 8 oz',unit:'each',reorder:12},oil={id:'oil',name:'Fragrance oil',unit:'oz'};
  const candle={id:'c',name:'Cedar candle',price:2800,labor:15,pack:40,bom:[{m:'wax',q:0.5},{m:'jar',q:1},{m:'oil',q:0.6}]};
  const buys=[{id:'b1',mat:'wax',date:'2026-01-05',qty:10,cost:2000},{id:'b2',mat:'jar',date:'2026-01-05',qty:24,cost:3600},{id:'b3',mat:'oil',date:'2026-01-06',qty:16,cost:3200},{id:'b4',mat:'wax',date:'2026-02-01',qty:10,cost:3000}];
  let S={mats:[wax,jar,oil],prods:[candle],buys,rate:2000};
  let L=H.replay(S);
  eq('handmade: stock is the sum of purchases',L.mats.get('wax').qty,20);
  eq('handmade: moving average cost per unit',Math.round(L.mats.get('wax').avg),250);
  eq('handmade: one piece’s materials and packaging',Math.round(H.bomUnit(S,candle,null,L.mats)),Math.round(0.5*250+150+0.6*200+40));
  const pr=H.pricing(S,candle,L);
  eq('handmade: labor at the hourly rate',pr.labor,500);
  eq('handmade: classic formula: wholesale is twice the cost',pr.wholesale,pr.cost*2);
  eq('handmade: can make, limited by the scarcest material',H.canMake(S,candle,L),Math.min(Math.floor(20/0.5),24,Math.floor(16/0.6)));
  // a batch made in January uses January's average; one in February the new one
  const b1={id:'m1',prod:'c',date:'2026-01-10',qty:10,bom:candle.bom,pack:40},b2={id:'m2',prod:'c',date:'2026-02-10',qty:10,bom:candle.bom,pack:40};
  S={...S,batches:[b1,b2]};L=H.replay(S);
  eq('handmade: January batch cost',L.batch.get('m1').cost,Math.round(10*(0.5*200+150+0.6*200+40)));
  ok('handmade: February batch costs more (dearer wax)',L.batch.get('m2').cost>L.batch.get('m1').cost);
  eq('handmade: materials left after two batches',L.mats.get('wax').qty,10);
  eq('handmade: finished pieces in stock',L.prods.get('c').qty,20);
  // sales take pieces out at their average cost
  const s1={id:'s1',prod:'c',date:'2026-02-20',qty:3,chan:'etsy',price:8400,ship:0,fee:H.estFee(H.chan({},'etsy'),8400),label:450};
  S={...S,sales:[s1]};L=H.replay(S);
  eq('handmade: pieces left',L.prods.get('c').qty,17);
  eq('handmade: cost of the pieces sold',L.cogs.get('s1'),Math.round(3*(L.batch.get('m1').cost+L.batch.get('m2').cost)/20));
  const x=H.sale(S,s1,L);eq('handmade: true profit of a sale',x.profit,8400-s1.fee-450-L.cogs.get('s1'));
  // a return to stock gives the cost back
  S={...S,sales:[{...s1,ret:{date:'2026-03-01',refund:2800,back:true}}]};L=H.replay(S);
  eq('handmade: a returned piece is back',L.prods.get('c').qty,20);
  // adjustments never vanish: each has a value, and personal use is kept apart
  S={...S,adj:[{id:'a1',mat:'jar',date:'2026-03-02',qty:-2,reason:'damaged'},{id:'a2',prod:'c',date:'2026-03-03',qty:-1,reason:'personal'},{id:'a3',mat:'wax',date:'2026-03-04',qty:1.5,reason:'found'}]};L=H.replay(S);
  eq('handmade: two broken jars written off at their cost',L.adjVal.get('a1'),-300);
  eq('handmade: jars left',L.mats.get('jar').qty,2);
  const P=H.pnl(S,'2026-03-01','2026-03-31',undefined,L);
  eq('handmade: write-off in the P&L (damaged − found)',P.writeOff,300-L.adjVal.get('a3'));
  ok('handmade: kept for myself is not a business cost',P.personal>0&&P.writeOff<P.writeOff+P.personal);
  // the audit trail adds up to the stock
  const hist=H.history(S,'jar',L);
  eq('handmade: history ends at the stock on hand',hist.at(-1).bal,L.mats.get('jar').qty);
  eq('handmade: every movement listed',hist.length,1+2+1);
  // using more than you have is flagged, not hidden
  S={...S,batches:[...S.batches,{id:'m3',prod:'c',date:'2026-03-10',qty:5,bom:candle.bom,pack:40}]};L=H.replay(S);
  ok('handmade: a batch short of jars is flagged',L.batch.get('m3').short.some(z=>z.m==='jar'&&z.short===3));
  eq('handmade: negative stock shows',H.stock(S,L).negative.length,1);
  // restock and planning for an event
  const fair={id:'e1',name:'Holiday market',date:'2026-12-05',booth:7500,costs:[{d:'Tent weights',a:2500}],plan:[{prod:'c',planned:30,taken:0}]};
  const R=H.restock({...S,events:[fair]},'2026-11-01',L);
  ok('handmade: jars below their reorder point',R.low.some(r=>r.m.id==='jar'));
  ok('handmade: the event needs more candles made',R.toMake.some(t=>t.prod==='c'&&t.qty>0));
  ok('handmade: and materials for them',R.need.some(n=>n.m==='jar'&&n.short>0));
  // an event's real profit
  const S2={...S,events:[{...fair,date:'2026-03-15',plan:[{prod:'c',planned:20,taken:15}],hours:8}],sales:[...S.sales,{id:'f1',prod:'c',date:'2026-03-15',qty:6,chan:'fair',event:'e1',price:16800,fee:0,label:0},{id:'f2',prod:'c',date:'2026-03-15',qty:2,chan:'fair',event:'e1',price:5600,fee:180}]};
  const L2=H.replay(S2),E=H.event(S2,S2.events[0],L2);
  eq('handmade: event sold count',E.sold,8);eq('handmade: left over',E.prods[0].left,7);
  eq('handmade: event profit after booth, costs, fees and pieces',E.profit,16800+5600-180-10000-L2.cogs.get('f1')-L2.cogs.get('f2'));
  eq('handmade: sell-through',Math.round(E.sellThrough*100),53);
  eq('handmade: booth and costs count in the P&L',H.pnl(S2,'2026-03-01','2026-03-31',undefined,L2).events,10000);
  eq('handmade: guesses shipping supplies',H.guess('Poly mailers 100'),'shipsup');
  eq('handmade: next SKU',H.nextSku([{sku:'CND-007'}],'CND-'),'CND-008');
  eq('handmade: expense repeats monthly',H.expenses({exps:[{id:'x',date:'2026-01-03',amount:1000,cat:'software',repeat:'monthly'}]},'2026-01-01','2026-06-30').length,6);
};
