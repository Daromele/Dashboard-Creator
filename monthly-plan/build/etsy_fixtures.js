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
// ---- other channels (synthetic): a Shopify orders export and Square's two exports ----
const SH='Name,Email,Financial Status,Paid at,Fulfillment Status,Fulfilled at,Accepts Marketing,Currency,Subtotal,Shipping,Taxes,Total,Discount Code,Discount Amount,Shipping Method,Created at,Lineitem quantity,Lineitem name,Lineitem price,Lineitem compare at price,Lineitem sku,Lineitem requires shipping,Lineitem taxable,Lineitem fulfillment status,Billing Name,Billing Street,Billing City,Billing Zip,Billing Country,Shipping Name,Shipping Street,Shipping City,Shipping Zip,Shipping Country,Cancelled at,Refunded Amount,Id';
const shopify=[SH,
 '#1001,ada@example.com,paid,2026-09-03 10:15:00 -0400,fulfilled,,no,USD,47.00,6.00,3.29,56.29,FALL5,5.00,Standard,2026-09-03 10:14:00 -0400,2,Botanical Fern Print,16.00,,FERN-1,true,true,fulfilled,Ada Example,1 Fictional Lane,Testville,00000,US,Ada Example,1 Fictional Lane,Testville,00000,US,,0.00,5550000001',
 '#1001,ada@example.com,,,,,,,,,,,,,,,1,Canvas Tote Bag,20.00,,TOTE-1,true,true,fulfilled,,,,,,,,,,,,,',
 '#1002,bo@example.com,paid,2026-09-10 09:00:00 -0400,fulfilled,,no,USD,25.00,0.00,0.00,25.00,,0.00,Pickup,2026-09-10 09:00:00 -0400,1,Speckled Mug,25.00,,MUG-1,true,true,fulfilled,Bo Placeholder,2 Example Rd,Sampleton,00000,CA,Bo Placeholder,2 Example Rd,Sampleton,00000,CA,,0.00,5550000002',
 '#1003,cy@example.com,voided,,unfulfilled,,no,USD,16.00,0.00,0.00,16.00,,0.00,Standard,2026-09-12 12:00:00 -0400,1,Botanical Fern Print,16.00,,FERN-1,true,true,,Cy Example,3 Test St,Testville,00000,US,Cy Example,3 Test St,Testville,00000,US,2026-09-12 13:00:00 -0400,0.00,5550000003',
 '#1004,ada@example.com,partially_refunded,2026-08-20 08:00:00 -0400,fulfilled,,no,USD,16.00,4.00,0.00,20.00,,0.00,Standard,2026-08-20 08:00:00 -0400,1,Botanical Fern Print,16.00,,FERN-1,true,true,fulfilled,Ada Example,1 Fictional Lane,Testville,00000,US,Ada Example,1 Fictional Lane,Testville,00000,US,,4.00,5550000004'].join('\n');
const SQ='Date,Time,Time Zone,Gross Sales,Discounts,Service Charges,Net Sales,Gift Card Sales,Tax,Tip,Partial Refunds,Total Collected,Source,Card,Card Entry Methods,Cash,Square Gift Card,Other Tender,Other Tender Type,Other Tender Note,Fees,Net Total,Transaction ID,Payment ID,Card Brand,PAN Suffix,Device Name,Staff Name,Staff ID,Details,Description,Event Type,Location,Dining Option,Customer ID,Customer Name,Customer Reference ID';
const squareTx=[SQ,
 '2026-09-13,10:02:11,Eastern Time (US & Canada),$30.00,-$3.00,$0.00,$27.00,$0.00,$2.16,$2.00,$0.00,$31.16,Point of Sale,$31.16,Tap,$0.00,$0.00,$0.00,,,-$0.93,$30.23,SQA1x,PA1,Visa,0000,Market iPad,,,,"Speckled Mug x 1, Botanical Fern Print x 1",Payment,Autumn Fair,,CUST1,Dee Example,',
 '2026-09-13,11:40:00,Eastern Time (US & Canada),$12.00,$0.00,$0.00,$12.00,$0.00,$0.96,$0.00,$0.00,$12.96,Point of Sale,$12.96,Tap,$0.00,$0.00,$0.00,,,-$0.46,$12.50,SQB2y,PB2,Visa,0000,Market iPad,,,,Botanical Fern Print x 1,Payment,Autumn Fair,,,,',
 '2026-09-20,09:00:00,Eastern Time (US & Canada),-$12.00,$0.00,$0.00,-$12.00,$0.00,-$0.96,$0.00,$0.00,-$12.96,Point of Sale,-$12.96,,$0.00,$0.00,$0.00,,,$0.00,-$12.96,SQB2y,PB2R,Visa,0000,Market iPad,,,,Botanical Fern Print x 1,Refund,Autumn Fair,,,,'].join('\n');
