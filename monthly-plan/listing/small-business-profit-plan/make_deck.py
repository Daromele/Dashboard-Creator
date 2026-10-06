# Writes deck.json for the Small Business Profit Plan listing (run from this folder).
import json
brand={"ink":"#141A1F","bold":"#182635","pop":"#E3A73B","paper":"#F6F7F5","calm":"#1F7A5C"}
S=lambda d,l,e,h,s,img,f: {"dark":d,"label":l,"eyebrow":e,"headline":h,"sub":s,"image":img,"foot":f}
slides=[{"kind":"hero","dark":True,"label":"Hero","eyebrow":"Small business bookkeeping","headline":"Know what your<br>business keeps.","pills":["Profit &amp; loss","Schedule C","Invoices","No subscription"],"image":"tab-dashboard.jpg","alt":"Small Business Profit Plan dashboard"},
 S(False,"Profit and loss","Profit &amp; loss","What the business actually made.","Revenue, costs and net profit for any month, quarter or year. Print it.","tab-pl.jpg","Fictional sample business shown"),
 S(True,"Transactions","Income &amp; expenses","Every sale and cost, in one place.","Log in seconds, or import your bank CSV and Etsy, Shopify, PayPal or Stripe statements.","tab-activity.jpg","Sorted by category, channel and tag"),
 S(False,"Business health","Business health","How healthy is the business?","Runway, break-even revenue, margins and your biggest channel, from your own numbers.","tab-insights.jpg","Plain words, no jargon"),
 S(True,"Invoices","Invoices","Know who owes you.","Write invoices, mark them paid, and see what’s overdue at a glance.","tab-invoices.jpg","Friendly reminders, one click"),
 S(False,"Quarterly tax","Quarterly tax","Put the tax money aside as you go.","What to set aside before each due date, and whether you’re ahead.","tab-tax.jpg","Your rate, your rules"),
 S(True,"Schedule C","Tax time","A summary your accountant can work from.","Expenses sorted onto Schedule C lines, ready to print or export.","tab-taxlines.jpg","A worksheet, not tax advice"),
 S(False,"Mileage","Mileage log","Business miles, logged as you drive.","Trips, purpose and their deduction value at the rate you set.","tab-mileage.jpg","Export the year as CSV"),
 S(True,"Year","The year","Your whole year at a glance.","Monthly averages and where the money came from and went.","tab-annual.jpg","Click a slice to see its transactions"),
 S(False,"Cut costs","Cut costs","Find the savings.","Trim or cancel costs and see what they add up to over a year.","tab-cuts.jpg","Ideas from your own spending"),
 S(True,"Private","Private &amp; offline","Your numbers stay yours.","No login, no bank connection, nothing uploaded. One-click backups.","tab-settings.jpg","Works offline on Mac and PC"),
 {"kind":"themes","label":"Themes","eyebrow":"Make it yours","headline":"Six looks, one clear business.","columns":3,"themes":[{"name":n.title(),"image":f"theme-{n}.jpg","swatch":c} for n,c in [("ledger","#182635"),("sage","#1F4A3E"),("fjord","#1C3C52"),("slate","#2E3841"),("night","#221C2C"),("midnight","#0B303D")]]}]
deck={"product":"Small Business Profit Plan","footer":"Small Business Profit Plan · JPS Digital Pages","images_dir":"shots","output":"Small_Business_Profit_Plan_Etsy_Mockups.html","storage_prefix":"sbpp-kit-img:","brand":brand,"slides":slides,
 "listing":{"title":"Small Business Bookkeeping, Income Tracker, Business Expense Tracker, Profit and Loss, Schedule C, Mileage Log, Invoice Tracker",
  "tags":["bookkeeping","business expenses","expense tracker","income tracker","profit and loss","small business","schedule c","mileage log","invoice tracker","self employed","etsy seller","bookkeeping template","financial tracker"],
  "description_file":"description.txt"}}
L=deck['listing'];assert len(L['title'])<=140 and len(L['tags'])==13 and all(len(t)<=20 for t in L['tags']),'title/tags'
json.dump(deck,open('deck.json','w'),indent=1,ensure_ascii=False)
