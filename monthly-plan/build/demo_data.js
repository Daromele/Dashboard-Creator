// Realistic demo files for three made-up Etsy shops, in Etsy's own export layouts, for the listing video.
// Every name, address and number is invented. Files agree with each other the way Etsy's do: the same
// order IDs in the statement and the sold order items, listing IDs that only go up, payouts that match
// the statement to the cent, and reviews on real orders.
//
//   node build/demo_data.js [out-dir]      (default: listing-kit/demo-data)
const fs=require('fs'),path=require('path');
const OUT=process.argv[2]||path.join(__dirname,'../listing-kit/demo-data');
const END='2026-09-27',START='2025-01-01';

// ---------- a seeded random source, so the files are the same every run ----------
let seed=20260927;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const pick=a=>a[Math.floor(rnd()*a.length)],chance=p=>rnd()<p,between=(a,b)=>a+rnd()*(b-a);
const weighted=list=>{const t=list.reduce((n,x)=>n+x[1],0);let r=rnd()*t;for(const x of list){r-=x[1];if(r<=0)return x[0];}return list[0][0];};
const poisson=l=>{let L=Math.exp(-l),k=0,p=1;do{k++;p*=rnd();}while(p>L);return k-1;};

// ---------- dates and money ----------
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT=MONTHS.map(m=>m.slice(0,3));
const addDays=(d,n)=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);};
const long=d=>`${MONTHS[+d.slice(5,7)-1]} ${+d.slice(8)}, ${d.slice(0,4)}`;
const shortD=d=>`${SHORT[+d.slice(5,7)-1]} ${+d.slice(8)}, ${d.slice(0,4)}`;
const mdy=d=>`${d.slice(5,7)}/${d.slice(8)}/${d.slice(2,4)}`;
const mdyy=d=>`${d.slice(5,7)}/${d.slice(8)}/${d.slice(0,4)}`;
const weekday=d=>new Date(d+'T12:00:00Z').getUTCDay();
const usd=c=>(c<0?'-':'')+'$'+(Math.abs(c)/100).toFixed(2);
const plain=c=>(c/100).toFixed(2);
const q=v=>{const s=String(v??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
const csv=rows=>rows.map(r=>r.map(q).join(',')).join('\n')+'\n';

// ---------- people and places (all invented) ----------
const FIRST=['Amelia','Ben','Chloe','Daniel','Ella','Finn','Grace','Hannah','Isaac','Jade','Kai','Leah','Maya','Noah','Olivia','Priya','Quinn','Rosa','Sam','Tessa','Uma','Violet','Will','Yara','Zoe','Aiden','Bella','Caleb','Dana','Eli','Freya','Gabe','Holly','Ivy','Jonah','Kira','Luca','Mila','Nate','Opal','Paige','Reid','Sofia','Theo','Una','Vince','Wren','Xander','Yusuf','Zara','Harper','Lena','Marcus','Nina','Owen','Pia','Ruby','Silas','Tara','Iris'];
const LAST=['Adler','Brooks','Carver','Dalton','Ellis','Fischer','Garner','Hale','Ingram','Jensen','Keller','Lowry','Marsh','Nolan','Oakes','Pryor','Quill','Ramsey','Sutton','Thorne','Upton','Vance','Walsh','Yates','Zeller','Abbott','Bishop','Crane','Dunn','Emery','Frost','Greer','Hardy','Irwin','Joyce','Kerr','Lyle','Moss','Nash','Orr','Pike','Reese','Shaw','Tate','Wade'];
const STREETS=['Maple Demo Ave','Sample Street','Placeholder Rd','Example Lane','Fictional Blvd','Mockup Way'];
const COUNTRY={
 physical:[['United States',70],['Canada',8],['United Kingdom',6],['Australia',5],['Germany',3],['France',2],['Netherlands',2],['Ireland',1],['New Zealand',1],['Sweden',1],['Japan',1]],
 digital:[['United States',54],['United Kingdom',10],['Canada',8],['Australia',7],['Germany',4],['Netherlands',3],['France',2],['Ireland',2],['New Zealand',2],['Philippines',2],['Singapore',1],['South Africa',1],['Spain',1],['Italy',1],['Sweden',1],['Mexico',1]],
};
const VAT_RATE={'United Kingdom':20,Germany:19,Netherlands:21,France:20,Ireland:23,Spain:21,Italy:22,Sweden:25};
const REVIEWS={
 5:['Absolutely beautiful, even better in person!','Arrived quickly and so well packed.','Perfect gift, my sister loved it.','Exactly as pictured. Will order again!','Gorgeous quality, thank you so much.','So easy to use and looks amazing.','Fast delivery and lovely packaging.','Better than I hoped. Five stars!','Exactly what I needed. Saved me so much time.','Beautiful work, great communication.','',''],
 4:['Lovely, just a little smaller than I expected.','Nice quality, shipping took a bit longer.','Really good, one small smudge but still happy.','Great template, took a minute to figure out.',''],
 3:['It is okay. Colors are a bit different from the photos.','Decent, but the instructions could be clearer.'],
 2:['Arrived with a chip on the rim. Seller offered a refund.','Not what I expected from the photos.'],
 1:['Package never arrived. Refunded by the seller.'],
};

// ---------- the three shops ----------
// seasonality by calendar month, then a yearly growth factor; prices in cents
const SHOPS=[
 {name:'Fern & Fable Prints',file:'FernAndFablePrints',kind:'physical',perMonth:95,growth:1.18,bank:'4417',ads:320,plus:false,offsite:0.07,labels:true,
  season:[0.75,0.95,0.9,0.95,1.1,0.95,0.8,0.85,0.95,1.1,1.7,2.1],coupons:[['SPRING15',15],['WELCOME10',10],['HOLIDAY20',20],['THANKYOU10',10]],
  ship:[450,695],products:[
   ['Botanical Fern Print, Vintage Style Wall Art, Green Leaf Poster',1800],['Mushroom Study Art Print, Cottagecore Wall Decor',1600],['Wildflower Meadow Print Set of 3, Botanical Gallery Wall',4200],
   ['Moth and Moon Print, Celestial Wall Art',1800],['Custom Birth Flower Print, Personalized Gift for Mom',2600],['Sage Green Kitchen Herbs Print, Farmhouse Decor',1500],
   ['Vintage Bird Illustration Print, Nature Wall Art',1800],['Autumn Leaves Print Set, Fall Home Decor',3800],['Lemon Branch Watercolor Print, Mediterranean Kitchen Art',1600],
   ['Hand Drawn City Map Print, Custom Hometown Poster',3400],['Pressed Flower Frame Art, Minimalist Botanical',2400],['Winter Pine Forest Print, Holiday Wall Art',2000]],
  launches:[['2025-03','Cherry Blossom Branch Print, Japanese Wall Art',1800],['2025-05','Custom Pet Portrait Line Art Print',3200],['2025-09','Pumpkin Patch Watercolor Print, Fall Decor',1600],['2025-10','Christmas Botanical Wreath Print',2200],['2025-11','Personalized Family Tree Print, Anniversary Gift',3800],
   ['2026-02','Tulip Bouquet Print, Spring Wall Art',1800],['2026-04','Seashell Collection Print, Coastal Decor',1900],['2026-06','Custom Wedding Venue Illustration Print',4500],['2026-08','Back to School Botanical Alphabet Print',2000],['2026-09','Harvest Moon Print, Autumn Wall Art',1800],['2026-09','Mushroom Forest Print Set of 2',3200]]},
 {name:'Copper Kiln Ceramics',file:'CopperKilnCeramics',kind:'physical',perMonth:32,growth:1.06,bank:'2290',ads:450,plus:true,offsite:0.1,labels:true,
  season:[0.7,1.05,0.85,0.9,1.25,0.95,0.8,0.8,0.9,1.05,1.6,2],coupons:[['KILNLOVE',10],['MOTHERSDAY15',15],['HOLIDAY15',15]],
  ship:[695,1295],products:[
   ['Handmade Speckled Stoneware Mug, 12 oz Coffee Cup',3600],['Ceramic Ring Dish, Jewelry Tray in Glossy Copper Glaze',2200],['Stoneware Pour Over Coffee Dripper, Handmade',5400],
   ['Handmade Ceramic Planter with Drainage Dish',4800],['Set of 4 Stoneware Dinner Plates, Matte Oatmeal',14800],['Ceramic Bud Vase, Minimalist Handmade Vase',2800],
   ['Personalized Name Mug, Hand Painted Ceramic',4200],['Stoneware Serving Bowl, Large Salad Bowl',6800]],
  launches:[['2025-04','Ceramic Soap Dish with Drainage, Bathroom Decor',2400],['2025-10','Handmade Ceramic Christmas Ornaments Set of 3',3200],['2026-01','Stoneware Matcha Bowl with Whisk Holder',5200],['2026-05','Ceramic Berry Colander, Handmade Kitchen',4400],['2026-08','Speckled Stoneware Espresso Cup Set of 2',3800]]},
 {name:'Plan & Page Studio',file:'PlanAndPageStudio',kind:'digital',perMonth:150,growth:1.32,bank:'8061',ads:400,plus:false,offsite:0,labels:false,
  season:[1.9,1.1,0.95,0.9,0.85,0.8,0.9,1.3,1.1,1,1.2,1.6],coupons:[['NEWYEAR25',25],['PLANAHEAD20',20],['BACKTOSCHOOL',20],['BUNDLE30',30],['THANKYOU15',15]],
  ship:[0,0],products:[
   ['Monthly Budget Spreadsheet, Google Sheets Template with Annual Summary',899],['Digital Planner 2026, Hyperlinked PDF for GoodNotes and Notability',1299],['Weekly Meal Planner Printable, Grocery List PDF',399],
   ['Small Business Bookkeeping Spreadsheet, Income and Expense Tracker',1499],['Habit Tracker Printable, Minimalist Daily Tracker',299],['Wedding Planner Digital Bundle, Checklist and Budget',1599],
   ['Student Academic Planner, Assignment and GPA Tracker Google Sheets',799],['Debt Payoff Tracker Spreadsheet, Snowball Method',699],['Content Calendar Template, Social Media Planner',999],
   ['Savings Challenge Printable, 52 Week Money Tracker',349],['Etsy Seller Spreadsheet, Profit and Inventory Tracker',1299],['Reading Journal Printable, Book Tracker PDF',449]],
  launches:[['2025-02','ADHD Daily Planner Printable, Focus Planner',599],['2025-06','Travel Planner Printable, Itinerary and Packing List',499],['2025-08','Teacher Lesson Planner 2025-2026, Digital and Printable',1199],['2025-11','Christmas Gift Tracker Spreadsheet, Holiday Budget',599],['2025-12','Digital Planner 2027, Undated Hyperlinked PDF',1399],
   ['2026-01','Fitness Tracker Spreadsheet, Workout Log Google Sheets',699],['2026-03','Home Maintenance Checklist Printable',399],['2026-05','Baby Feeding Tracker Printable, Newborn Log',349],['2026-07','Back to School Planner Bundle, Student Printables',899],['2026-08','Freelancer Invoice Template, Google Sheets',799],['2026-09','Holiday Party Planner Printable',499],['2026-09','2027 Monthly Wall Calendar Printable, Minimalist',599]]},
];

// global IDs that only go up, like Etsy's: orders, transactions and listings across every shop
let orderSeq=3400000000,txSeq=4200000000,listingSeq=1650000000;
const dayIndex=d=>Math.round((Date.parse(d)-Date.parse(START))/864e5);
const nextOrder=d=>{orderSeq=Math.max(orderSeq+1+Math.floor(rnd()*4000),3400000000+dayIndex(d)*1200000);return String(orderSeq);};
const nextListing=d=>{listingSeq=Math.max(listingSeq+1+Math.floor(rnd()*900000),1650000000+dayIndex(d)*380000);return String(listingSeq);};

function build(shop){
 const lines=[],orderRows=[],reviews=[],deposits=[],buyers=[],taken=new Set();
 const stmt=(date,type,title,info,amount,fees)=>{if(date<=END)lines.push({date,type,title,info,amount,fees});};
 // listings: the long-standing ones have old IDs; new ones get an ID and a listing fee the day they go live
 let oldId=1300000000;
 const listings=shop.products.map(([title,price])=>({id:String(oldId+=Math.floor(between(1e6,4e7))),title,price,live:'2020-01-01'}));
 for(const [month,title,price] of shop.launches){const day=`${month}-${String(2+Math.floor(rnd()*24)).padStart(2,'0')}`;if(day>END)continue;const id=nextListing(day);listings.push({id,title,price,live:day});stmt(day,'Fee','Listing fee',`Listing #${id}`,0,-20);}
 const liveOn=d=>listings.filter(l=>l.live<=d);
 const pop=new Map(listings.map(l=>[l.id,0.4+rnd()*1.6]));

 for(let d=START;d<=END;d=addDays(d,1)){
  const m=+d.slice(5,7)-1,yr=+d.slice(0,4)-2025,days=new Date(Date.UTC(+d.slice(0,4),m+1,0)).getUTCDate();
  const wk=[1.1,0.95,0.95,1,1,1.05,1.15][weekday(d)];
  const n=poisson(shop.perMonth*shop.season[m]*Math.pow(shop.growth,yr+m/12)*wk/days);
  for(let k=0;k<n;k++){
   const oid=nextOrder(d),live=liveOn(d),count=weighted([[1,80],[2,14],[3,6]]);
   // newer listings sell a little better for a few months: that is what the New listings screen looks for
   const items=[];for(let i=0;i<count;i++){const l=weighted(live.map(x=>[x,pop.get(x.id)*(x.live>addDays(d,-120)?1.6:1)]));const ex=items.find(x=>x.l===l);if(ex)ex.qty++;else items.push({l,qty:weighted([[1,90],[2,8],[3,2]]),tid:String(txSeq+=1+Math.floor(rnd()*50))});}
   // a new buyer always gets a name nobody in this shop has, so repeat buyers are only the ones meant to be
   const repeat=buyers.length>20&&chance(0.09);let name=repeat?pick(buyers):'';while(!name||(!repeat&&taken.has(name)))name=`${pick(FIRST)} ${chance(0.5)?String.fromCharCode(65+Math.floor(rnd()*26))+'. ':''}${pick(LAST)}`;if(!repeat){buyers.push(name);taken.add(name);}
   const country=weighted(COUNTRY[shop.kind]),itemTotal=items.reduce((n,x)=>n+x.l.price*x.qty,0);
   const coupon=chance(0.2)?pick(shop.coupons):null,discount=coupon?Math.round(itemTotal*coupon[1]/100):0;
   const shipping=shop.kind==='digital'?0:Math.round(between(shop.ship[0],shop.ship[1])/5)*5*(itemTotal>=3500&&country==='United States'?0:1);
   const sub=itemTotal-discount;
   const salesTax=country==='United States'?Math.round((sub+shipping)*between(0.05,0.09)):0;
   const vat=VAT_RATE[country]&&shop.kind==='digital'?Math.round(sub*VAT_RATE[country]/100):0;
   const paid=sub+shipping+salesTax+vat;
   // sold order items: order-level money is written on every row of the order, as Etsy does
   const street=`${100+Math.floor(rnd()*899)} ${pick(STREETS)}`;
   for(const it of items)orderRows.push([mdy(d),it.l.title,name,it.qty,plain(it.l.price),coupon?coupon[0]:'',coupon?`${coupon[1]}% off`:'',plain(discount),'0.00',plain(shipping),plain(salesTax),plain(it.l.price*it.qty),'USD',it.tid,it.l.id,mdy(d),shop.kind==='digital'?'':mdy(addDays(d,2)),name,street,'','Demo City',country==='United States'?pick(['CA','NY','TX','WA','IL','FL','OR','CO']):'',String(10000+Math.floor(rnd()*89999)),country,oid,'','online','listing','online_cc','','',vat?plain(vat):'','']);
   // the statement: the sale, taxes taken back, fees per item, processing, the renewal fee for what sold
   stmt(d,'Sale',`Payment for Order #${oid}`,'',paid,0);
   if(salesTax)stmt(d,'Tax','Sales tax paid by buyer',`Order #${oid}`,0,-salesTax);
   if(vat)stmt(d,'VAT','VAT paid by buyer',`Order #${oid}`,0,-vat);
   for(const it of items){const base=Math.round(it.l.price*it.qty*(sub/itemTotal));stmt(d,'Fee',`Transaction fee: ${it.l.title}`,`Order #${oid}`,0,-Math.round(base*0.065));for(let i=0;i<it.qty;i++)stmt(d,'Fee','Listing fee',`Listing #${it.l.id}`,0,-20);}
   if(shipping)stmt(d,'Fee','Transaction fee: Shipping',`Order #${oid}`,0,-Math.round(shipping*0.065));
   stmt(d,'Fee','Processing fee',`Order #${oid}`,0,-(Math.round(paid*0.03)+25));
   if(shop.offsite&&chance(shop.offsite))stmt(d,'Fee','Offsite Ads fee',`Order #${oid}`,0,-Math.min(10000,Math.round(sub*0.15)));
   if(chance(0.03))stmt(addDays(d,Math.floor(between(1,6))),'Fee','Share & Save refund',`Order #${oid}`,0,Math.round(sub*0.04));
   if(shop.labels&&shipping)stmt(addDays(d,1),'Shipping',pick(['USPS shipping label','USPS Ground Advantage label','USPS Priority Mail label']),`Order #${oid}`,0,-Math.round(between(470,shop.name.includes('Kiln')?1150:720)));
   if(chance(0.012)){const rd=addDays(d,Math.floor(between(3,15)));if(rd<=END){stmt(rd,'Refund',`Refund to buyer for Order #${oid}`,`Order #${oid}`,-paid,0);stmt(rd,'Fee','Credit for transaction fee',`Order #${oid}`,0,Math.round(sub*0.065));}}
   // about a third of buyers leave a review a week or two later
   const rv=addDays(d,Math.floor(between(4,21)));if(chance(0.3)&&rv<=END){const stars=weighted([[5,80],[4,13],[3,4],[2,2],[1,1]]);reviews.push({reviewer:name.split(' ')[0],date_reviewed:mdyy(rv),star_rating:stars,message:pick(REVIEWS[stars]),order_id:+oid});}
  }
  // Etsy Ads bill the day after the clicks; Etsy Plus is monthly and brings ad and listing credits
  if(d>START){const spend=Math.round(shop.ads*between(0.45,1)*(shop.season[m]>1.4?1.3:1));stmt(d,'Marketing','Etsy Ads',`Bill for click-throughs to your shop on ${shortD(addDays(d,-1))}`,0,-spend);}
  if(shop.plus&&d.endsWith('-15')){stmt(d,'Marketing','Etsy Plus subscription fee','',0,-1000);stmt(d,'Fee','Credit for Etsy Ads fee','',0,500);for(let i=0;i<15;i++)stmt(d,'Fee','Credit for listing fee',`Listing #${pick(listings).id}`,0,20);}
 }
 // payouts every Monday: what the account holds, sent to the bank, in both the statement and the deposits file
 lines.sort((a,b)=>a.date.localeCompare(b.date));
 let bal=0,i=0;
 for(let d=START;d<=END;d=addDays(d,1)){
  while(i<lines.length&&lines[i].date<d){bal+=lines[i].amount+lines[i].fees;i++;}
  if(weekday(d)===1&&bal>500){stmt(d,'Deposit',`${usd(bal)} sent to your bank account`,'',0,0);deposits.push([long(d),plain(bal),'USD','Executed',shop.bank]);bal=0;}
 }
 lines.sort((a,b)=>b.date.localeCompare(a.date));
 return {lines,orderRows,reviews,deposits,listings};
}

const OH=['Sale Date','Item Name','Buyer','Quantity','Price','Coupon Code','Coupon Details','Discount Amount','Shipping Discount','Order Shipping','Order Sales Tax','Item Total','Currency','Transaction ID','Listing ID','Date Paid','Date Shipped','Ship Name','Ship Address1','Ship Address2','Ship City','Ship State','Ship Zipcode','Ship Country','Order ID','Variations','Order Type','Listings Type','Payment Type','InPerson Discount','InPerson Location','VAT Paid by Buyer','SKU'];
const LH=['TITLE','DESCRIPTION','PRICE','CURRENCY_CODE','QUANTITY','TAGS','MATERIALS','IMAGE1','IMAGE2','IMAGE3','IMAGE4','IMAGE5','IMAGE6','IMAGE7','IMAGE8','IMAGE9','IMAGE10','VARIATION 1 TYPE','VARIATION 1 NAME','VARIATION 1 VALUES','VARIATION 2 TYPE','VARIATION 2 NAME','VARIATION 2 VALUES','VARIATION 3 TYPE','VARIATION 3 NAME','VARIATION 3 VALUES','SKU'];
const SH=['Date','Type','Title','Info','Currency','Amount','Fees & Taxes','Net','Tax Details'];
const dash=c=>c?usd(c):'--';

fs.rmSync(OUT,{recursive:true,force:true});
const summary=[];
for(const shop of SHOPS){
 const dir=path.join(OUT,shop.name.replace(/[^A-Za-z0-9 &]/g,'').replace(/&/g,'and'));fs.mkdirSync(dir,{recursive:true});
 const B=build(shop);
 // one payment account statement per month, newest line first, as Finances → Monthly statements gives them
 const byMonth=new Map();for(const l of B.lines){const k=l.date.slice(0,7);if(!byMonth.has(k))byMonth.set(k,[]);byMonth.get(k).push(l);}
 for(const [k,ls] of byMonth)fs.writeFileSync(path.join(dir,`etsy_statement_${k.slice(0,4)}_${+k.slice(5)}.csv`),csv([SH,...ls.map(l=>[long(l.date),l.type,l.title,l.info,'USD',dash(l.amount),dash(l.fees),l.type==='Deposit'?'--':usd(l.amount+l.fees),'--'])]));
 for(const y of ['2025','2026']){
  fs.writeFileSync(path.join(dir,`EtsySoldOrderItems${y}.csv`),csv([OH,...B.orderRows.filter(r=>r[0].endsWith('/'+y.slice(2)))]));
  fs.writeFileSync(path.join(dir,`EtsyDeposits${y}.csv`),csv([['Date','Amount','Currency','Status','Bank Account Ending Digits'],...B.deposits.filter(r=>r[0].endsWith(y))]));
 }
 // today's listings: most have all 10 photos and 13 tags, a few need work (the app flags those)
 const tagWords=['gift','home decor','wall art','handmade','minimalist','gift for her','cottagecore','printable','planner','digital download','boho','modern','farmhouse','custom','personalized','kitchen','spring','holiday','botanical','neutral'];
 fs.writeFileSync(path.join(dir,'EtsyListingsDownload.csv'),csv([LH,...B.listings.map((l,i)=>{const photos=i%5===3?Math.floor(between(4,9)):10,tags=i%6===4?Math.floor(between(6,12)):13;
  return [l.title,`${l.title}. Made with care in our small studio.`,plain(l.price),'USD',shop.kind==='digital'?999:Math.floor(between(3,40)),Array.from({length:tags},(_,t)=>tagWords[(i+t)%tagWords.length]).join(','),shop.kind==='digital'?'digital file':shop.name.includes('Kiln')?'stoneware,glaze':'archival paper,ink',
   ...Array.from({length:10},(_,p)=>p<photos?`https://example.com/demo/${l.id}-${p+1}.jpg`:''),'','','','','','','','','',`${shop.file.slice(0,4).toUpperCase()}-${String(i+1).padStart(3,'0')}`];})]));
 fs.writeFileSync(path.join(dir,'reviews.json'),JSON.stringify(B.reviews.sort((a,b)=>b.date_reviewed.slice(6)+b.date_reviewed.slice(0,5)>a.date_reviewed.slice(6)+a.date_reviewed.slice(0,5)?1:-1)));
 const orders=new Set(B.orderRows.map(r=>r[24])).size;
 summary.push(`${shop.name}: ${byMonth.size} monthly statements, ${orders} orders, ${B.listings.length} listings, ${B.reviews.length} reviews, ${B.deposits.length} payouts`);
}
fs.writeFileSync(path.join(OUT,'README.txt'),`Demo files for Shop Insights: three made-up Etsy shops, January 2025 to September 27, 2026.
Every name, address and number is invented. The files use Etsy's own export layouts.

Import each shop's folder into its own shop (Import files → choose or add the shop → drop the whole folder's files):
${summary.map(s=>'  '+s).join('\n')}

Where each file comes from on Etsy:
  etsy_statement_YYYY_M.csv   Shop Manager → Finances → Monthly statements → Download CSV (one per month)
  EtsySoldOrderItems YYYY.csv Shop Manager → Settings → Options → Download Data → Order Items
  EtsyListingsDownload.csv    Shop Manager → Settings → Options → Download Data → Listings
  reviews.json                Your account → Privacy settings → Download data
  EtsyDeposits YYYY.csv       Shop Manager → Settings → Options → Download Data → Etsy Payments Deposits
`);
console.log(summary.join('\n'));
