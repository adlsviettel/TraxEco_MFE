import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\backend\src\server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add the new route to server.ts
new_route = """
app.get('/api/inventory/shipping-marks', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT ShippingMarkId as shippingMarkId, ShippingMarkPicture as shippingMarkPicture 
      FROM dbo.SmartWHShippingMark
      ORDER BY ShippingMarkId ASC
    `);
    
    res.json({
      success: true,
      data: result.recordset
    });
  } catch (err: any) {
    console.error('Error fetching shipping marks:', err);
    res.status(500).json({ success: false, message: 'Lỗi lấy dữ liệu tem', error: err.message });
  }
});
"""

# Insert before `app.get('/api/inventory/po-config-info/:po',`
content = content.replace("app.get('/api/inventory/po-config-info/:po',", new_route + "\napp.get('/api/inventory/po-config-info/:po',")

with open(r'd:\TSI\TestClaudeCode\TraxEco\backend\src\server.ts', 'w', encoding='utf-8') as f:
    f.write(content)


with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content_fe = f.read()

# 2. Update fetchShippingMarks in LabelConfigPage.tsx
old_fetch = """  const fetchShippingMarks = async () => {
    try {
      const res = await authFetch(`/v2/packing/shipping-marks`);
      const data = await res.json();
      if (data.code === 200) {
        setShippingMarks(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch shipping marks', err);
    }
  };"""

new_fetch = """  const fetchShippingMarks = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/inventory/shipping-marks`);
      const data = await res.json();
      if (data.success) {
        setShippingMarks(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch shipping marks', err);
    }
  };"""

content_fe = content_fe.replace(old_fetch, new_fetch)

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content_fe)
