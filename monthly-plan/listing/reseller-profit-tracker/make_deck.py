# Writes deck.json for the Reseller Profit Tracker listing (run from this folder).
import json
brand={"ink":"#1F1A26","bold":"#2E2040","pop":"#F0B98F","paper":"#FAF9FC","calm":"#5C3F8F"}
S=lambda d,l,e,h,s,img,f: {"dark":d,"label":l,"eyebrow":e,"headline":h,"sub":s,"image":img,"foot":f}
slides=[{"kind":"hero","dark":True,"label":"Hero","eyebrow":"Reseller inventory & profit tracker","headline":"Know what you<br>really made.","pills":["True profit","Inventory","Schedule C","No subscription"],"image":"tab-dashboard.jpg","alt":"Reseller Profit Tracker home"},
 S(False,"Inventory","Inventory","Every item, and what it should make.","What you paid, the list price, where it’s listed and the profit after fees.","tab-items.jpg","Fictional sample shop shown"),
 S(True,"Add inventory","After a haul","Add a whole haul in a minute.","Title, what you paid, Enter. Bought a bin or a lot? Its price is split for you.","tab-add.jpg","SKUs numbered for you"),
 S(False,"Sales","Sales","Every sale, its real profit.","Fees, the label and the item’s cost come off. ROI and days to sell.","tab-sales.jpg","Returns go back on the shelf"),
 S(True,"Platforms","Platforms","Which platform pays you best?","Fees, profit and days to sell, side by side. Edit each platform’s fees.","tab-plats.jpg","Past sales keep the fee they paid"),
 S(False,"Profit and loss","Profit &amp; loss","Your profit, for any dates.","Sales, cost of goods, selling costs, running costs and what’s left.","tab-pl.jpg","Print it or export a CSV"),
 S(True,"Schedule C","Tax time","Schedule C with cost of goods sold.","Inventory at the start and end of the year, worked out for you.","tab-tax.jpg","A worksheet for your tax pro"),
 S(False,"Expenses","Running costs","Supplies, storage, apps: sorted.","Each on its Schedule C line. Monthly ones repeat on their own.","tab-exp.jpg","Import your bank or card CSV"),
 S(True,"Mileage","Mileage","Every sourcing mile counts.","Thrift runs and post-office trips, worth the rate you set.","tab-miles.jpg","Export the year as CSV"),
 S(False,"Inventory table","Find anything","Sort, search and filter it all.","By status, category, platform or how long it’s sat. Stale stock stands out.","tab-table.jpg","Grid, compact or table"),
 S(True,"Private","Private &amp; offline","Your shop stays yours.","No account, no bank login, nothing uploaded. One-click backups.","tab-settings.jpg","Works offline on Mac and PC"),
 {"kind":"themes","label":"Themes","eyebrow":"Make it yours","headline":"Eight looks, one clear shop.","columns":4,"themes":[{"name":n.title(),"image":f"theme-{n}.jpg","swatch":c} for n,c in [("lavender","#2E2040"),("blush","#63304A"),("sage","#1F4A3E"),("fjord","#1C3C52"),("linen","#45392A"),("slate","#2E3841"),("night","#221C2C"),("midnight","#0B303D")]]}]
deck={"product":"Reseller Profit Tracker","footer":"Reseller Profit Tracker · JPS Digital Pages","images_dir":"shots","output":"Reseller_Profit_Tracker_Etsy_Mockups.html","storage_prefix":"rpt2-kit-img:","brand":brand,"slides":slides,
 "listing":{"title":"Reseller Spreadsheet, Reseller Inventory Tracker, Reseller Profit Tracker, Thrift Flipping Sales Tracker, Schedule C, No Subscription",
  "tags":["reseller spreadsheet","reseller tracker","inventory tracker","profit tracker","reseller inventory","flipping tracker","thrift flipping","resale business","sales tracker","cost of goods sold","schedule c","small business","bookkeeping"],
  "description_file":"description.txt"}}
L=deck['listing'];assert len(L['title'])<=140 and len(L['tags'])==13 and all(len(t)<=20 for t in L['tags']),'title/tags'
json.dump(deck,open('deck.json','w'),indent=1,ensure_ascii=False)
