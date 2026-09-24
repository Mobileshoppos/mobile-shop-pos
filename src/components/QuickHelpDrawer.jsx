import React, { useState, useMemo } from 'react';
import { Drawer, Input, Typography, Button, Space, theme, Card, Divider, Segmented } from 'antd';
import { 
  SearchOutlined, 
  ArrowLeftOutlined,
  CloseOutlined,
  FileTextOutlined,
  BulbOutlined,
  WhatsAppOutlined
} from '@ant-design/icons';
import { useLocation } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

// --- DUKAN KI TAMAM HELP GUIDES (Bilingual: Roman Urdu + English) ---
const HELP_GUIDES = [
  // ==========================================
  // --- 1. DASHBOARD GUIDES ---
  // ==========================================
  {
    id: 'dash-sales',
    category: 'dashboard',
    page: '/',
    title: {
      ur: 'Dukan Ki Bikri (Sales) aur Growth % Samajhna',
      en: 'Understanding Sales Overview & Growth Trends'
    },
    summary: {
      ur: 'Dashboard par dukan ki rozana, haftawar aur mahana bikri (Sale) aur pichle dinon ke muqablay mein taraqqi (Growth %) check karein.',
      en: 'Monitor your daily, weekly, and monthly sales performance with real-time growth percentage comparisons.'
    },
    steps: {
      ur: [
        'Dashboard ke top right par "Today", "This Week", "This Month" ya "Custom" button daba kar muddat (date range) select karein.',
        '"Today\'s Sales" card aapko dukan ki kul bechi gayi raqam batata hai (Tax is se alag hota hai taake sachha hisaab miley).',
        'Card ke neechay "Growth %" arrow se pata chalta hai ke sale kal ya pichle haftay ke muqablay mein kitne feesad barhi ya kam hui hai.',
        'Agar koi customer maal wapis kar ke jaye aur restocking fee lagi ho, to wo fee bhi is card mein shamil hoti hai.',
        'Salesman / Staff jab login karega to usay dukan ka hisaab chupane ke liye sirf POS shuru karne ka welcome button nazar aayega.'
      ],
      en: [
        'Select your desired timeframe (Today, This Week, This Month, or Custom) from the top-right filter.',
        'The "Today\'s Sales" card displays your total sales revenue excluding taxes for accurate accounting.',
        'The Growth percentage arrow indicates whether your sales increased or decreased compared to the previous period.',
        'If customers returned items with restocking fees, those fees are automatically consolidated here.',
        'Sales staff members see a simplified greeting card with quick POS access while keeping financial stats private.'
      ]
    },
    tip: {
      ur: 'Agar aap Free Plan par hain to Monthly aur Custom date filter lock honge; unhein unlock karne ke liye Growth plan par upgrade karein.',
      en: 'Monthly and custom date filters are unlocked in the Growth plan and above.'
    },
    example: {
      ur: 'Agar kal dukan ki sale 10,000 thi aur aaj 12,000 hui, to card mein Green Arrow ke sath +20.0% Growth vs Yesterday nazar aayegi.',
      en: 'If yesterday\'s revenue was PKR 10,000 and today reached PKR 12,000, you will see +20.0% Growth vs Yesterday.'
    }
  },
  {
    id: 'dash-cash-bank',
    category: 'dashboard',
    page: '/',
    title: {
      ur: 'Dukan Ka Cash Drawer, Bank Balance aur Cash In / Out Karna',
      en: 'Cash Drawer, Bank Balances & Manual Cash Adjustments'
    },
    summary: {
      ur: 'Counter drawer mein mojood physical cash, bank accounts aur JazzCash/Easypaisa ka kul hisaab check karein aur paisa transfer karein.',
      en: 'Track physical counter drawer cash alongside Meezan/HBL bank balances and mobile wallets with 1-click cash transfers.'
    },
    steps: {
      ur: [
        '"Total Cash & Bank" card dukan ke tamam counters aur bank accounts ka kul majmua (Grand Total) dikhata hai.',
        'Card ke andar scroll karke dekhein: Har counter ka alag cash aur har Bank/Wallet ka alag balance wazeh likha hota hai.',
        'Counter mein se paisa nikaalne ya daalne ke liye card ke upar mojood "Cash Adjustment (⇄)" icon dabayein.',
        '"Cash In" se dukan mein paisa jama karein, "Cash Out" se zaati kharche ke liye nikalein, aur "Transfer" se counter se bank mein bhejein.',
        'Settings mein "Registers & Accounts" se aap jitne chahein Banks (Meezan, HBL) aur Wallets (JazzCash) add kar sakte hain.'
      ],
      en: [
        'The "Total Cash & Bank" card consolidates all your physical sales counters, bank accounts, and mobile wallets.',
        'Scroll inside the card to see the exact breakdown of each register counter and individual bank account.',
        'Click the "Cash Adjustment (⇄)" button on the top right of the card to log manual cash movements.',
        'Choose "Cash In" to add capital, "Cash Out" for owner withdrawals or petty expenses, and "Transfer" to deposit counter cash into the bank.',
        'Manage and add unlimited bank accounts or mobile wallets from Settings > Registers & Accounts.'
      ]
    },
    tip: {
      ur: 'Shaam ko counter band karte waqt system khud hisaab milata hai ke drawer mein kitna cash hona chahiye taake chori ya ghalti pakri ja sakay.',
      en: 'During shift closing, the system calculates expected drawer cash automatically to catch shortages immediately.'
    },
    example: {
      ur: 'Dukan ke malik ne counter se 5,000 zaati kharch ke liye nikale? "Cash Out" karein aur reason mein "Owner Withdrawal" likhein taake closing mein shortage na aaye.',
      en: 'Owner took PKR 5,000 from the drawer for personal use? Log a "Cash Out" entry under "Owner Withdrawal" to prevent end-of-day discrepancy.'
    }
  },
  {
    id: 'dash-profit',
    category: 'dashboard',
    page: '/',
    title: {
      ur: 'Gross Profit aur Net Profit (Asli Bachat) Ka Hisaab',
      en: 'Understanding Gross Profit vs Net Profit Margins'
    },
    summary: {
      ur: 'Dukan ki sachhi bachat ka pata lagayein: Maal ki khareed qeemat, bijli/kiraya aur Damaged stock ka nuqsan nikaal kar bacha hua munafa.',
      en: 'Learn how true net profit is calculated by deducting purchase cost, store expenses, and damaged inventory losses from revenue.'
    },
    steps: {
      ur: [
        '"Gross Profit" ka matlab hai: Bikri (Sale) mein se bechi gayi cheezon ki asal khareed qeemat (Purchase Cost) nikaal kar bacha hua munafa.',
        '"Net Profit" ka matlab hai: Gross Profit mein se dukan ke tamam kharche (Kiraya, Bijli, Chaye, Tankhwah) aur Damaged Stock ka nuqsan nikaalne ke baad ka ASLI munafa.',
        '"Margin %" batata hai ke har 100 rupay ki bikri par dukan ko kitne rupay ki sachhi bachat ho rahi hai.',
        'SadaPOS mein Tax (GST/VAT) ko munafay se alag rakha jata hai taake dukan ki bachat mein koi ghalt fehmi na ho.'
      ],
      en: [
        'Gross Profit = Total Revenue minus the Cost of Goods Sold (purchase price of sold inventory).',
        'Net Profit = Gross Profit minus all operating expenses (rent, electricity, salaries) minus damaged/expired stock loss.',
        'Profit Margin % reveals your true percentage return on every PKR 100 of revenue.',
        'Taxes collected are segregated from revenue to ensure 100% financial and tax accuracy.'
      ]
    },
    tip: {
      ur: 'Settings mein "Live Profit Indicator (POS)" on karne se sale karte waqt cart ke andar har item ka live munafa sirf dukan ke malik ko nazar aata hai.',
      en: 'Enable "Live Profit Indicator (POS)" in Settings to see real-time item-level profit margins during checkout (Owner view only).'
    },
    example: {
      ur: 'Agar 10,000 ka maal 15,000 mein bika (Gross Profit 5,000), aur dukan ka kharcha 1,500 hua, to aapka Net Profit 3,500 PKR hoga.',
      en: 'If items bought for PKR 10,000 are sold for PKR 15,000 (Gross Profit PKR 5,000) with PKR 1,500 in expenses, your Net Profit is PKR 3,500.'
    }
  },
  {
    id: 'dash-expenses',
    category: 'dashboard',
    page: '/',
    title: {
      ur: 'Dukan Ke Rozana Akhrajat (Expenses) Track Karna',
      en: 'Tracking Operating Expenses & Expense Breakdown'
    },
    summary: {
      ur: 'Chaye, bijli ka bill, dukan ka kiraya aur staff tankhwah ke kharche dashboard par live track karein.',
      en: 'Categorize and monitor daily store expenditures including utilities, rent, employee salaries, and petty cash.'
    },
    steps: {
      ur: [
        '"Total Expenses" card chuni hui muddat (Today/Month) ke tamam kharchon ka majmua dikhata hai.',
        'Card ke andar Category-wise list (jaise Rent, Utilities, Salaries, Maintenance, Miscellaneous) nazar aati hai.',
        'Naya kharcha darj karne ke liye Side Menu se "Expenses" par jayein aur "Add Expense" dabayein.',
        'Kharcha darj hote hi Dashboard ka Net Profit khud-ba-khud kam ho kar sachhi bachat dikhayega.'
      ],
      en: [
        'The "Total Expenses" card aggregates all expenditures recorded within the selected date range.',
        'A category breakdown inside the card shows exact spending across Rent, Utilities, Salaries, and Miscellaneous.',
        'To record a new expense, navigate to "Expenses" in the side menu and click "+ Add Expense".',
        'Logged expenses automatically deduct from your Gross Profit to maintain an accurate Net Profit.'
      ]
    },
    tip: {
      ur: 'Settings mein ja kar aap dukan ke hisaab se custom expense categories (jaise Generator Fuel, Tea/Refreshment) bana sakte hain.',
      en: 'Create custom expense categories (e.g. Generator Fuel, Tea) from the Expense Categories menu.'
    },
    example: {
      ur: 'Dukan ke liye 200 PKR ki chaye aayi? Expenses mein darj karein, yeh foran aaj ke munafay se minus ho jayegi.',
      en: 'Ordered PKR 200 tea for customers? Add it to Expenses to immediately reflect in today\'s net profit.'
    }
  },
  {
    id: 'dash-receivables-payables',
    category: 'dashboard',
    page: '/',
    title: {
      ur: 'Udhaar Ka Khata: Market Se Lena aur Suppliers Ko Dena',
      en: 'Accounts Receivable (Debtors) & Accounts Payable (Creditors)'
    },
    summary: {
      ur: 'Market ka kul udhaar track karein taake pata chalay grahakon se kitna paisa lena hai aur wholesalers ko kitna dena hai.',
      en: 'Track total outstanding customer debt against supplier liabilities, staff salaries due, and customer credits.'
    },
    steps: {
      ur: [
        '"Accounts Receivable" ka matlab hai wo kul raqam jo Grahakon (Customers) ne hamari dukan ko deni hai (Udhaar).',
        '"Accounts Payable (To Pay)" ka matlab hai wo kul raqam jo hum ne Suppliers (Wholesalers) ko ada karni hai + Staff ki baqi tankhwah.',
        'Agar kisi customer ka advance paisa jama ho ya return ki wajah se bacha ho, to wo "Customer Credits" mein nazar aata hai.',
        'Tafseeli khata dekhne ke liye Customers ya Suppliers dashboard par jayein.'
      ],
      en: [
        'Accounts Receivable indicates total outstanding credit owed to your store by customers.',
        'Accounts Payable shows total pending balances owed to wholesale suppliers plus staff salaries due.',
        'Customer Credits reflect advance deposits or credit balances resulting from sales returns.',
        'Click on Customers or Suppliers in the side menu to view detailed ledger statements and record payments.'
      ]
    },
    tip: {
      ur: 'Settings se "Customer Credit Limits" on karein taake koi salesman customer ki muqarrar kardah limit se zyada udhaar na de sakay.',
      en: 'Enable "Customer Credit Limits" in Settings to enforce strict debt limits and prevent unauthorized credit sales.'
    },
    example: {
      ur: 'Customer Rashid ne 15,000 dene hain aur Supplier Zamzam ko 36,000 dene hain? Dono cards mein live total update rahega.',
      en: 'Customer owes PKR 15,000 while supplier balance is PKR 36,000? Both values are tracked in real-time.'
    }
  },
  {
    id: 'dash-daybook',
    category: 'dashboard',
    page: '/',
    title: {
      ur: 'Roznamcha / Day Book (Daily Financial Summary)',
      en: 'Daily Financial Summary (Day Book Audit Sheet)'
    },
    summary: {
      ur: 'Subah dukan kholne se shaam band karne tak har aik rupay ki aamad aur kharch ka audit hisaab check karein.',
      en: 'Comprehensive day-by-day financial log reconciling daily sales, purchases, customer receipts, payments, and net cash flow.'
    },
    steps: {
      ur: [
        'Dashboard ke darmiyan mein "Daily Financial Summary" table par jayein.',
        'Har tareekh ke aage Daily Sale, Purchases, Receipts (Wusooli), aur Payments (Adaigi) ka alag alag column hai.',
        '"Daily Net" column batata hai ke us din dukan mein kul kitna cash jama hua ya kam hua.',
        'Kisi bhi raqam par click karne se us din ke tamam bills aur vouchers ka pop-up khul jata hai.',
        '"Export Options" dabane se poora roznamcha Excel ya PDF Print document mein nikaal sakte hain.'
      ],
      en: [
        'Navigate to the "Daily Financial Summary" table located in the center of the Dashboard.',
        'Each date row outlines Daily Sales, Purchases, Cash Receipts (collections), and Payments made.',
        'The "Daily Net" column reveals the exact net liquidity increase or decrease for that business day.',
        'Click directly on any amount in the table to open an instant drill-down breakdown of transactions.',
        'Click "Export Options" to download the day book audit report in Excel or print format.'
      ]
    },
    tip: {
      ur: 'Shaam ko dukan band karte waqt Day Book check karein taake physical cash aur computer ke hisaab mein 1 rupay ka bhi farq na rahe.',
      en: 'Reconcile your physical drawer against the Day Book at closing to maintain 100% accounting integrity.'
    },
    example: {
      ur: 'Agar aaj 4,000 ki sale hui aur 4,200 cash jama hua (purani wusooli mila kar), to Daily Net mein +PKR 4,200 nazar aayega.',
      en: 'If you sold PKR 4,000 and collected PKR 4,200 total receipts, Daily Net will reflect +PKR 4,200.'
    }
  },
  {
    id: 'dash-alerts',
    category: 'dashboard',
    page: '/',
    title: {
      ur: 'Khatam Hone Wala Maal aur Expiry Alerts (Low Stock & Expiry)',
      en: 'Low Stock Warnings & Expiring Inventory Alerts'
    },
    summary: {
      ur: 'Maal khatam hone se pehle naya stock mangwane aur expire hone wali cheezon ko wapis karne ka tareeqa.',
      en: 'Proactive inventory notifications to reorder depleted stock and return batches expiring within 30 days.'
    },
    steps: {
      ur: [
        '"Low Stock Alert" card mein wo items aate hain jinki quantity muqarrar kardah limit (Default 5) se kam ho gayi ho.',
        '"View All" dabane se Inventory mein sirf wo items filter ho jate hain jin ka naya order dena zaroori hai.',
        '"Expiring Soon" card mein wo dawaaiyan ya grocery items aate hain jo aglay 30 dinon mein expire hone wale hon.',
        'Lal rang ka Return icon (↺) dabane se item foran Supplier ko wapis karne ke page par chala jata hai.',
        'Neeche "Inventory Assets" card batata hai ke is waqt dukan mein kul kitne rupay ka maal (Stock) mojood hai.'
      ],
      en: [
        'The "Low Stock Alert" card identifies products whose quantity has reached or fallen below the threshold (Default: 5).',
        'Click "View All" to view a filtered reorder list in the Inventory module.',
        'The "Expiring Soon" card alerts you to stock expiring within the configured threshold (Default: 30 days).',
        'Click the Red Return icon (↺) to initiate an instant purchase return back to your supplier.',
        'The "Inventory Assets" card calculates your total warehouse valuation based on purchase cost.'
      ]
    },
    tip: {
      ur: 'Settings > Inventory se aap Low Stock Threshold (jaise 10 units) aur Expiry Alert Days (jaise 60 din) apni marzi se set kar sakte hain.',
      en: 'Customize Low Stock Thresholds and Expiry Alert Days anytime from App Settings > Inventory.'
    },
    example: {
      ur: 'Oppo A6 ke sirf 2 piece bache hain? Low Stock card mein foran lal rang ki warning aa jayegi taake aap naya order kar sakein.',
      en: 'Charging Cables down to 2 units? The alert card warns you immediately so you can reorder before stockout.'
    }
  },

  // ==========================================
  // --- 2. INVENTORY & CATEGORIES GUIDES ---
  // ==========================================
  {
    id: 'inv-concept',
    category: 'inventory',
    page: '/inventory',
    title: {
      ur: 'Product Models vs Stock (Purchase) Ka Farq Samajhna',
      en: 'Understanding Product Models vs Receiving Stock'
    },
    summary: {
      ur: 'Pehle Product Model banta hai jiska stock 0 hota hai, phir Supplier Purchase Invoice se dukan mein physical stock dakhil hota hai.',
      en: 'Learn the two-step inventory architecture: Defining catalog product models and receiving physical inventory via purchase invoices.'
    },
    steps: {
      ur: [
        'Marhala 1 (Product Model): Pehle "+ New Product Model" daba kar item ka naam (e.g. Oppo A6 ya Type-C Cable) aur category banayein. Is waqt iska stock 0 hoga.',
        'Marhala 2 (Purchase Bill): Stock daalne ke liye "+ (Add Stock)" dabayein. Yeh aapko Purchase Invoice page par le jayega.',
        'Purchase Invoice mein Supplier (Wholesaler) select karein, Godown/Shop chunain, aur khareed qeemat darj karein.',
        'Save karte hi maal aapki dukan ke Asli Stock mein jama ho jayega aur POS par bikne ke liye tayyar ho jayega.'
      ],
      en: [
        'Step 1 (Catalog Model): Click "+ New Product Model" to define the product name, brand, and category. Its quantity remains 0 initially.',
        'Step 2 (Purchase Invoice): Click "+ (Add Stock)" on the model to open the Purchase Entry page.',
        'Select the Supplier, destination Warehouse/Shop, and specify purchase price and quantity.',
        'Saving the purchase immediately loads live available stock into Inventory and POS.'
      ]
    },
    tip: {
      ur: 'Khatay ki durustagi ke liye dukan mein aane wala har maal hamesha Purchase Invoice ke zariye dakhil karein taake Supplier ka udhaar aur purchase cost sahi rahay.',
      en: 'Always record inventory via Purchase Invoices so supplier ledgers and purchase costs remain 100% accurate.'
    },
    example: {
      ur: 'Aapne Samsung A15 bechna hai? Pehle Model banayein, phir Wholesaler "Zamzam Mobiles" se 10 piece ka purchase bill darj karein.',
      en: 'Selling Samsung A15? First create the product model, then record a 10-unit purchase invoice from your distributor.'
    }
  },
  {
    id: 'inv-variants',
    category: 'inventory',
    page: '/inventory',
    title: {
      ur: 'Variants Kaise Bante Hain (Color, Storage, Specs)',
      en: 'How Product Variants & Barcodes are Created'
    },
    summary: {
      ur: 'Ek hi product ke mukhtalif rang (Black, Blue) aur sizes (64GB, 128GB) ke alag alag stock aur barcodes banana.',
      en: 'How selecting different attributes (Color, RAM, Storage) automatically generates distinct variants with unique barcodes and stock.'
    },
    steps: {
      ur: [
        'Purchase Invoice banate waqt jab aap item add karte hain, to category ke mutabiq Attributes (e.g. Color, RAM, Storage, Speed) nazar aate hain.',
        'Mukhtalif options (jaise Black / 128GB) select karne se system us variant ka alag barcode aur alag stock count banata hai.',
        'Doosra variant (jaise Blue / 256GB) add karne ke liye dobara item par click karein aur nayi specification chunain.',
        'Inventory table mein [+] dabane se us product ke tamam variants ki alag alag qeematein aur stock wazeh nazar aati hain.'
      ],
      en: [
        'When adding items during purchase entry, category attributes (Color, Storage, RAM, etc.) appear dynamically.',
        'Selecting distinct attributes (e.g., Black / 128GB) automatically creates a unique variant with its own stock and barcode.',
        'To add another variation (e.g., Blue / 256GB), click the item again from the catalog and select the second variation.',
        'Clicking [+] on the Inventory table expands and displays all variants with their individual stock levels and prices.'
      ]
    },
    tip: {
      ur: 'Agar koi naya rang ya size list mein na ho, to dropdown ke andar hi naya naam likh kar "Add" dabane se wo hamesha ke liye save ho jata hai.',
      en: 'Type any new color or size directly into the dropdown and press Add to save it permanently for future use.'
    },
    example: {
      ur: 'Charging Cable ke 2 variants: 10 units "Type-C / 65W" aur 15 units "Lightning / 20W" — dono ka alag alag stock aur barcode hoga.',
      en: 'Charging Cables with 2 variants: 10 units of "Type-C / 65W" and 15 units of "Lightning / 20W" — each tracked separately.'
    }
  },
  {
    id: 'inv-categories-attributes',
    category: 'inventory',
    page: '/inventory',
    title: {
      ur: 'Categories, Parent-Child aur Naye Custom Fields Banana',
      en: 'Managing Categories, Sub-categories & Custom Fields'
    },
    summary: {
      ur: 'Dukan ki categories (Mobiles, Accessories, Grocery) aur unke andar Custom Fields (RAM, Storage, Size, Fabric) set karna.',
      en: 'Structure your catalog using parent/child categories and define dynamic custom fields (RAM, Storage, Material, Expiry).'
    },
    steps: {
      ur: [
        'App shuru karte hi aapke business (Mobile Shop, Grocery, Pharmacy, Garments) ke mutabiq standard categories khud ban jati hain.',
        'Main Category (Parent) jaise "Mobile Phones & Devices" ke andar Sub-Categories (Child) hoti hain jaise "Smartphones (With IMEI)".',
        'Nayi category banane ke liye Categories page par "Add New" dabayein. Agar sub-category banani ho to Parent Category select karein.',
        'Category ke andar custom fields (jaise RAM, Storage, PTA Status, Connector Type) daalne ke liye "Add Custom Field" dabayein.',
        'Field Type mein "Select (Dropdown)" chun kar options (e.g. 4GB, 8GB, 12GB) type karke Enter dabayein.'
      ],
      en: [
        'The system automatically pre-loads industry-standard categories based on your business type (Mobile, Grocery, Pharmacy, Garments).',
        'Main Categories (Parents) group broad areas, while Sub-categories (Children) inherit attributes and specify stock tracking.',
        'To add a new category, click "Add New" on Categories page. Select a Parent Category to make it a sub-category.',
        'Click "Add Custom Field" to attach dynamic attributes (e.g. RAM, Storage, PTA Status, Connector Type) to the category.',
        'Choose "Select (Dropdown)" type and type your predefined options (e.g. 4GB, 8GB, 12GB) pressing Enter after each.'
      ]
    },
    tip: {
      ur: 'Categories theek tarah set hone se Purchase daalte waqt aur POS par sale karte waqt filtering 10 guna tez ho jati hai.',
      en: 'Proper category attributes make product filtering in Inventory and POS lightning fast.'
    },
    example: {
      ur: 'Garments category mein "Fabric" (Cotton, Silk, Lawn) aur "Size" (S, M, L, XL) ki fields asani se banayi ja sakti hain.',
      en: 'For a Garments store, create custom fields for "Fabric" (Cotton, Silk) and "Size" (S, M, L, XL).'
    }
  },
  {
    id: 'inv-imei-vs-bulk',
    category: 'inventory',
    page: '/inventory',
    title: {
      ur: 'IMEI (Serial) vs Quantity (Bulk) Mein Farq',
      en: 'IMEI / Serial Tracking vs Quantity Bulk Items'
    },
    summary: {
      ur: 'Mobile phones ka har piece alag serial se track hota hai jabke cables/chargers quantity mein gine jate hain.',
      en: 'Understand individual device tracking (IMEI/Serial numbers) versus bulk quantity accessory inventory.'
    },
    steps: {
      ur: [
        'Category banate waqt "Stock Tracking Type" faisla karta hai ke item IMEI wala hai ya Bulk wala.',
        'IMEI Based Category (Smartphones, Tablets, Laptops): Har piece ka alag IMEI scan karna parta hai aur har piece ki quantity hamesha 1 hoti hai.',
        'Quantity Based Category (Accessories, Cables, Grocery): Ismein IMEI ki zaroorat nahi hoti, sirf kul tadad (jaise 50 pieces) aur aik barcode hota hai.',
        'POS par sale karte waqt IMEI wale mobile ka exact IMEI scan karna hota hai, jabke accessories ka barcode scan karte hi quantity add hoti hai.'
      ],
      en: [
        'The category\'s "Stock Tracking Type" determines whether items require individual serial tracking or bulk quantity counting.',
        'IMEI Categories (Smartphones, Laptops): Each unit requires a unique scanned serial/IMEI number with quantity strictly fixed to 1.',
        'Bulk Categories (Accessories, Parts, Consumables): No IMEI needed — managed by total available quantity and a single scannable barcode.',
        'During POS checkout, scanning an IMEI sells that exact device, while scanning an accessory barcode increments cart quantity.'
      ]
    },
    tip: {
      ur: 'Warranty claim ya return ke waqt IMEI scan karne se system foran batata hai ke yeh mobile kis tareekh ko kis grahak ko bika tha.',
      en: 'Scanning an IMEI during returns or warranty lookup instantly traces the exact sale invoice, customer, and date.'
    },
    example: {
      ur: 'Samsung S24 ka har mobile alag IMEI se save hoga, jabke 100 Glass Protectors ek hi barcode aur 100 quantity se save honge.',
      en: 'Samsung S24 units are saved with individual unique IMEIs, while 100 Glass Protectors share a single barcode and 100 total quantity.'
    }
  },
  {
    id: 'inv-barcode-print',
    category: 'inventory',
    page: '/inventory',
    title: {
      ur: 'Barcode Generate Karna Aur Sticker Print Karna',
      en: 'How to Generate Barcodes & Print Thermal Stickers'
    },
    summary: {
      ur: 'Automatic barcode banayein aur thermal sticker printer se 50x25mm label print karein.',
      en: 'Generate standard barcodes for bulk items and print stickers directly to your thermal barcode printer.'
    },
    steps: {
      ur: [
        'Inventory table mein item ke aage Edit (Pencil) icon dabayein.',
        '"Generate" button dabayein taake system automatic unique barcode (jaise CAB-49201) bana de.',
        'Blue Printer icon daba kar sticker printer kholain, label size (50x25mm) select karein aur print kar lein.',
        'Purchase History se aap poori khareedari ke tamam stickers ek click par bulk print kar sakte hain.'
      ],
      en: [
        'In the Inventory list, click the Edit (Pencil) icon next to any product or variant.',
        'Click "Generate" to automatically create a unique barcode (e.g., CAB-49201).',
        'Click the Blue Printer icon to open the sticker printer, select your label size (e.g., 50x25mm), and click Print.',
        'You can also print bulk barcode stickers for an entire purchase invoice at once from Purchase History.'
      ]
    },
    tip: {
      ur: 'Standard mobile shop accessory stickers ke liye 50mm x 25mm thermal roll size sab se behtareen hai.',
      en: 'Use 50mm x 25mm thermal roll for standard small accessory stickers.'
    },
    example: {
      ur: 'Sticker par Dukan Ka Naam, Product Name, Price aur Barcode sab aik sath print hota hai.',
      en: 'The printed sticker includes Shop Name, Product Name, Price, and the scannable Barcode.'
    }
  },
  {
    id: 'inv-transfer-damaged',
    category: 'inventory',
    page: '/inventory',
    title: {
      ur: 'Godown Transfer (⇄) Aur Kharab Maal (Damaged Stock)',
      en: 'Stock Transfers Between Godowns & Damaged Stock Audit'
    },
    summary: {
      ur: 'Ek dukan/godown se doosri dukan maal bhejein ya kharab/expire maal ko audit mein record karein.',
      en: 'Transfer inventory between multiple store branches/godowns and write off damaged/expired stock safely.'
    },
    steps: {
      ur: [
        'Stock Transfer (⇄): Inventory table mein item ke aage "⇄" icon dabayein, destination godown aur quantity select karein aur "Transfer Now" dabayein.',
        'Damaged Stock: Agar koi item toot gaya ya kharab ho gaya, to Alert icon dabayein aur damaged quantity darj karein.',
        'Kharab maal foran active stock se nikal jata hai taake salesman ghalti se customer ko na bech de.',
        'Damaged stock ka nuqsan Dashboard ke Net Profit se khud-ba-khud minus ho jata hai taake audit 100% sachha rahe.',
        'Agar supplier kharab maal wapis le le ya repair kar de, to Damaged Stock page se "Restore" karke wapis active stock bana sakte hain.'
      ],
      en: [
        'Stock Transfer (⇄): Click the "⇄" icon next to any item in Inventory, choose the destination warehouse, enter quantity, and transfer.',
        'Damaged Stock: If an item is broken, defective, or expired, click the Alert icon and specify the quantity to write off.',
        'Written-off stock is instantly removed from active available inventory to prevent accidental sales.',
        'Damaged stock write-offs automatically deduct from your Net Profit to maintain accurate financial books.',
        'If the supplier replaces or repairs the damaged item, click "Restore" on the Damaged Stock page to return it to available stock.'
      ]
    },
    tip: {
      ur: 'Settings > Warehouses se aap dukan ke mukhtalif Godowns aur Branches bana sakte hain.',
      en: 'Create and manage multiple warehouse godowns or branch locations from App Settings > Registers & Accounts.'
    },
    example: {
      ur: 'Main Shop se Godown 2 mein 10 cables bhejni hain? "⇄" dabayein aur Godown 2 select karein.',
      en: 'Moving 10 fast-charging cables from Main Shop to Godown 2? Click "⇄" and select Godown 2.'
    }
  },

  // ==========================================
  // --- 3. WARRANTY & CLAIMS GUIDES ---
  // ==========================================
  {
    id: 'war-lookup',
    category: 'warranty',
    page: '/warranty',
    title: {
      ur: 'IMEI Ya Invoice QR Scan Karke Warranty Check Karna',
      en: 'Checking Warranty via IMEI or Invoice QR Code'
    },
    summary: {
      ur: 'Grahak ke mobile ka IMEI scan karein ya raseed ka QR code scan karke bachi hui warranty aur khareedari ki tareekh check karein.',
      en: 'Scan device IMEI or receipt QR code to instantly verify customer warranty, sale date, and supplier warranty.'
    },
    steps: {
      ur: [
        '"Scan Invoice QR or IMEI" box mein cursor rakh kar customer ki raseed ka QR scan karein ya mobile ka IMEI number likhein.',
        'Search dabate hi item ka naam, grahak ka naam, bechne ki tareekh aur asal Wholesaler (Supplier) foran samne aa jayenge.',
        'System batayega ke Customer Warranty mein kitne din bache hain aur Supplier Warranty kab tak valid hai.',
        'Agar warranty valid ho, to "Register Repair Claim" button khud enable ho jata hai.'
      ],
      en: [
        'Place cursor in "Scan Invoice QR or IMEI" field and scan the receipt QR code or enter the IMEI number.',
        'Clicking Search immediately displays product name, customer details, sale date, and the original wholesale supplier.',
        'The system calculates remaining days of Customer Warranty and validates Supplier Warranty.',
        'If warranty is active, the "Register Repair Claim" button becomes available immediately.'
      ]
    },
    tip: {
      ur: 'Agar item dukan mein mojood ho aur bika na ho, to system "In Stock" batata hai taake ghalti se beche bina claim na ban jaye.',
      en: 'If an item is still in stock and unsold, the system prevents accidental warranty claim registration.'
    },
    example: {
      ur: 'Customer ne 6 mahine pehle mobile khareeda tha? IMEI scan karte hi pata chal jayega ke abhi 180 din warranty bachi hai.',
      en: 'Customer bought a phone 6 months ago? Scanning the IMEI instantly confirms 180 days of warranty remaining.'
    }
  },
  {
    id: 'war-register-claim',
    category: 'warranty',
    page: '/warranty',
    title: {
      ur: 'Kharab Mobile Ka Claim Register Karna Aur Raseed Dena',
      en: 'Registering Repair Claims & Printing Customer Claim Slips'
    },
    summary: {
      ur: 'Kharab mobile grahak se receive karein, fault darj karein aur customer ko official Claim Slip print karke dein.',
      en: 'Receive defective devices, log customer issues, and print official claim tracking slips.'
    },
    steps: {
      ur: [
        'Item search karne ke baad "Register Repair Claim" button dabayein.',
        'Mobile ka masla (jaise "Screen flickering", "Not charging", "Dead phone") tafseel se likhein aur save karein.',
        'System khud-ba-khud unique Claim Number (jaise CLM-A1234) generate kar dega.',
        'Printer icon dabane se grahak ke liye "Repair Claim Slip" print ho jayegi jise dikha kar wo baad mein mobile wapis le sakega.'
      ],
      en: [
        'After searching the product, click "Register Repair Claim".',
        'Describe the exact fault (e.g., screen flickering, charging failure) and save the claim.',
        'The system automatically generates a unique Claim ID (e.g. CLM-A1234).',
        'Click the Printer icon to print an official Customer Claim Slip to hand over to the customer.'
      ]
    },
    tip: {
      ur: 'Claim Slip par dukan ka naam, tareekh, mobile ka naam, IMEI aur fault safaid parchi par print hota hai.',
      en: 'The claim slip includes Shop Name, Date, Product Name, IMEI, and fault description for customer records.'
    },
    example: {
      ur: 'Grahak phone dukan par chhor gaya? Usay Claim Slip print karke dein taake dukan aur grahak dono ka record mehfooz rahay.',
      en: 'Customer leaves phone for repair? Hand over the printed Claim Slip so both parties have proof of receipt.'
    }
  },
  {
    id: 'war-status-aging',
    category: 'warranty',
    page: '/warranty',
    title: {
      ur: 'Claim Ka Status Update Karna Aur Supplier Ko Bhejna',
      en: 'Updating Claim Lifecycle & Tracking Supplier Aging'
    },
    summary: {
      ur: 'Mobile ko company/supplier bhejein, wapis aane par remarks likhein aur grahak ko wapis dein.',
      en: 'Track claim lifecycle (Sent to Supplier, Repaired, Returned) and monitor supplier turnaround times.'
    },
    steps: {
      ur: [
        'Jab mobile wholesaler ya service center bhejein, to Status dropdown se "Sent to Supplier" select karein.',
        'System foran dukan par warning timer shuru kar deta hai (jaise "Sent 7 days ago") taake pata rahay maal kitne din se ruka hua hai.',
        'Jab mobile theek ho kar wapis aa jaye to "Back from Supplier" karein.',
        'Grahak ko wapis dete waqt "Returned to Customer" karein aur resolution remarks (e.g. "Screen replaced successfully") likh kar save karein.'
      ],
      en: [
        'When sending a device to the distributor or service center, set status to "Sent to Supplier".',
        'The system activates an aging tracker (e.g., "Sent 7 days ago") so you know exactly how long the supplier has held the item.',
        'When returned from repair, update status to "Back from Supplier".',
        'When handing back to customer, select "Returned to Customer" and record resolution remarks.'
      ]
    },
    tip: {
      ur: 'Agar company claim reject kar de, to "Rejected" select karke wajha likh dein.',
      en: 'If the service center rejects the claim, select "Rejected" and record the reason in resolution remarks.'
    },
    example: {
      ur: 'Supplier ne 10 din se mobile nahi bheja? Aging badge foran lal ho kar aapko yaad dilayega ke supplier se raabta karein.',
      en: 'Supplier holding phone for over 10 days? The aging indicator turns red to prompt you for follow-up.'
    }
  },

  // ==========================================
  // --- 4. PURCHASES & SUPPLIER BILLS GUIDES ---
  // ==========================================
  {
    id: 'pur-search-audit',
    category: 'purchases',
    page: '/purchases',
    title: {
      ur: 'Purani Khareedari (Purchase Invoices) Dhoondna Aur Check Karna',
      en: 'Searching & Auditing Purchase Invoices History'
    },
    summary: {
      ur: 'Supplier ka naam, invoice number, product ya kisi khas IMEI se purana purchase bill foran dhoondein.',
      en: 'Quickly locate past supplier bills by supplier name, bill number, product name, brand, or specific IMEI.'
    },
    steps: {
      ur: [
        'Purchase History page par search box mein Supplier ka naam, Bill Number (e.g. INV-9988), Product ka naam ya IMEI scan karein.',
        'System foran wo purchase invoices samne le aayega jismein wo cheez khareedi gayi thi.',
        'Status filter (Paid, Partially Paid, Unpaid) se pata chal jata hai kin bills ke paise dene baqi hain.',
        'Table mein [+] dabane se us bill ke andar khareede gaye tamam items, unki khareed qeemat aur IMEI numbers expand ho jate hain.'
      ],
      en: [
        'Type the Supplier Name, Invoice Number, Product Name, or scan an IMEI into the search bar.',
        'The system filters and displays matching purchase bills instantly.',
        'Use the Status filter (Paid, Partially Paid, Unpaid) to quickly identify invoices with pending debts.',
        'Click [+] on any row to expand and view all purchased items, cost prices, and IMEI serials within that invoice.'
      ]
    },
    tip: {
      ur: 'Top par mojood "Export" button dabane se poori Purchase History Excel ya PDF summary report mein download ho jati hai.',
      en: 'Click "Export" to download your full purchase history audit sheet in Excel or PDF format.'
    },
    example: {
      ur: 'Check karna hai ke Oppo A6 kis tareekh ko kis supplier se khareeda tha? Search mein sirf "Oppo A6" likhein.',
      en: 'Need to verify when and from whom Oppo A6 was purchased? Just type "Oppo A6" in the search box.'
    }
  },
  {
    id: 'pur-print-bulk-barcode',
    category: 'purchases',
    page: '/purchases',
    title: {
      ur: 'Purchase Bill Print Karna Aur Poore Bill Ke Barcodes Print Karna',
      en: 'Printing Purchase Invoices & Bulk Barcode Labels'
    },
    summary: {
      ur: 'Khareedari ki official PDF invoice print karein aur bill ke tamam items ke 50x25mm barcode stickers aik sath nikaalein.',
      en: 'Generate official PDF purchase bills and print bulk thermal barcode labels for all invoice items at once.'
    },
    steps: {
      ur: [
        'Kisi bhi purchase bill ke aage "View Details" dabayein.',
        '"Print Invoice" button dabane se poore bill ki khubsoorat PDF summary invoice tayyar ho kar print dialog khol deti hai.',
        '"Print Barcodes" button dabayein: Is bill mein aane wale tamam accessories aur bulk items ke 50x25mm thermal stickers ek hi list mein khul jayenge.',
        '"Print Selected" dabate hi tamam stickers thermal printer se lagataar print ho kar nikal aayenge.'
      ],
      en: [
        'Click "View Details" on any purchase invoice row.',
        'Click "Print Invoice" to generate and preview an official PDF purchase invoice sheet.',
        'Click "Print Barcodes" to open the bulk sticker printing modal containing all items from that purchase.',
        'Click "Print Selected" to send the entire batch of 50x25mm barcode stickers to your thermal printer at once.'
      ]
    },
    tip: {
      ur: 'Naya maal dukan mein aate hi "Print Barcodes" daba kar 1 minute mein saare dabbo par stickers chipka dein.',
      en: 'Stick barcodes on all new inventory boxes within 1 minute using the bulk print button right after receiving stock.'
    },
    example: {
      ur: 'Bill mein 20 cables aur 30 chargers thay? "Print Barcodes" dabane se sab ke 50 stickers foran print ho jayenge.',
      en: 'Received 20 cables and 30 chargers? "Print Barcodes" sends all 50 stickers to your printer in one click.'
    }
  },
  {
    id: 'pur-payment-return',
    category: 'purchases',
    page: '/purchases',
    title: {
      ur: 'Supplier Ko Bill Ki Payment Dena Aur Maal Wapis (Return) Karna',
      en: 'Recording Bill Payments & Returning Stock to Suppliers'
    },
    summary: {
      ur: 'Khareedari ke bill ke paise Cash ya Bank se ada karein ya kharab/ghalat maal supplier ko wapis bhein.',
      en: 'Pay supplier invoices from cash/bank accounts or return unsold/defective stock to reduce debt.'
    },
    steps: {
      ur: [
        'Payment Dena: Purchase Details page par "Record a Payment" dabayein, raqam likhein aur account (Cash ya Bank) chunain. Balance foran kam ho jayega.',
        'Maal Wapis Karna (Return): "Return Items" button dabayein: Bill ke tamam items samne aa jayenge.',
        'Jo cheez ya IMEI wapis karni ho uspar tick lagayein ya quantity likhein aur "Process Return" dabayein.',
        'Return save hote hi supplier ka udhaar foran kam ho jayega aur wo item Inventory se nikal jayega.',
        '"Edit Purchase" daba kar aap kisi bhi bill ke andar qeematein ya invoice number modify kar sakte hain.'
      ],
      en: [
        'Record Payment: Click "Record a Payment" on the Purchase Details page, enter the amount, and select Cash or Bank account.',
        'Return Items: Click "Return Items" to view all items purchased on this invoice.',
        'Check the specific items/IMEIs and quantities to return and click "Process Return".',
        'Saving the return automatically deducts the return value from the supplier balance and updates stock.',
        'Click "Edit Purchase" to modify item costs, quantities, or invoice numbers whenever required.'
      ]
    },
    tip: {
      ur: 'Returned items ki alag lal rang ki history table bill ke neechay banti hai taake audit 100% transparent rahay.',
      en: 'Returned items are clearly listed in a dedicated return history audit table at the bottom of the invoice.'
    },
    example: {
      ur: 'Supplier se 10 piece aaye thay jin mein se 2 kharab nikle? "Return Items" mein 2 piece select karein, bill ka total khud adjust ho jayega.',
      en: 'Received 10 units with 2 defective items? Select 2 units under "Return Items" to automatically adjust the invoice total.'
    }
  },

  // ==========================================
  // --- 3. POS BILLING GUIDES ---
  // ==========================================
  {
    id: 'pos-scan-cart',
    category: 'pos',
    page: '/pos',
    title: {
      ur: 'Barcode Scan Karna Aur Item Cart Mein Daalna',
      en: 'Barcode Scanning & Adding Items to Cart'
    },
    summary: {
      ur: 'Barcode scanner se foran item add karein, IMEI select karein ya category aur naam se dhoondein.',
      en: 'Fast item lookup via barcode scanner, IMEI serial selection, or category browsing.'
    },
    steps: {
      ur: [
        'Search box mein cursor rakh kar Barcode scanner se item ka barcode scan karein — item khud-ba-khud cart mein add ho jayega.',
        'Mobile Phones ke liye: Item par click karein aur dukan mein mojood exact IMEI / Serial number par tick lagayein.',
        'Accessories ya Bulk items ke liye: (+) ya (-) dabayein ya direct quantity box mein tadad type karein.',
        'Agar koi dawaai ya item Expire ho chuka ho to system lal warning dega taake ghalti se kharab maal na bik sakay.',
        'Grid View aur List View badalne ke liye Search bar ke sath mojood icon dabayein.'
      ],
      en: [
        'Point your barcode scanner at the product — the item will be instantly identified and added to the cart.',
        'For Smartphones: Click the product and check the exact IMEI / Serial number currently being sold.',
        'For Accessories & Bulk goods: Use the (+) and (-) buttons or type the quantity directly into the box.',
        'If an item has reached its expiry date, the system alerts you immediately to prevent selling expired stock.',
        'Toggle between List View and Grid View anytime using the layout icon next to the search bar.'
      ]
    },
    tip: {
      ur: 'Keyboard par Alt + F daba kar aap direct Search / Scan box mein foran typing shuru kar sakte hain.',
      en: 'Press Alt + F on your keyboard to instantly jump to the POS Search & Scan field.'
    },
    example: {
      ur: 'Type-C cable ka barcode scan karte hi bill mein 1 piece add ho jayega; dobara scan karne se quantity 2 ho jayegi.',
      en: 'Scanning a Type-C cable barcode adds 1 unit; scanning again automatically increments the quantity to 2.'
    }
  },
  {
    id: 'pos-discounts-price',
    category: 'pos',
    page: '/pos',
    title: {
      ur: 'Bill Par Discount Dena Aur Cart Mein Qeemat Badalna',
      en: 'Applying Discounts & Cart Price Adjustments'
    },
    summary: {
      ur: 'Poore bill par ya kisi aik item par discount dene aur Admin Master PIN ki security samajhna.',
      en: 'How to apply item-level price changes, bill discounts, and handle Master PIN overrides.'
    },
    steps: {
      ur: [
        'Poore bill par discount dene ke liye neechay "Discount" box mein raqam (PKR) ya feesad (%) darj karein.',
        'Kisi aik item ki qeemat badalne ke liye cart ke andar us item ki sale price par click karke nayi qeemat likhein.',
        'Wholesale Grahak: Agar aapne Wholesale Customer select kiya ho to wholesale rates khud-ba-khud lag jayenge.',
        'Security Lock (Master PIN): Agar salesman dukan ki khareed qeemat se kam par beche ya limit se zyada discount de, to Admin Master PIN lagana zaroori hoga.'
      ],
      en: [
        'To apply an overall bill discount, enter the amount (PKR) or percentage (%) in the Discount input at the bottom.',
        'To modify a single item price, click directly on the price field inside the cart row and enter the new price.',
        'Wholesale Customers: Selecting a wholesale customer automatically switches all eligible items to wholesale prices.',
        'Master PIN Guard: If a salesman drops a price below the purchase cost or exceeds the discount limit, the Admin Master PIN is required.'
      ]
    },
    tip: {
      ur: 'Settings > Store Settings se aap Salesman ki Maximum Discount Limit (jaise 10%) aur Price Drop Limit set kar sakte hain.',
      en: 'Configure staff maximum discount limits and price drop thresholds in App Settings > Store Settings.'
    },
    example: {
      ur: 'Customer 2,000 ke bill par 200 rupay chhoot maang raha hai? Discount box mein 200 likhein aur PKR chunain.',
      en: 'Customer asks for PKR 200 off a PKR 2,000 bill? Type 200 into the discount box and select PKR.'
    }
  },
  {
    id: 'pos-credit-sale',
    category: 'pos',
    page: '/pos',
    title: {
      ur: 'Udhaar (Credit) Sale Karna Aur Customer Ka Khata',
      en: 'Processing Credit (Pay Later) Sales & Debt Limits'
    },
    summary: {
      ur: 'Grahak ke khatay (Udhaar) par maal bechein aur customer ki credit limit check karein.',
      en: 'Sell items on customer khata, record advance partial payments, and enforce credit limits.'
    },
    steps: {
      ur: [
        'Top bar se "Select customer..." mein grahak ka naam chunein ya "+" icon daba kar naya customer add karein.',
        '(Zaroori Note: "Walk-in Customer" par udhaar nahi ho sakta; udhaar ke liye customer ka naam select karna laazmi hai).',
        'Neechay payment toggle se "Credit" select karein.',
        'Agar customer kuch advance paise de raha hai, to "Paid Now (Advance)" mein wo raqam likhein aur baqi udhaar khatay mein chala jayega.',
        'Customer Credit Limit: Agar grahak ka purana udhaar dukan ki muqarrar kardah hadd se barh raha ho, to Admin Master PIN approve karega.'
      ],
      en: [
        'Select the customer from the "Select customer..." dropdown or click the "+" button to add a new customer.',
        '(Note: Credit sales are disabled for "Walk-in Customer"; selecting a registered customer is required).',
        'Toggle the payment method at the bottom to "Credit".',
        'If the customer makes a partial advance payment, enter that amount in "Paid Now (Advance)"; the remaining balance is added to their ledger.',
        'Credit Limit Guard: If the new debt exceeds the customer\'s approved credit limit, the Admin Master PIN is required to proceed.'
      ]
    },
    tip: {
      ur: 'Settings se "Customer Credit Limits" on karein taake koi salesman dukan ke nuqsan ka baais na ban sakay.',
      en: 'Enable "Customer Credit Limits" in Settings to prevent salesmen from issuing excessive store credit.'
    },
    example: {
      ur: 'Customer 5,000 ka maal le gaya aur 2,000 naqd diye? Credit chunein, Advance mein 2,000 likhein; baqi 3,000 uske khatay mein likh jayenge.',
      en: 'Customer buys PKR 5,000 worth of items and pays PKR 2,000 cash? Select Credit, enter PKR 2,000 in Advance; PKR 3,000 goes to ledger.'
    }
  },
  {
    id: 'pos-payment-accounts',
    category: 'pos',
    page: '/pos',
    title: {
      ur: 'Cash, Bank Ya JazzCash / EasyPaisa Mein Payment Lena',
      en: 'Selecting Payment Accounts (Cash, Bank, Mobile Wallets)'
    },
    summary: {
      ur: 'Counter cash drawer, Meezan/HBL bank transfer ya JazzCash se payment receive karein.',
      en: 'Route sale proceeds to physical cash drawers, direct bank transfers, or mobile wallets.'
    },
    steps: {
      ur: [
        'Neechay Payment Account dropdown se select karein ke paisa kahan aaya hai: "Cash (Counter)" ya Bank / Wallet (e.g. Meezan Bank, JazzCash).',
        'Agar "Cash (Counter)" select karenge to paisa seedha counter drawer ke live cash mein jama ho jayega.',
        'Agar Bank ya Mobile Wallet select karenge to wo dukan ke bank balance mein jama hoga.',
        '"Complete Sale" dabate hi bill save ho jayega aur dukan ke tamam accounts live update ho jayenge.'
      ],
      en: [
        'From the Account dropdown at the bottom, select where the funds are received: "Cash (Counter)" or a Bank / Mobile Wallet.',
        'Selecting "Cash (Counter)" credits the physical drawer cash of the active sales register.',
        'Selecting a Bank or Mobile Wallet deposits the revenue directly into that payment account balance.',
        'Click "Complete Sale" to record the transaction and update your financial ledgers in real-time.'
      ]
    },
    tip: {
      ur: 'Settings > Registers & Accounts se aap dukan ke tamam Banks aur JazzCash/Easypaisa accounts manage kar sakte hain.',
      en: 'Add and configure all your bank accounts and mobile wallets from App Settings > Registers & Accounts.'
    },
    example: {
      ur: 'Customer ne QR code scan karke JazzCash kiya? Account dropdown se "JazzCash" select karein.',
      en: 'Customer paid via JazzCash QR code? Select "JazzCash" in the account selector before completing the sale.'
    }
  },
  {
    id: 'pos-hold',
    category: 'pos',
    page: '/pos',
    title: {
      ur: 'Customer Ka Bill Hold Karna Aur Baad Mein Resume Karna',
      en: 'Holding Bills (Drafts) & Resuming Active Carts'
    },
    summary: {
      ur: 'Ek grahak ka bill rokk kar doosray ko attend karein bina scanned items zaya kiye.',
      en: 'Pause an active checkout session into draft storage and restore it when the customer returns.'
    },
    steps: {
      ur: [
        'Bill banate waqt top right par Pause (Hold) button (Alt + Q) dabayein.',
        'Saare scanned items aur discounts Draft mein mehfooz ho jayenge aur screen aglay grahak ke liye khali ho jayegi.',
        'Grahak wapis aaye to Clock (Drafts) icon dabayein aur "Resume" par click karein.',
        'Agar computer band ho jaye ya page refresh ho jaye, tab bhi SadaPOS aapka adhoora bill khud-ba-khud restore kar deta hai.'
      ],
      en: [
        'While a bill is in progress, click the Pause (Hold) button (Alt + Q) at the top right of the bill.',
        'The current bill is safely stored as a Draft, and your cart clears for the next customer.',
        'To resume, click the Clock (Drafts) icon and click "Resume" on the saved bill.',
        'Even if the browser is closed or refreshed, SadaPOS automatically restores your active unsaved cart.'
      ]
    },
    tip: {
      ur: 'Draft bills cloud par sync hote hain taake doosray counter par baitha staff bhi unhein resume kar sakay.',
      en: 'Draft bills sync across devices so another sales counter can also resume and complete the bill.'
    },
    example: {
      ur: 'Customer wallet bhool gaya? Bill hold karein aur aglay line wale customer ko attend karein.',
      en: 'Customer stepped out to get their wallet? Hold their bill and serve the next person in line.'
    }
  },
  {
    id: 'pos-receipt-print',
    category: 'pos',
    page: '/pos',
    title: {
      ur: 'Thermal Receipt Print Karna Aur Aakhri Bill Dobara Print Karna',
      en: 'Thermal Receipt Printing & Quick Last Bill Reprint'
    },
    summary: {
      ur: '58mm ya 80mm thermal raseed print karein aur pichla bill dobara print karne ka aasan tareeqa.',
      en: 'Print standard thermal receipts and quickly reprint the previous receipt with 1-click.'
    },
    steps: {
      ur: [
        '"Complete Sale" dabate hi thermal printer se customer raseed khud-ba-khud print ho jati hai.',
        'Raseed par dukan ka naam, phone, address, items, IMEI, warranty din aur QR code print hota hai.',
        'Agar printer mein paper phas jaye ya customer dobara raseed maangay, to top bar par Blue Printer icon dabane se aakhri raseed foran dobara print ho jati hai.',
        'Settings > Store Settings se aap raseed ka format (Thermal, PDF, ya None) aur warranty policy set kar sakte hain.'
      ],
      en: [
        'Clicking "Complete Sale" automatically sends the print command to your connected thermal printer.',
        'The receipt includes your Shop Name, Phone, Address, sold items, IMEIs, warranty days, and QR code.',
        'If the printer jams or customer asks for a duplicate, click the Blue Printer icon on the top bar to reprint instantly.',
        'Configure your receipt layout (Thermal, PDF, or None) and warranty terms in App Settings > Store Settings.'
      ]
    },
    tip: {
      ur: 'Settings mein "Enable Quick Reprint" on rakhne se raseed bar bar print karna nihayat aasan ho jata hai.',
      en: 'Keep "Enable Quick Reprint" turned on in Settings for fast 1-click duplicate receipt printing.'
    },
    example: {
      ur: 'Customer ne kaha "bhai raseed dobara dena"? Bas top bar par Printer icon dabayein, pichla bill foran nikal aayega.',
      en: 'Customer asks for a reprint? Just click the top Printer icon to print the last bill in 1 second.'
    }
  },

  // ==========================================
  // --- 4. CUSTOMERS & KHATA GUIDES ---
  // ==========================================
  {
    id: 'cust-ledger',
    category: 'customers',
    page: '/customers',
    title: {
      ur: 'Grahak Ka Khata (Ledger) Aur Payment Wusool Karna',
      en: 'Managing Customer Ledgers & Receiving Debt Payments'
    },
    summary: {
      ur: 'Grahak ka pura khata dekhein, bacha hua udhaar wusool karein aur thermal raseed print karein.',
      en: 'View complete customer statement, receive pending balances, and print payment receipts.'
    },
    steps: {
      ur: [
        'Customers page par grahak ke aage "Eye (Ledger)" icon dabane se mukammal debit/credit khata khul jata hai.',
        'Udhaar wusool karne ke liye "$" (Receive Payment) icon dabayein, raqam darj karein aur account (Cash Counter ya Bank) select karein.',
        '"Confirm Payment" dabate hi customer ka udhaar balance khud kam ho jayega aur Thermal Payment Receipt print ho jayegi.',
        'Agar customer ke paise dukan par jama (Advance) hon to "Settle Credit" daba kar cash wapis kar sakte hain.',
        'Top par Date Filter (Today, This Month, Custom) se grahak ka kisi bhi khas tareekh ka statement PDF ya Excel mein nikaal sakte hain.'
      ],
      en: [
        'Click the "Eye (Ledger)" icon next to any customer on the Customers page to view their full account statement.',
        'To receive debt payment, click the "$" (Receive Payment) button, enter amount, and select Cash or Bank account.',
        'Confirming payment immediately deducts from their balance and prompts for a thermal receipt printout.',
        'If a customer has a negative balance (Advance credit), click "Settle Credit" to refund excess cash.',
        'Use the inline date filter (Today, This Month, Custom) to export date-specific ledger reports to Excel or PDF.'
      ]
    },
    tip: {
      ur: 'Grahak ka phone number sahi likhein taake bill banate waqt foran dhoonda ja sakay.',
      en: 'Always record customer mobile numbers to enable instant lookup during POS checkout.'
    },
    example: {
      ur: 'Customer Rashid ne 12,000 mein se 5,000 jama karwaye? Receive dabayein, balance foran 7,000 ho jayega.',
      en: 'Customer pays PKR 5,000 against a PKR 12,000 balance? Click Receive, balance drops to PKR 7,000.'
    }
  },
  {
    id: 'cust-return',
    category: 'customers',
    page: '/customers',
    title: {
      ur: 'Becha Hua Maal Wapis (Sales Return) Lena Aur Cash Wapis Dena',
      en: 'Sales Returns, Invoicing Lookup & Cash Refunds'
    },
    summary: {
      ur: 'Invoice QR scan karke item wapis lein, stock restore karein aur customer ko foran cash wapis dein ya khata adjust karein.',
      en: 'Process invoice returns, return goods to active inventory, and issue immediate cash refunds.'
    },
    steps: {
      ur: [
        'Top par "Return by Invoice" button dabayein ya customer raseed ka QR scan karein.',
        'Bill khulte hi wapis aane wale items aur quantity par tick lagayein.',
        'Agar grahak ko foran dukan se cash wapis dena hai to "Refund Cash Immediately" check karein.',
        'Agar cash wapis nahi dena to amount customer ke khatay mein jama (Credit) ho jayegi.',
        'Confirm karte hi wapis aane wala item khud-ba-khud Inventory mein Available stock ban jayega.'
      ],
      en: [
        'Click "Return by Invoice" at the top of Customers page or scan the QR code on the customer receipt.',
        'Check the returned items and specify the quantities being returned.',
        'If refunding cash immediately from the drawer, check "Refund Cash Immediately".',
        'Otherwise, the return value is automatically credited to the customer\'s ledger.',
        'Confirming return instantly restores the item to active Available inventory.'
      ]
    },
    tip: {
      ur: 'Agar box khula ho ya item used ho, to aap Restocking Fee deduct karke baqi raqam wapis kar sakte hain.',
      en: 'Deduct restocking fees if the product packaging is opened or damaged.'
    },
    example: {
      ur: 'Customer ne 2,000 ka charger wapis kiya aur cash maanga? "Refund Cash Immediately" select karein, drawer se 2,000 kam ho jayenge.',
      en: 'Customer returns a PKR 2,000 charger and wants cash back? Check "Refund Cash Immediately" to deduct PKR 2,000 from drawer.'
    }
  },
  {
    id: 'cust-limits-groups',
    category: 'customers',
    page: '/customers',
    title: {
      ur: 'Grahak Ki Credit Limit (Udhaar Ki Hadd) Aur Groups Set Karna',
      en: 'Setting Customer Credit Limits & Customer Groups'
    },
    summary: {
      ur: 'Naye grahak par udhaar ki hadd (Limit) lagayein taake koi salesman hadd se zyada udhaar na de sakay.',
      en: 'Assign customers to Wholesale routes and enforce maximum credit limits for debt control.'
    },
    steps: {
      ur: [
        '"+ Add Customer" dabate waqt ya Edit karte waqt "Credit Limit (Rs)" mein maximum allowed udhaar darj karein (e.g. 50,000).',
        'Agar kisi grahak ko udhaar bilkul nahi dena to limit mein 0 likhein.',
        'Agar customer ki limit khatam ho jaye aur salesman mazeed udhaar bechna chahay, to Admin Master PIN lagana laazmi hoga.',
        '"Customer Group" (jaise Wholesale, Route A) select karke aap dukan ke wholesale grahakon ko alag categorize kar sakte hain.'
      ],
      en: [
        'When adding or editing a customer, specify the "Credit Limit (Rs)" (e.g., PKR 50,000).',
        'To enforce strict cash-only terms with a customer, set their Credit Limit to 0.',
        'If a customer exceeds their credit limit during POS billing, the Admin Master PIN is required to authorize the sale.',
        'Assign tags under "Customer Group" (e.g., Wholesale, Route A) to group your client accounts.'
      ]
    },
    tip: {
      ur: 'Settings > Store Settings se "Customer Credit Limits" toggle on karein taake dukan ka udhaar control mein rahay.',
      en: 'Enable "Customer Credit Limits" in Settings to enforce debt management controls.'
    },
    example: {
      ur: 'Grahak ki limit 20,000 hai aur pehle se 18,000 udhaar hai? Wo 5,000 ka naya udhaar bina Admin PIN ke nahi le sakega.',
      en: 'Customer credit limit is PKR 20,000 with PKR 18,000 debt? A new PKR 5,000 credit sale will require Master PIN approval.'
    }
  },

  // ==========================================
  // --- 5. SUPPLIERS & WHOLESALE GUIDES ---
  // ==========================================
  {
    id: 'sup-ledger-payment',
    category: 'suppliers',
    page: '/suppliers',
    title: {
      ur: 'Wholesaler (Supplier) Ka Khata Dekhna Aur Payment Dena',
      en: 'Supplier Ledgers & Recording Bulk Supplier Payments'
    },
    summary: {
      ur: 'Distributor/Wholesaler ke tamam purchase bills ka hisaab dekhein aur Cash ya Bank se payment ada karein.',
      en: 'Track wholesale distributor purchases, payments, and supplier credit balances.'
    },
    steps: {
      ur: [
        'Suppliers dashboard par supplier ke naam par click karne se uska mukammal Transaction Ledger khul jata hai.',
        'Upar KPI cards mein Total Business, Total Paid, Balance Due (Baqi Udhaar) aur Your Credit live nazar aate hain.',
        'Wholesaler ko payment dene ke liye Green Dollar icon ($) dabayein, raqam likhein aur Account (Cash ya Bank) select karein.',
        '"Save Payment" dabate hi supplier ka baqi udhaar foran kam ho jayega aur cash drawer ya bank balance update ho jayega.',
        '"All Suppliers (Summary)" par click karke poori market ke tamam suppliers ki Directory aur Balances Sheet aik sath dekhein.'
      ],
      en: [
        'Click on any supplier in the Suppliers Dashboard to open their complete Transaction Ledger.',
        'The top metric cards show Total Business, Total Paid, Balance Due, and Your Credit in real-time.',
        'To pay a wholesaler, click the Green Dollar ($) button, enter amount, and choose Cash or Bank account.',
        'Saving payment immediately deducts from the supplier balance and updates drawer cash or bank accounts.',
        'Click "All Suppliers (Summary)" in the sidebar to view and export the master balances sheet of all distributors.'
      ]
    },
    tip: {
      ur: 'Supplier ke ledger se aap kisi bhi purane purchase bill par click karke us bill ke itemized details khol sakte hain.',
      en: 'Click any purchase reference directly inside the ledger to view the original itemized invoice.'
    },
    example: {
      ur: 'Supplier Zamzam Mobiles ko 50,000 ada kiye? Payment darj karein, aapka udhaar 50,000 kam ho jayega.',
      en: 'Paid PKR 50,000 to Zamzam Mobiles? Record payment to instantly reduce your accounts payable.'
    }
  },
  {
    id: 'sup-refund-settlement',
    category: 'suppliers',
    page: '/suppliers',
    title: {
      ur: 'Supplier Se Refund Wapis Lena (Paisa Wapis Aana)',
      en: 'Recording Supplier Refunds & Advance Recovery'
    },
    summary: {
      ur: 'Jab supplier kharab maal ke paise cash wapis kare ya advance raqam dukan ko wapis bhejay.',
      en: 'Log cash or bank refunds received from suppliers for returned goods or excess advance payments.'
    },
    steps: {
      ur: [
        'Agar aapne supplier ko maal wapis kiya tha aur aapka credit balance jama ho gaya tha.',
        'Jab wholesaler aapko cash ya bank transfer ke zariye paise wapis kar de, to Red Minus icon (⊖) dabayein.',
        'Raqam likhein aur Receiving Account (Cash Counter ya Bank) select karein.',
        '"Save Refund" dabate hi paisa aapke counter drawer ya bank mein jama ho jayega aur supplier ka credit balance clear ho jayega.'
      ],
      en: [
        'If you returned items to a supplier resulting in an advance credit balance on their account.',
        'When the wholesaler refunds cash or bank transfer, click the Red Minus (⊖) button.',
        'Specify the refund amount and select the destination account (Cash Counter or Bank).',
        'Saving the refund deposits funds into your cash/bank balance and clears the supplier credit.'
      ]
    },
    tip: {
      ur: 'Supplier Refunds ko system dukan ki cash aamad (Inflow) mein shamil karta hai taake Day Book ka hisaab barabar rahay.',
      en: 'Supplier refunds are recorded as cash inflows in the Day Book to keep cash reconciliation 100% balanced.'
    },
    example: {
      ur: 'Supplier ne kharab LCDs ke 6,000 rupay cash wapis kiye? Refund darj karein, counter cash 6,000 barh jayega.',
      en: 'Supplier refunded PKR 6,000 for defective LCDs? Record refund to increase counter cash by PKR 6,000.'
    }
  },

  // ==========================================
  // --- 6. STAFF, PAYROLL & SHIFTS GUIDES ---
  // ==========================================
  {
    id: 'staff-pin-permissions',
    category: 'staff',
    page: '/staff',
    title: {
      ur: 'Naya Staff Add Karna, Login PIN Aur Permissions Set Karna',
      en: 'Adding Staff Members, Login PINs & Role Permissions'
    },
    summary: {
      ur: 'Sales staff ka 4-digit PIN banayein aur tay karein ke wo dukan mein kya dekh sakta hai aur kya nahi.',
      en: 'Create employee profiles with 4-digit login PINs and customize individual security permissions.'
    },
    steps: {
      ur: [
        'Staff page par "Add Staff" button dabayein.',
        'Staff ka Naam, Phone, CNIC, Monthly Salary aur 4-digit Login PIN darj karein.',
        '"App Permissions" mein un cheezon par tick lagayein jinki ijazat deni hai (jaise POS, Customers, Purchases).',
        'Agar kisi salesman ko Dashboard ka munafa ya reports chupana hai, to "View Dashboard Stats" ko uncheck rehne dein.',
        'Staff dukan ke computer par apna 4-digit PIN laga kar login karega aur sirf usay wahi cheezein nazar aayengi jinki ijazat hogi.'
      ],
      en: [
        'Click "+ Add Staff" on the Staff Management page.',
        'Enter staff Full Name, Phone, CNIC, Monthly Salary, and assign a unique 4-digit Login PIN.',
        'Under "App Permissions", check the exact features allowed (e.g. POS, Customers, Purchases).',
        'To hide sensitive store profit margins from salesmen, keep "View Dashboard Stats" unchecked.',
        'Employees unlock the terminal using their 4-digit PIN and access only authorized modules.'
      ]
    },
    tip: {
      ur: 'Har staff member ka PIN mukhtalif hona chahiye taake system logs mein pata chalay kis salesman ne kaunsa bill banaya.',
      en: 'Every staff member must have a unique PIN to maintain transparent audit logs of who made each sale.'
    },
    example: {
      ur: 'Salesman Ali ko sirf POS aur Inventory ki ijazat dein, taake wo dukan ke kharche aur profit na dekh sakay.',
      en: 'Assign Salesman Ali access to POS and Inventory only, keeping store expenses and net profit hidden.'
    }
  },
  {
    id: 'staff-payroll-advances',
    category: 'staff',
    page: '/staff',
    title: {
      ur: 'Staff Ki Tankhwah (Salary), Advance Aur Khata Maintain Karna',
      en: 'Staff Salary Ledger, Advances & Automated Expense Sync'
    },
    summary: {
      ur: 'Har mahinay staff ki tankhwah darj karein, advance paise kaatain aur dukan ke kharchon se link karein.',
      en: 'Manage staff monthly salaries, advance draws, and commission bonuses with automated expense integration.'
    },
    steps: {
      ur: [
        'Staff member ke naam par click karke uska Transaction History Ledger kholain.',
        'Mahina khatam hone par Blue Dollar icon dabayein, Type mein "Add Monthly Salary" select karein aur Month chunain (e.g. September 2026).',
        'Staff ke khatay mein tankhwah jama (Credit +) ho jayegi.',
        'Jab staff ko naqd tankhwah ada karein ya advance dein, to "Pay Cash / Salary Paid" ya "Advance" select karein.',
        'ZAROORI KHAAS BAAT: Staff ko di gayi payment khud-ba-khud dukan ke "Expenses (Salaries & Wages)" mein darj ho jati hai aur aaj ke munafay se minus ho jati hai!'
      ],
      en: [
        'Click on any staff member to open their payroll ledger.',
        'At month-end, click the Dollar icon, select "Add Monthly Salary", and choose the month (e.g. September 2026).',
        'The salary amount is credited (+) to the staff balance.',
        'When paying salary or issuing advances, select "Pay Cash / Salary Paid" or "Advance".',
        'AUTOMATED SYNC: Any salary or advance paid to staff automatically creates a store Expense (Salaries & Wages) to update Net Profit!'
      ]
    },
    tip: {
      ur: 'Staff ko advance dete waqt "Advance" select karein taake maheene ke aakhir par baqi tankhwah ka hisaab khud ban jaye.',
      en: 'Log mid-month staff draws as "Advance" so remaining salary due calculates automatically at month-end.'
    },
    example: {
      ur: 'Staff ki tankhwah 30,000 thi aur usne 10,000 advance liya tha? Balance mein 20,000 Baqi nazar aayega.',
      en: 'Staff salary was PKR 30,000 with a PKR 10,000 advance draw? Remaining balance calculates to PKR 20,000.'
    }
  },
  {
    id: 'staff-shifts-closing',
    category: 'staff',
    page: '/staff',
    title: {
      ur: 'Counter Shift Shuru Karna Aur Shaam Ko Cash Band Karna (Closing)',
      en: 'Starting Shifts, Shift Closings & Cash Discrepancy Audits'
    },
    summary: {
      ur: 'Subah counter kholte waqt float cash check karein aur shaam ko drawer ka cash ginn kar shift close karein.',
      en: 'Open counter registers with opening cash floats and perform end-of-shift cash reconciliations.'
    },
    steps: {
      ur: [
        'Shift Shuru Karna: Subah apna 4-digit PIN lagane ke baad Counter select karein aur drawer mein mojood starting cash (Opening Float) verify karke "Start Shift" dabayein.',
        'Shift Band Karna: Shaam ko Header mein User icon par click karein aur "End Shift & Close Register" dabayein.',
        'System batayega ke "System Expected Cash" kitna hona chahiye.',
        'Drawer mein mojood asli cash ginn kar "Actual Cash in Drawer" mein likhein.',
        'Agar koi farq (Shortage ya Surplus) ho, to wajha (Reason) likhein aur "Complete Closing" dabayein.',
        'Terminal foran lock ho jayega aur closing report dukan ke Malik ke record mein save ho jayegi.'
      ],
      en: [
        'Starting Shift: After entering your PIN, select your Counter, verify starting float cash in drawer, and click "Start Shift".',
        'Closing Shift: Click the user avatar in the top header and select "End Shift & Close Register".',
        'The software displays "System Expected Cash" based on all sales and payments recorded.',
        'Count physical cash in the drawer and enter the amount in "Actual Cash in Drawer".',
        'If there is any cash difference, explain the reason in the notes field and click "Complete Closing".',
        'The terminal locks securely and logs the closing audit report for the owner.'
      ]
    },
    tip: {
      ur: 'Settings mein "Pair this PC" karne se computer hamesha ke liye usi counter ke sath bandh jata hai.',
      en: 'Pair your PC to a specific counter in Settings to avoid counter selection on every login.'
    },
    example: {
      ur: 'System kehta hai 45,000 hona chahiye aur drawer mein 45,000 hi nikla? Zero difference ke sath perfect closing ho jayegi.',
      en: 'System expected PKR 45,000 and counted drawer is exactly PKR 45,000? Closing finishes with zero discrepancy.'
    }
  },

  // ==========================================
  // --- 7. REPORTS GUIDES ---
  // ==========================================
  {
    id: 'rep-profit',
    category: 'reports',
    page: '/reports',
    title: {
      ur: 'Reports: Dukan Ke Profit & Loss Ka Mukammal Audit',
      en: 'Understanding Profit & Loss and Day Book'
    },
    summary: {
      ur: 'Gross profit, net profit, dukan ke kharche aur stock flow audit sheet samajhein.',
      en: 'Comprehensive guide to calculating Gross Profit, Net Profit, Damaged Stock Loss, and daily cash balances.'
    },
    steps: {
      ur: [
        'Gross Profit = Total Revenue (Sales minus Returns) minus Cost of Goods Sold (Khareed Qeemat).',
        'Net Profit = Gross Profit minus Total Expenses minus Damaged Stock Loss.',
        'Reports page par Stock Flow Summary sheet se har item ka opening stock, khareed, farokht aur closing balance dekhein.'
      ],
      en: [
        'Gross Profit = Total Revenue (Sales minus Sales Returns) minus Cost of Goods Sold (COGS).',
        'Net Profit = Gross Profit minus Total Expenses minus Damaged Stock Loss.',
        'Use Day Book (Daily Summary) to reconcile daily cash receipts, payments, and counter opening/closing balances.'
      ]
    },
    tip: {
      ur: 'Damaged stock record karne se dukan ka net profit khud-ba-khud adjust ho jata hai taake hisaab 100% sahi rahe.',
      en: 'Damaged stock adjustments automatically reduce your net profit to maintain 100% accounting accuracy.'
    },
    example: {
      ur: 'Tax collected alag se show hota hai taake dukan ke asli munafay par koi farq na pare.',
      en: 'Tax collected is kept separate from business revenue to give you your true net profit.'
    }
  }
];

