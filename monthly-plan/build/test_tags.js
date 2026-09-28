// Tags, run from test.js: a tag groups channels (Etsy, Payhip → Digital products); a transaction
// takes its channel's tag unless it has its own. Synthetic data only.
const path=require('path'),{extractTo}=require('./extract.js');
module.exports=({eq,ok})=>{
  const B=require(extractTo(path.join(__dirname,'../app/ProfitPlanBusiness.html'),path.join(__dirname,'budget.business.js')));
  eq('blank business planner has no tags yet', B.blank().tags, []);
  const s=B.blank(),tx=(id,category,amount,extra={})=>({id,date:'2026-09-10',category,amount,note:id,...extra});
  s.tags=[{id:'tg-dig',name:'Digital products'},{id:'tg-don',name:'Donations'}];
  s.channels=[{id:'ch-etsy',name:'Etsy',tag:'tg-dig'},{id:'ch-payhip',name:'Payhip',tag:'tg-dig'},{id:'ch-pat',name:'Patreon',tag:'tg-don'},{id:'ch-web',name:'Web shop'}];
  s.transactions=[tx('a','product-sales',10000,{channel:'ch-etsy'}),tx('b','product-sales',5000,{channel:'ch-payhip'}),tx('c','client-work',3000,{channel:'ch-pat'}),
    tx('d','product-sales',2000,{channel:'ch-web'}),tx('e','software',1500,{tag:'tg-dig'}),tx('f','software',700),tx('g','product-sales',-1000,{channel:'ch-etsy'}),tx('h','client-work',400,{channel:'ch-etsy',tag:'tg-don'})];
  const V=B.validate(JSON.parse(JSON.stringify(s))),T=id=>B.tagOf(V,V.transactions.find(t=>t.id===id));
  eq('tag: own, else the channel’s, else none', ['a','c','d','e','f','h'].map(T), ['tg-dig','tg-don','','tg-dig','','tg-don']);
  eq('revenue by tag, refunds netted', B.breakdown(V,'2026-09-01','2026-09-30','income','tag').map(r=>[r.name,r.amount]), [['Digital products',14000],['Donations',3400],['',2000]]);
  eq('expenses by tag, a cost tagged directly', B.breakdown(V,'2026-09-01','2026-09-30','expense','tag').map(r=>[r.name,r.amount]), [['Digital products',1500],['',700]]);
  eq('revenue by channel', B.breakdown(V,'2026-09-01','2026-09-30','income','channel').map(r=>[r.name,r.amount]), [['Etsy',9400],['Payhip',5000],['Patreon',3000],['Web shop',2000]]);
  eq('outside the dates, nothing', B.breakdown(V,'2026-10-01','2026-10-31','income','tag'), []);
  const bad=JSON.parse(JSON.stringify(s));bad.tags.push({id:'tg-x',name:'digital PRODUCTS'},{id:'',name:'x'},'nope');bad.channels[3].tag='gone';bad.transactions[5].tag='gone';
  const W=B.validate(bad);
  eq('bad tags are dropped, never fatal', [W.tags.map(g=>g.id),'tag' in W.channels[3],'tag' in W.transactions[5]], [['tg-dig','tg-don'],false,false]);
  const col=JSON.parse(JSON.stringify(s));col.tags[0].color=3;col.tags[1].color=9;const C=B.validate(col);
  eq('a tag keeps a colour 1–8; anything else is dropped', [C.tags[0].color,'color' in C.tags[1]], [3,false]);
  const old=JSON.parse(JSON.stringify(s));delete old.tags;ok('an older backup without tags restores',!!B.validate(old)&&Array.isArray(B.validate(JSON.parse(JSON.stringify(old))).tags));
};