const SI='Date,Time,Time Zone,Category,Item,Qty,Price Point Name,SKU,Modifiers Applied,Gross Sales,Discounts,Net Sales,Tax,Transaction ID,Payment ID,Device Name,Notes,Details,Event Type,Location,Dining Option,Customer ID,Customer Name,Customer Reference ID';
const squareItems=[SI,
 '2026-08-15,14:00:00,Eastern Time (US & Canada),Ceramics,Speckled Mug,2,Regular,MUG-1,,$36.00,$0.00,$36.00,$2.88,SQC3z,PC3,Market iPad,,,Payment,Summer Market,,,,',
 '2026-09-13,10:02:11,Eastern Time (US & Canada),Ceramics,Speckled Mug,1,Regular,MUG-1,,$18.00,-$3.00,$15.00,$1.20,SQA1x,PA1,Market iPad,,,Payment,Autumn Fair,,CUST1,Dee Example,',
 '2026-09-13,10:02:11,Eastern Time (US & Canada),Prints,Botanical Fern Print,1,Regular,FERN-1,,$12.00,$0.00,$12.00,$0.96,SQA1x,PA1,Market iPad,,,Payment,Autumn Fair,,CUST1,Dee Example,',
 '2026-09-13,11:40:00,Eastern Time (US & Canada),Prints,Botanical Fern Print,1,Regular,FERN-1,,$12.00,$0.00,$12.00,$0.96,SQB2y,PB2,Market iPad,,,Payment,Autumn Fair,,,,',
 '2026-09-20,09:00:00,Eastern Time (US & Canada),Prints,Botanical Fern Print,-1,Regular,FERN-1,,-$12.00,$0.00,-$12.00,-$0.96,SQB2y,PB2R,Market iPad,,,Refund,Autumn Fair,,,,'].join('\n');
const shopifyPayouts=['Transaction Date,Type,Order,Card Brand,Card Source,Payout Status,Payout Date,Payout ID,Available On,Amount,Fee,Net,Checkout,Payment Method Name,Presentment Amount,Presentment Currency,Currency',
 '2026-09-03 10:15:00 -0400,charge,#1001,visa,online,paid,2026-09-05,90001,2026-09-05,56.29,1.93,54.36,,card,56.29,USD,USD',
 '2026-09-10 09:00:00 -0400,charge,#1002,mastercard,online,paid,2026-09-12,90002,2026-09-12,25.00,1.03,23.97,,card,25.00,USD,USD'].join('\n');