const QuickHelpDrawer = ({ open, onClose }) => {
  const { token } = theme.useToken();
  const location = useLocation();
  
  // Language Switcher State: 'ur' (Roman Urdu - Default) ya 'en' (English)
  const [language, setLanguage] = useState('ur');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);

  // --- SMART CONTEXTUAL FILTERING ---
  // 1. Agar search chal rahi hai to poori app se dhoondo
  // 2. Agar search nahi hai, to SIRF MOJOODA PAGE ki guides dikhao!
  const filteredGuides = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return HELP_GUIDES.filter(g => 
        g.title.ur.toLowerCase().includes(q) || 
        g.title.en.toLowerCase().includes(q) ||
        g.summary.ur.toLowerCase().includes(q) || 
        g.summary.en.toLowerCase().includes(q) ||
        g.steps.ur.some(s => s.toLowerCase().includes(q)) ||
        g.steps.en.some(s => s.toLowerCase().includes(q))
      );
    }

    // Page-specific category detection
    const currentPath = location.pathname;
    let pageCategory = 'dashboard';
    
    if (currentPath === '/pos') pageCategory = 'pos';
    else if (currentPath === '/warranty') pageCategory = 'warranty';
    else if (currentPath.startsWith('/purchases')) pageCategory = 'purchases';
    else if (currentPath === '/inventory' || currentPath === '/categories') pageCategory = 'inventory';
    else if (currentPath === '/customers' || currentPath === '/suppliers') pageCategory = 'customers';
    else if (currentPath === '/reports') pageCategory = 'reports';

    return HELP_GUIDES.filter(g => g.category === pageCategory);
  }, [searchQuery, location.pathname]);

  const featuredGuide = filteredGuides[0] || HELP_GUIDES[0];

  const nextGuide = useMemo(() => {
    if (!selectedArticle) return null;
    const currentIndex = filteredGuides.findIndex(g => g.id === selectedArticle.id);
    if (currentIndex === -1 || filteredGuides.length <= 1) return null;
    return filteredGuides[(currentIndex + 1) % filteredGuides.length];
  }, [selectedArticle, filteredGuides]);

  const handleClose = () => {
    setSelectedArticle(null);
    setSearchQuery('');
    onClose();
  };

  return (
    <Drawer
      title={
        <div style={{ padding: '4px 0 2px 0' }}>
          {/* Row 1: Top Bar with Back, Clean Title (No Brackets), Compact [Ur | En] Toggle & Close */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {selectedArticle && (
                <Button 
                  type="text" 
                  icon={<ArrowLeftOutlined style={{ fontSize: '18px', color: '#5F6368' }} />} 
                  onClick={() => setSelectedArticle(null)}
                  style={{ padding: 0, height: '36px', width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                />
              )}
              <span style={{ fontSize: '22px', fontWeight: 700, color: '#202124', letterSpacing: '-0.3px' }}>
                Quick help
              </span>
            </div>

            {/* Compact Header Actions: [Ur | En] + [X] */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Segmented
                size="small"
                value={language}
                onChange={setLanguage}
                options={[
                  { label: 'Ur', value: 'ur' },
                  { label: 'En', value: 'en' }
                ]}
                style={{ 
                  background: '#F1F3F4', 
                  fontWeight: 700, 
                  fontSize: '11.5px',
                  borderRadius: '6px'
                }}
              />
              <Button 
                type="text" 
                icon={<CloseOutlined style={{ fontSize: '17px', color: '#5F6368' }} />} 
                onClick={handleClose} 
                style={{ padding: 0, height: '36px', width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              />
            </div>
          </div>

          {/* Row 2: Search Input (AB YEH DIVIDER LINE KE UPAR HAI) */}
          <Input
            placeholder={language === 'ur' ? "Search Quick help..." : "Search Quick help..."}
            prefix={<SearchOutlined style={{ color: '#5F6368', fontSize: '18px', marginRight: '6px' }} />}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (selectedArticle) setSelectedArticle(null);
            }}
            allowClear
            style={{
              borderRadius: '8px',
              height: '44px',
              background: '#FFFFFF',
              borderColor: '#DADCE0',
              fontSize: '14.5px'
            }}
          />
        </div>
      }
      placement="right"
      closable={false}
      onClose={handleClose}
      open={open}
      width={480}
      styles={{
        body: { padding: '24px', background: '#FFFFFF' },
        header: { borderBottom: `1px solid #E0E0E0`, background: '#FFFFFF', padding: '16px 24px 14px 24px' }
      }}
    >
      {/* ======================================================== */}
      {/* VIEW 1: ARTICLE DETAIL VIEW (Jab user kisi guide par click kare) */}
      {/* ======================================================== */}
      {selectedArticle ? (
        <div>
          {/* Bada Headline */}
          <Title level={2} style={{ fontSize: '26px', fontWeight: 700, color: '#202124', lineHeight: 1.3, marginBottom: '16px', letterSpacing: '-0.5px' }}>
            {selectedArticle.title[language]}
          </Title>

          {/* Summary */}
          <Paragraph style={{ fontSize: '15.5px', lineHeight: 1.6, color: '#3C4043', marginBottom: '24px' }}>
            {selectedArticle.summary[language]}
          </Paragraph>

          {/* Step by Step Instructions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
            {selectedArticle.steps[language].map((step, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <span style={{ 
                  background: '#E8F0FE', 
                  color: '#1A73E8', 
                  width: '26px', 
                  height: '26px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '13px', 
                  fontWeight: 'bold',
                  flexShrink: 0,
                  marginTop: '1px'
                }}>
                  {idx + 1}
                </span>
                <Text style={{ fontSize: '15px', color: '#202124', lineHeight: 1.55 }}>{step}</Text>
              </div>
            ))}
          </div>

          {/* Example Box (Google Style) */}
          {selectedArticle.example && (
            <div style={{ 
              background: '#F0F4F9', 
              padding: '16px 20px', 
              borderRadius: '12px', 
              border: `1px solid #D3E3FD`,
              marginBottom: '32px'
            }}>
              <Text strong style={{ fontSize: '15px', color: '#0B57D0', display: 'block', marginBottom: '4px' }}>
                {language === 'ur' ? 'Misal (Example):' : 'Example:'}
              </Text>
              <Text style={{ fontSize: '14.5px', color: '#3C4043', lineHeight: 1.5 }}>
                {selectedArticle.example[language]}
              </Text>
            </div>
          )}

          <Divider style={{ margin: '24px 0 20px 0', borderColor: '#E0E0E0' }} />

          {/* Up Next Section with Next Button */}
          {nextGuide && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '16px' }}>
              <div style={{ maxWidth: '70%' }}>
                <Text type="secondary" style={{ fontSize: '12.5px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  {language === 'ur' ? 'AGLI GUIDE (UP NEXT)' : 'UP NEXT'}
                </Text>
                <a 
                  onClick={() => setSelectedArticle(nextGuide)}
                  style={{ fontSize: '15.5px', fontWeight: 600, color: '#1A73E8', textDecoration: 'underline', lineHeight: 1.3, display: 'block' }}
                >
                  {nextGuide.title[language]}
                </a>
              </div>
              <Button 
                type="primary"
                onClick={() => setSelectedArticle(nextGuide)}
                style={{ 
                  background: '#1A73E8', 
                  borderRadius: '6px', 
                  fontWeight: 600, 
                  height: '38px', 
                  fontSize: '14.5px',
                  padding: '0 24px' 
                }}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      ) : (

        /* ======================================================== */
        /* VIEW 2: MAIN LIST VIEW (Sirf Mojooda Page Se Mutaliq) */
        /* ======================================================== */
        <div>
          {/* Most Relevant Section (Only if not searching) */}
          {!searchQuery && (
            <div style={{ marginBottom: '28px' }}>
              <Text type="secondary" style={{ fontSize: '13.5px', fontWeight: 600, color: '#5F6368', display: 'block', marginBottom: '10px' }}>
                {language === 'ur' ? 'Is Page Ke Mutaliq Khas Guide:' : 'Most relevant for this page:'}
              </Text>

              {/* Bada Featured Headline */}
              <Title 
                level={2} 
                onClick={() => setSelectedArticle(featuredGuide)}
                style={{ 
                  fontSize: '26px', 
                  fontWeight: 700, 
                  color: '#202124', 
                  lineHeight: 1.3, 
                  cursor: 'pointer',
                  marginBottom: '18px',
                  letterSpacing: '-0.5px'
                }}
              >
                {featuredGuide.title[language]}
              </Title>

              {/* Advisor Tip Card */}
              <div style={{ 
                background: '#F8FAFC', 
                padding: '16px 18px', 
                borderRadius: '12px', 
                border: `1px solid #E2E8F0`,
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <BulbOutlined style={{ color: '#FBBC05', fontSize: '20px' }} />
                  <Text strong style={{ fontSize: '15px', color: '#202124' }}>
                    {language === 'ur' ? 'Khas Mashwara & Pro Tip' : 'Pro Tip & Shortcut'}
                  </Text>
                </div>
                <Text style={{ fontSize: '14px', color: '#5F6368', lineHeight: 1.5, display: 'block', marginBottom: '12px' }}>
                  {featuredGuide.tip[language]}
                </Text>
                <Button 
                  onClick={() => setSelectedArticle(featuredGuide)}
                  style={{ 
                    borderRadius: '6px', 
                    fontWeight: 600, 
                    color: '#1A73E8', 
                    borderColor: '#DADCE0' 
                  }}
                >
                  {language === 'ur' ? 'Mukammal Tareeqa Parhein' : 'Read more'}
                </Button>
              </div>
            </div>
          )}

          {/* List of Guides with Document Icon (Sirf is page se mutaliq) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '36px' }}>
            {filteredGuides.map((guide) => (
              <div 
                key={guide.id}
                onClick={() => setSelectedArticle(guide)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '12px', 
                  cursor: 'pointer',
                  padding: '4px 0'
                }}
              >
                <FileTextOutlined style={{ color: '#1A73E8', fontSize: '20px', marginTop: '2px', flexShrink: 0 }} />
                <span 
                  style={{ 
                    fontSize: '16px', 
                    color: '#202124', 
                    fontWeight: 500, 
                    lineHeight: 1.45
                  }}
                >
                  {guide.title[language]}
                </span>
              </div>
            ))}
          </div>

          {/* WhatsApp Direct Assistance Card (Real WhatsApp: +923262324446) */}
          <Card
            size="small"
            style={{
              background: 'linear-gradient(135deg, #E8F5E9 0%, #FFFFFF 100%)',
              borderRadius: '12px',
              borderColor: '#C8E6C9',
              marginTop: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '50%', 
                background: '#25D366', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#FFFFFF', 
                fontSize: '24px' 
              }}>
                <WhatsAppOutlined />
              </div>
              <div style={{ flex: 1 }}>
                <Text strong style={{ fontSize: '14px', display: 'block', color: '#1B5E20' }}>
                  {language === 'ur' ? 'Koi Baat Samajh Na Aaye?' : 'Need Direct Assistance?'}
                </Text>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                  {language === 'ur' ? 'Hamari support team se WhatsApp par seedha raabta karein (+92 326 2324446).' : 'Chat directly with our support team on WhatsApp (+92 326 2324446).'}
                </Text>
              </div>
            </div>
            <Button
              type="primary"
              block
              icon={<WhatsAppOutlined />}
              href="https://wa.me/923262324446?text=Assalam-o-alaikum,%20I%20need%20help%20with%20SadaPOS"
              target="_blank"
              style={{
                marginTop: '12px',
                background: '#25D366',
                borderColor: '#25D366',
                fontWeight: 600,
                borderRadius: '6px',
                height: '38px',
                fontSize: '14px'
              }}
            >
              {language === 'ur' ? 'WhatsApp Par Rabta Karein' : 'Chat on WhatsApp'}
            </Button>
          </Card>
        </div>
      )}
    </Drawer>
  );
};

export default QuickHelpDrawer;