# Writes deck.json for the Bakeweek Studio listing (run from this folder).
import json
brand={"ink":"#2A1A12","bold":"#3A2419","pop":"#F2B441","paper":"#FBF8F5","calm":"#A4471F"}
S=lambda d,l,e,h,s,img,f: {"dark":d,"label":l,"eyebrow":e,"headline":h,"sub":s,"image":img,"foot":f}
slides=[{"kind":"hero","dark":True,"label":"Hero","eyebrow":"Home bakery business planner","headline":"Your whole bake week,<br>planned for you.","pills":["Recipe costing","Orders","Shopping list","No subscription"],"image":"tab-week.jpg","alt":"Bakeweek Studio week plan"},
 S(False,"Recipe costs","Recipe cost calculator","Know what every bake costs.","Cost per piece, price and margin for every recipe, from your pack prices.","tab-recipetable.jpg","Fictional sample bakery shown"),
 S(True,"Orders","Order book","Every order in one place.","Custom orders, pre-orders and regulars, with balances and allergies.","tab-orders.jpg","Import or export as CSV"),
 S(False,"Pre-order menu","Pre-order menu","Post the menu. The plan fills itself.","Take orders until it closes; the bake plan and shopping list keep up.","tab-menu.jpg","Copy the menu text in one click"),
 S(True,"Shopping","Shopping list","The shopping list writes itself.","Every recipe totaled, pantry stock taken off, rounded to whole packs.","tab-shopping.jpg","Grouped by supplier"),
 S(False,"Batch sheets","Batch sheets","Know what to bake, and when.","Each day’s dough prep and bakes, scaled to the orders. Print and bake.","tab-batches.jpg","Hands-on time for every batch"),
 S(True,"Market days","Market days","Bring the right amount to market.","Plan stock, count what came home, and see your sell-through and leftovers.","tab-markets.jpg","Every market day, side by side"),
 S(False,"Profit","Profit &amp; expenses","See what you really earn.","Sales, ingredients, packaging and fees, and profit per hands-on hour.","tab-money.jpg","Bank CSV import included"),
 S(True,"Invoices","Invoices &amp; orders","Invoices and purchase orders.","Invoice cafés and caterers, order from your mill, see who owes whom.","tab-docs.jpg","Numbered, printable, paid off in a click"),
 S(False,"Labels","Labels","Labels with allergens, ready to print.","Ingredients by weight, allergens and dates on standard label sheets.","tab-labels.jpg","Check your local cottage-food rules"),
 S(True,"Standing orders","Standing orders","Bread clubs and wholesale, on repeat.","Regular drops join your order book ahead and bake like any order.","tab-standing.jpg","Pause or end any time"),
 S(False,"Private","Private &amp; offline","Your recipes stay yours.","No login, no subscription, nothing uploaded. One-click backups.","tab-settings.jpg","Works offline on Mac and PC"),
 {"kind":"themes","label":"Themes","eyebrow":"Make it yours","headline":"Eight looks, one calm kitchen.","columns":4,"themes":[{"name":n.title(),"image":f"theme-{n}.jpg","swatch":c} for n,c in [("kiln","#3A2419"),("fjord","#1C3C52"),("linen","#45392A"),("sage","#1F4A3E"),("ledger","#182635"),("slate","#2E3841"),("night","#221C2C"),("midnight","#0B303D")]]}]
deck={"product":"Bakeweek Studio","footer":"Bakeweek Studio · JPS Digital Pages","images_dir":"shots","output":"Bakeweek_Studio_Etsy_Mockups.html","storage_prefix":"bws-kit-img:","brand":brand,"slides":slides,
 "listing":{"title":"Recipe Cost Calculator, Home Bakery Business Planner, Bakery Order Tracker, Bakery Pricing, Cottage Bakery, No Subscription",
  "tags":["recipe cost sheet","recipe costing","bakery pricing tool","bakery cost sheet","home bakery","bakery planner","cottage bakery","bakery order form","ingredient cost","recipe pricing","bakery business","custom order form","bakery inventory"],
  "description_file":"description.txt"}}
L=deck['listing'];assert len(L['title'])<=140 and len(L['tags'])==13 and all(len(t)<=20 for t in L['tags']),'title/tags'
json.dump(deck,open('deck.json','w'),indent=1,ensure_ascii=False)