// Amazon's date range report opens with a few lines of notes before the header
const amazon=['"Includes Amazon Marketplace, Fulfillment by Amazon (FBA), and Amazon Webstore transactions"','"All amounts in USD, unless specified"','"Definitions:"',
 '"date/time","settlement id","type","order id","sku","description","quantity","marketplace","account type","fulfillment","order city","order state","order postal","tax collection model","product sales","product sales tax","shipping credits","shipping credits tax","gift wrap credits","giftwrap credits tax","Regulatory Fee","Tax On Regulatory Fee","promotional rebates","promotional rebates tax","marketplace withheld tax","selling fees","fba fees","other transaction fees","other","total"',
 '"Sep 4, 2026 1:05:07 AM PDT","1001","Order","111-1111111-1111111","MUG-1","Speckled Mug, Handmade Stoneware","2","amazon.com","Standard Orders","Seller","Testville","CA","00000","MarketplaceFacilitator","76.00","6.08","5.00","0","0","0","0","0","-4.00","0","-6.08","-11.55","0","0","0","65.45"',
 '"Sep 9, 2026 3:00:00 PM PDT","1001","Refund","111-1111111-1111111","MUG-1","Speckled Mug, Handmade Stoneware","1","amazon.com","Standard Orders","Seller","Testville","CA","00000","MarketplaceFacilitator","-38.00","-3.04","0","0","0","0","0","0","2.00","0","3.04","4.62","0","0","0","-31.38"',
 '"Sep 15, 2026 12:00:00 AM PDT","1001","Service Fee","","","Cost of Advertising","","","","","","","","","0","0","0","0","0","0","0","0","0","0","0","0","0","0","-12.00","-12.00"',
 '"Sep 16, 2026 12:00:00 AM PDT","1001","Transfer","","","To account ending in: 000","","","","","","","","","0","0","0","0","0","0","0","0","0","0","0","0","0","0","-22.07","-22.07"'].join('\n');
const ebay=['"Transaction report"','"Start date","2026-09-01"','"End date","2026-09-30"','',
 '"Transaction creation date","Type","Order number","Legacy order ID","Buyer username","Buyer name","Ship to city","Ship to province/region/state","Ship to zip","Ship to country","Net amount","Payout currency","Payout date","Payout ID","Payout method","Payout status","Reason for hold","Item ID","Transaction ID","Item title","Custom label","Quantity","Item subtotal","Shipping and handling","Seller collected tax","eBay collected tax","Final Value Fee - fixed","Final Value Fee - variable","Very high ""item not as described"" fee","Below standard performance fee","International fee","Gross transaction amount","Transaction currency","Exchange rate","Reference ID","Description"',
 '"Sep 5, 2026","Order","12-00000-00001","100-1","buyer_one","Placeholder Person","Testville","CA","00000","US","21.46","USD","Sep 7, 2026","P1","Bank","Paid","","200001","300001","Botanical Fern Print","FERN-1","1","20.00","5.00","0","1.60","-0.30","-3.24","--","--","--","26.60","USD","","",""',
 '"Sep 6, 2026","Shipping label","","","","","","","","","-4.10","USD","","","","","","","","Botanical Fern Print","","","","","","","","","","","","","USD","","",""',
 '"Sep 20, 2026","Other fee","","","","","","","","","-1.50","USD","","","","","","","","Promoted Listings - General fee","","","","","","","","","","","","","USD","","",""',
 '"Sep 22, 2026","Payout","","","","","","","","","-15.86","USD","Sep 22, 2026","P2","Bank","Paid","","","","","","","","","","","","","","","","","USD","","",""'].join('\n');
// Gumroad, TikTok Shop, Faire, Payhip and Fourthwall (synthetic; column names follow each export as best known)
const gumroad=['Purchase ID,Item Name,Buyer Name,Purchase Email,Purchase Date,Purchase Time (UTC timezone),Subtotal ($),Taxes ($),Shipping ($),Sale Price ($),Fees ($),Net Total ($),Refunded?,Partial Refund ($),Fully Refunded?,Discount Code,Country,Quantity',
 'g1,Budget Planner Template,Ada Example,ada@example.com,2026-09-02,10:00,12.00,0.00,0.00,12.00,1.85,10.15,false,0.00,false,,United States,1',
 'g2,Budget Planner Template,Bo Placeholder,bo@example.com,2026-09-05,11:00,12.00,0.96,0.00,12.96,1.85,10.15,false,0.00,false,FALL,Canada,1',
 'g3,Habit Tracker,Cy Example,cy@example.com,2026-09-09,12:00,8.00,0.00,0.00,8.00,1.30,6.70,true,0.00,true,,United States,1'].join('\n');
