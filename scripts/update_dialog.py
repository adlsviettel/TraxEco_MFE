import re
import os

filepath = r"d:\TSI\TestClaudeCode\TraxEco\src\apps\TCC_TEMPLATE\components\RequestFormDialog.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { format } from 'date-fns';",
    "import { format, addDays, getDay } from 'date-fns';"
)
content = content.replace(
    "import { tccService, type CreateRequestPayload, type TccMachineTemplate } from '../services/tccService';",
    "import { tccService, type CreateRequestPayload, type TccMachineTemplate, type TccLeadTimeConfig } from '../services/tccService';"
)

# 2. States
content = content.replace(
    "const [machineTemplates, setMachineTemplates] = useState<TccMachineTemplate[]>([]);",
    "const [machineTemplates, setMachineTemplates] = useState<TccMachineTemplate[]>([]);\n  const [leadTimeConfigs, setLeadTimeConfigs] = useState<TccLeadTimeConfig[]>([]);\n  const [minDeliveryDate, setMinDeliveryDate] = useState<Date | null>(null);"
)

# 3. loadMetadata
load_meta_addition = """
          try {
            const configs = await tccService.getLeadTimeConfigs();
            setLeadTimeConfigs(configs);
          } catch (e) {
            console.error('Failed to load lead time configs', e);
          }
"""
content = content.replace(
    "          const templates = await tccService.getMachineTemplates();",
    load_meta_addition + "          const templates = await tccService.getMachineTemplates();"
)

# 4. useEffect minDate
use_effect_code = """
  const addWorkingDays = (startDate: Date, days: number): Date => {
    if (days <= 0) return startDate;
    let currentDate = startDate;
    let addedDays = 0;
    while (addedDays < days) {
      currentDate = addDays(currentDate, 1);
      if (getDay(currentDate) !== 0) {
        addedDays++;
      }
    }
    return currentDate;
  };

  useEffect(() => {
    if (!form.factory || !form.processType) {
      setMinDeliveryDate(null);
      return;
    }
    
    if (form.isPriority === 'Yes') {
      setMinDeliveryDate(new Date());
      return;
    }

    const config = leadTimeConfigs.find(c => c.factoryName === form.factory && c.processType === form.processType);
    
    let leadTime = config ? config.leadTimeDays : (form.processType === 'Light Process' ? 2 : 5);
    
    if (leadTime === null) {
       setMinDeliveryDate(new Date());
    } else {
       setMinDeliveryDate(addWorkingDays(new Date(), leadTime));
    }
  }, [form.factory, form.processType, form.isPriority, leadTimeConfigs]);

  const handleSubmit = async (e: React.FormEvent) => {
"""

content = content.replace(
    "  const handleSubmit = async (e: React.FormEvent) => {",
    use_effect_code
)

# 5. DatePicker minDate
content = content.replace(
    "                          onChange={(val: Date | null) => handleChange('expectedDeliveryDate', val)}",
    "                          onChange={(val: Date | null) => handleChange('expectedDeliveryDate', val)}\n                          minDate={minDeliveryDate || undefined}"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Dialog updated!")
