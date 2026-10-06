# Writes deck.json for the Rental Property Tracker listing (run from this folder).
import json
brand={"ink":"#14263A","bold":"#1C3C52","pop":"#F2C46D","paper":"#F6F8FA","calm":"#2C5470"}
S=lambda d,l,e,h,s,img,f: {"dark":d,"label":l,"eyebrow":e,"headline":h,"sub":s,"image":img,"foot":f}
slides=[{"kind":"hero","dark":True,"label":"Hero","eyebrow":"Rental property tracker","headline":"Every rental,<br>one clear view.","pills":["Rent roll","Profit &amp; loss","Schedule E","No subscription"],"image":"tab-props.jpg","alt":"Rental Property Tracker: each property"},
 S(False,"Rent roll","Rent roll","Who paid, who’s late.","Every unit for the month: rent due, what arrived, and late fees ready to add.","tab-rentroll.jpg","Fictional sample landlord shown"),
 S(True,"Home","Home","What needs you this month.","Rent collected, who’s late, leases ending, urgent repairs: all on one screen.","tab-attention.jpg","Cap rate, cash-on-cash and the 1% rule per property"),
 S(False,"By property","Finances","Cash flow by property, any dates.","Income, running costs, NOI and cash flow for every property side by side.","tab-summary.jpg","This month, a quarter, year to date or your own dates"),
 S(True,"Profit and loss","Profit &amp; loss","A statement your accountant will like.","Income, expenses, NOI and net income, with a column per property.","tab-pl.jpg","Print it or export CSV"),
 S(False,"Schedule E","Tax time","Schedule E, done as you go.","Every expense lands on its Schedule E line, property by property.","tab-taxes.jpg","A worksheet for you or your tax pro"),
 S(True,"Tenants","Tenants &amp; leases","Leases, deposits and charges.","Bill a tenant for damage or utilities, and track what they still owe.","tab-tenants.jpg","Search and filter by property or status"),
 S(False,"Repairs","Repairs","Repairs and tenant requests.","Log a request, mark it done with the cost, and it’s in your expenses.","tab-repairs.jpg","Urgent ones show on your home screen"),
 S(True,"Letters","Letters &amp; notices","Eleven letters, filled in for you.","Welcome, late rent, rent increase, entry, move-out and more. Edit, print or copy.","tab-letters.jpg","To one tenant, a building or everyone"),
 S(False,"Calendar","Calendar","Your rental month at a glance.","Rent due, bills, lease dates and repairs, by week or by month.","tab-calendar.jpg","Click a rent to record it"),
 S(True,"Private","Private &amp; offline","Your tenants’ details stay with you.","No login, no bank connection, nothing uploaded. One-click backups.","tab-settings.jpg","Import your bank’s CSV when you want to"),
 {"kind":"themes","label":"Themes","eyebrow":"Make it yours","headline":"Eight looks. Every door covered.","columns":4,"themes":[{"name":n.title(),"image":f"theme-{n}.jpg","swatch":c} for n,c in [("fjord","#1C3C52"),("slate","#2E3841"),("sage","#1F4A3E"),("linen","#45392A"),("lavender","#2E2040"),("blush","#63304A"),("night","#221C2C"),("midnight","#0B303D")]]}]
deck={"product":"Rental Property Tracker","footer":"Rental Property Tracker · JPS Digital Pages","images_dir":"shots","output":"Rental_Property_Tracker_Etsy_Mockups.html","storage_prefix":"rpt-kit-img:","brand":brand,"slides":slides,
 "listing":{"title":"Rental Property Tracker, Rental Income Tracker, Landlord Rent Roll, Rental Property Bookkeeping, Schedule E, Profit & Loss, No Subscription",
  "tags":["rental property","rental income","landlord spreadsheet","rent roll","rental bookkeeping","property management","landlord tracker","schedule e","tenant ledger","rental expenses","real estate tracker","landlord binder","rent tracker"],
  "description_file":"description.txt"}}
L=deck['listing'];assert len(L['title'])<=140 and len(L['tags'])==13 and all(len(t)<=20 for t in L['tags']),'title/tags'
json.dump(deck,open('deck.json','w'),indent=1,ensure_ascii=False)