const tiktok=['Order/adjustment ID,Type,Order created time,Order settled time,Currency,Total settlement amount,Total revenue,Subtotal after seller discounts,Total fees,Transaction fee,TikTok Shop commission fee,Affiliate commission',
 '576001,Order,2026/09/03,2026/09/10,USD,21.10,25.00,25.00,-3.90,-0.75,-2.00,-1.15',
 '576002,Order,2026/09/04,2026/09/11,USD,12.70,15.00,15.00,-2.30,-0.45,-1.20,-0.65',
 '576002,Refund,2026/09/08,2026/09/12,USD,-12.70,-15.00,-15.00,2.30,0.45,1.20,0.65'].join('\n');
const faire=['Order Number,Order Date,Retailer Name,Product Name,SKU,Quantity,Wholesale Price,Retail Price,Status',
 'FA100,2026-09-06,Example Gift Shop,Speckled Mug,MUG-1,6,19.00,38.00,Shipped',
 'FA100,2026-09-06,Example Gift Shop,Botanical Fern Print,FERN-1,4,8.00,16.00,Shipped',
 'FA101,2026-09-18,Placeholder Boutique,Speckled Mug,MUG-1,4,19.00,38.00,Cancelled'].join('\n');
const payhip=['Date,Transaction ID,Product,Customer Email,Amount,Currency,Payhip Fee,Payment Processor Fee,Coupon,Country',
 '2026-09-07,PH1,Meal Planner PDF,dee@example.com,9.00,USD,0.45,0.56,,United Kingdom',
 '2026-09-12,PH2,Meal Planner PDF,eve@example.com,9.00,USD,0.45,0.56,SAVE,United States'].join('\n');
const fourthwall=['Order ID,Created At,Status,Product,Variant,Quantity,Subtotal,Shipping,Tax,Total,Base Cost,Your Earnings',
 'FW-9,2026-09-14,Fulfilled,Fern Tee,M,1,30.00,5.00,2.10,37.10,14.00,18.20'].join('\n');
// a store the app has no preset for, matched by hand
const kofi=['DateTime (UTC),From,Item,Received,Currency,TransactionId,BuyerCountry',
 '2026-09-15 10:00,Supporter,Sticker Pack,6.00,USD,KF1,US','2026-09-16 10:00,Supporter,Sticker Pack,6.00,USD,KF2,DE'].join('\n');
const channels={'Sales_gumroad.csv':gumroad,'tiktok_settlement.csv':tiktok,'faire_orders.csv':faire,'payhip_sales.csv':payhip,'fourthwall_orders.csv':fourthwall,'kofi_sales.csv':kofi,'orders_export_1.csv':shopify,'payment_transactions_export_1.csv':shopifyPayouts,'transactions-2026-09.csv':squareTx,'items-2026-09.csv':squareItems,'2026Sep1-2026Sep30CustomTransaction.csv':amazon,'Transaction_report.csv':ebay};
const files={'etsy_statement_2026_9.csv':statement,'EtsySoldOrderItems2026.csv':orders,'EtsyListingsDownload.csv':listings,'reviews.json':reviews};
module.exports={statement,orders,listings,reviews,files,shopify,shopifyPayouts,squareTx,squareItems,amazon,ebay,gumroad,tiktok,faire,payhip,fourthwall,kofi,channels,
  // what the four files must add up to (cents)
  expect:{sales:5608,buyerTax:108,refunds:1200,revenue:4300,fees:473,marketing:1350,ads:350,etsyCosts:1823,takeHome:2477,credits:698,labels:525,deposits:3735,orders:2,
    soldOrders:3,items:4,list:7200,discount:800,listings:3,reviews:4}};
if(require.main===module){const out=process.argv[2];if(!out){console.error('usage: node etsy_fixtures.js <out-dir>');process.exit(2);}
  fs.mkdirSync(out,{recursive:true});for(const [n,t] of Object.entries({...files,...channels}))fs.writeFileSync(path.join(out,n),t);console.log('wrote',Object.keys(files).length,'files to',out);}
