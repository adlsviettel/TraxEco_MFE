import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add imports
import_target = "import { authFetch } from '../../../services/apiInterceptor';"
if "import { customerService, type Customer }" not in content:
    content = content.replace(import_target, import_target + "\nimport { customerService, type Customer } from '../services/customerService';")

# 2. Add customers state
state_target = "  const [marksData, setMarksData] = useState<MarkData[]>([]);"
state_replacement = """  const [marksData, setMarksData] = useState<MarkData[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);"""
if "const [customers, setCustomers] =" not in content:
    content = content.replace(state_target, state_replacement)

# 3. Fetch customers on mount
fetch_target = "    fetchConfigs();\n    fetchShippingMarks();"
fetch_replacement = """    fetchConfigs();
    fetchShippingMarks();
    customerService.getAll().then(data => setCustomers(data)).catch(err => console.error('Failed to load customers', err));"""
if "customerService.getAll" not in content:
    content = content.replace(fetch_target, fetch_replacement)

# 4. Replace TextField with Autocomplete for Customer
textfield_target = """<TextField label="Khách Hàng (Customer)" value={commonData.customer} onChange={e => setCommonData({ ...commonData, customer: e.target.value })} size="small" fullWidth required />"""
autocomplete_replacement = """<Autocomplete
                freeSolo
                options={customers.map(c => c.custmName)}
                value={commonData.customer}
                onChange={(_, newValue) => setCommonData({ ...commonData, customer: newValue || '' })}
                onInputChange={(_, newInputValue) => setCommonData({ ...commonData, customer: newInputValue })}
                renderInput={(params) => (
                  <TextField {...params} label="Khách Hàng (Customer)" size="small" fullWidth required />
                )}
              />"""
if autocomplete_replacement not in content:
    content = content.replace(textfield_target, autocomplete_replacement)

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
