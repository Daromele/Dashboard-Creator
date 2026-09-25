// Synthetic Etsy exports in the real column layouts, for test_etsy.js and etsy_smoke.js.
// Every name, address and number here is made up. Never commit a seller's real exports:
// the sold order items file holds buyers' names and addresses.
//
//   node etsy_fixtures.js <out-dir>     writes the four files
const fs=require('fs'),path=require('path');

const statement=`Date,Type,Title,Info,Currency,Amount,"Fees & Taxes",Net,"Tax Details"
"September 24, 2026",Sale,"Payment for Order #3812345671",,USD,$16.08,--,$16.08,--
"September 24, 2026",Tax,"Sales tax paid by buyer","Order #3812345671",USD,--,-$1.08,-$1.08,--
"September 24, 2026",Fee,"Transaction fee: Botanical Fern Print, Vintage Style","Order #3812345671",USD,--,-$0.98,-$0.98,--
"September 24, 2026",Fee,"Processing fee","Order #3812345671",USD,--,-$0.73,-$0.73,--
"September 24, 2026",Tax,"Tax: Transaction","Order #3812345671",USD,--,-$0.05,-$0.05,--
"September 24, 2026",Fee,"Listing fee","Listing #1400000001",USD,--,-$0.20,-$0.20,--
"September 23, 2026",Marketing,"Etsy Ads",,USD,--,-$2.50,-$2.50,--
"September 22, 2026",Sale,"Payment for Order #3812345672",,USD,$40.00,--,$40.00,--
"September 22, 2026",Fee,"Transaction fee: Handmade Mug","Order #3812345672",USD,--,-$1.30,-$1.30,--
"September 22, 2026",Fee,"Transaction fee: Handmade Mug","Order #3812345672",USD,--,-$1.30,-$1.30,--
"September 22, 2026",Fee,"Processing fee","Order #3812345672",USD,--,-$1.45,-$1.45,--
"September 21, 2026",Fee,"Credit for listing fee","Listing #1400000001",USD,--,$0.20,$0.20,--
"September 20, 2026",Fee,"Share & Save refund","Order #3812345672",USD,--,$1.00,$1.00,--
"September 15, 2026",Marketing,"Etsy Plus subscription fee",,USD,--,-$10.00,-$10.00,--
"September 15, 2026",Tax,"Sales tax on Etsy Plus subscription fee",,USD,--,-$0.60,-$0.60,--
"September 15, 2026",Fee,"Credit for Etsy Ads fee",,USD,--,$5.00,$5.00,--
"September 14, 2026",Deposit,"$37.35 sent to your bank account",,USD,--,--,--,--
"September 10, 2026",Refund,"Refund to buyer for Order #3812345600","Order #3812345600",USD,-$12.00,--,-$12.00,--
"September 10, 2026",Fee,"Credit for transaction fee","Order #3812345600",USD,--,$0.78,$0.78,--
"September 9, 2026",Shipping,"USPS shipping label","Order #3812345600",USD,--,-$5.25,-$5.25,--
"September 8, 2026",Mystery,"Something Etsy added later",,USD,--,-$0.10,-$0.10,--
"September 7, 2026",Fee,"Offsite Ads fee","Order #3812345672",USD,--,-$6.00,-$6.00,--
"September 6, 2026",Fee,"Listing fee","Listing #1400000009",USD,--,--,--,--
`;
const H='"Sale Date","Item Name",Buyer,Quantity,Price,"Coupon Code","Coupon Details","Discount Amount","Shipping Discount","Order Shipping","Order Sales Tax","Item Total",Currency,"Transaction ID","Listing ID","Date Paid","Date Shipped","Ship Name","Ship Address1","Ship Address2","Ship City","Ship State","Ship Zipcode","Ship Country","Order ID",Variations,"Order Type","Listings Type","Payment Type","InPerson Discount","InPerson Location","VAT Paid by Buyer",SKU';
const row=(date,name,buyer,qty,price,code,disc,ship,tax,total,tid,lid,country,oid)=>[date,`"${name}"`,`"${buyer}"`,qty,price,code,code?'"20% off"':'',disc,'0.00',ship,tax,total,'USD',tid,lid,date,date,`"${buyer}"`,'"1 Fictional Lane"','','Testville','CA','90000',`"${country}"`,oid,'','online','listing','online_cc','','','0.00',''].join(',');
const orders=[H,
  row('09/24/26','Botanical Fern Print, Vintage Style','Jane Placeholder',1,'16.00','','0.00','0.00','1.08','16.00','4000000001','1400000001','United States','3812345671'),
  row('09/22/26','Handmade Mug','Sam Example',1,'20.00','FALL20','8.00','0.00','0.00','20.00','4000000002','1400000002','United Kingdom','3812345672'),
  row('09/22/26','Ring Dish','Sam Example',2,'10.00','FALL20','0.00','0.00','0.00','20.00','4000000003','1400000003','United Kingdom','3812345672'),
  row('08/03/26','Botanical Fern Print, Vintage Style','Jane Placeholder',1,'16.00','','0.00','4.50','0.00','16.00','4000000004','1400000001','United States','3812345600'),
].join('\n')+'\n';
const imgs=n=>Array.from({length:10},(_,i)=>i<n?`https://example.com/i${i}.jpg`:'').join(',');
const tags=n=>'"'+Array.from({length:n},(_,i)=>'tag'+i).join(',')+'"';
const LH='TITLE,DESCRIPTION,PRICE,CURRENCY_CODE,QUANTITY,TAGS,MATERIALS,IMAGE1,IMAGE2,IMAGE3,IMAGE4,IMAGE5,IMAGE6,IMAGE7,IMAGE8,IMAGE9,IMAGE10,VARIATION 1 TYPE,VARIATION 1 NAME,VARIATION 1 VALUES,VARIATION 2 TYPE,VARIATION 2 NAME,VARIATION 2 VALUES,VARIATION 3 TYPE,VARIATION 3 NAME,VARIATION 3 VALUES,SKU';
const listings=[LH,
  `"Botanical Fern Print, Vintage Style Wall Art, Green Leaf Poster","A print, with ""quotes"" and a comma",16.00,USD,5,${tags(13)},paper,${imgs(10)},Size,Size,"A4,A3",,,,,,,FERN-1`,
  `"Handmade Mug, Speckled Stoneware Coffee Cup","Line one\nline two",20.00,USD,3,${tags(2)},clay,${imgs(4)},,,,,,,,,,`,
  `"Autumn Leaves Print Set",Description,26.00,USD,4,${tags(13)},paper,${imgs(10)},,,,,,,,,,`,
].join('\n')+'\n';
const reviews=JSON.stringify([
  {reviewer:'Jane Placeholder',date_reviewed:'09/28/2026',star_rating:5,message:'Lovely print!',order_id:3812345671},
  {reviewer:'Sam Example',date_reviewed:'09/30/2026',star_rating:4,message:'',order_id:3812345672},
  {reviewer:'Jane Placeholder',date_reviewed:'08/20/2026',star_rating:2,message:'Arrived bent.',order_id:3812345600},
  // one review per item of a two-item order: identical apart from the item, which the export leaves out
  {reviewer:'Sam Example',date_reviewed:'09/30/2026',star_rating:4,message:'',order_id:3812345672},
],null,1);
const files={'etsy_statement_2026_9.csv':statement,'EtsySoldOrderItems2026.csv':orders,'EtsyListingsDownload.csv':listings,'reviews.json':reviews};
module.exports={statement,orders,listings,reviews,files,
  // what the four files must add up to (cents)
  expect:{sales:5608,buyerTax:108,refunds:1200,revenue:4300,fees:473,marketing:1350,ads:350,etsyCosts:1823,takeHome:2477,credits:698,labels:525,deposits:3735,orders:2,
    soldOrders:3,items:4,list:7200,discount:800,listings:3,reviews:4}};
if(require.main===module){const out=process.argv[2];if(!out){console.error('usage: node etsy_fixtures.js <out-dir>');process.exit(2);}
  fs.mkdirSync(out,{recursive:true});for(const [n,t] of Object.entries(files))fs.writeFileSync(path.join(out,n),t);console.log('wrote',Object.keys(files).length,'files to',out);}
