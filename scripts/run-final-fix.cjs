const fs = require('fs');
const path = require('path');

const enKeys = {
  dashboard: "Dashboard",
  fabricHanger: "Fabric Hanger",
  accessory: "Accessories",
  yardage: "Sample Yardage",
  color: "Color Card",
  trim: "Trim Card",
  pattern: "Pattern",
  product: "Garment / Mockup",
  concept: "Concepts",
  catalog: "Catalogs",
  archive: "Archive",
  scan: "Scan Out",
  groupOverview: "Overview",
  groupMaterial: "Material",
  groupDesign: "Design",
  groupArchive: "Archive",
  groupTools: "Tools",
  settings: "Settings",
  inventory: "Inventory",
  location: "Location",
  holder: "Holder",
  general_info: "General Info",
  technical_specs: "Technical Specs",
  scan_history: "Scan History",
  item_code: "Item Code",
  fabric_name: "Fabric Name",
  category: "Category",
  supplier_name: "Supplier",
  origin: "Origin",
  price: "Price",
  moq_mcq: "MOQ / MCQ",
  surcharge: "Surcharge",
  remark: "Remark",
  fabric_name_en: "Fabric Name (EN)",
  structure: "Structure",
  composition: "Composition",
  function: "Function",
  cuttable_width: "Cuttable Width",
  no_scan_history: "No scan history.",
  time: "Time",
  taker: "Taker",
  quantity: "Quantity",
  edit: "Edit",
  print_label: "Print Label",
  delete: "Delete",
  supplier_name_2: "Supplier Name",

  generic_subtitle_accessory: "Buttons, zips, labels, etc.",
  generic_subtitle_pattern: "Digital and physical pattern files",
  generic_subtitle_catalog: "Master library catalogs",
  generic_subtitle_concept: "Inspirational assets linked to fabric hangers",
  generic_subtitle_yardage: "Rolls available for samples",
  generic_subtitle_color: "Approved brand colors & palettes",
  generic_subtitle_trim: "Pre-approved trim kits",
  generic_subtitle_archive: "Discontinued or archived items",
  generic_subtitle_product: "Product samples and mockups",
  
  edit_fabric_hanger: "Edit Fabric Hanger",
  add_fabric_hanger: "Add Fabric Hanger",
  dashboard_desc: "R&D Material Warehouse Overview",
  modules: "Modules",
  quick_actions: "Quick Actions"
};

const map = {};
for(const [k, v] of Object.entries(enKeys)) {
  map[v.trim()] = k;
}
map["Supplier Name"] = "supplier_name";
map["Dashboard"] = "dashboard";
map["Overview"] = "groupOverview";

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('src/apps/RD_MATERIAL/pages');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  let newContent = content.replace(/t\('rdMaterial\.',\s*['"](.*?)['"]\)/g, function(match, text) {
    if(map[text]) {
      return 	('rdMaterial.', '');
    }
    // manual fallbacks if strictly needed
    if(text === "Thông tin chung") return 	('rdMaterial.general_info', '');
    console.log("NOT FOUND IN MAP: " + text);
    return match; // return original if not matched
  });

  if (content !== newContent) {
    fs.writeFileSync(f, newContent, 'utf-8');
    console.log('Fixed file:', f);
  }
});
