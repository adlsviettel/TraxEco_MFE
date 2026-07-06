import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\backend\src\server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the pkQuery in server.ts
old_api = """    // Second, fetch dimensions from InlineFGsWHPkList
    const pkQuery = `
      SELECT TOP 1 CTNL, CTNW, CTNH 
      FROM InlineFGsWHPkList 
      WHERE PONo = @PO OR PONo_9 = RIGHT(@PO, 9)
    `;
    const pkResult = await pool.request().input('PO', sql.NVarChar, po).query(pkQuery);

    res.json({
      success: true,
      data: {
        label: saoResult.recordset.length > 0 ? saoResult.recordset[0].Label : null,
        shipDest: saoResult.recordset.length > 0 ? saoResult.recordset[0].ShipDest : null,
        ctnL: pkResult.recordset.length > 0 ? pkResult.recordset[0].CTNL : null,
        ctnW: pkResult.recordset.length > 0 ? pkResult.recordset[0].CTNW : null,
        ctnH: pkResult.recordset.length > 0 ? pkResult.recordset[0].CTNH : null
      }
    });"""

new_api = """    // Second, fetch ALL DISTINCT dimensions from InlineFGsWHPkList
    const pkQuery = `
      SELECT DISTINCT CTNL, CTNW, CTNH 
      FROM InlineFGsWHPkList 
      WHERE PONo = @PO OR PONo_9 = RIGHT(@PO, 9)
    `;
    const pkResult = await pool.request().input('PO', sql.NVarChar, po).query(pkQuery);

    res.json({
      success: true,
      data: {
        label: saoResult.recordset.length > 0 ? saoResult.recordset[0].Label : null,
        shipDest: saoResult.recordset.length > 0 ? saoResult.recordset[0].ShipDest : null,
        dimensions: pkResult.recordset.map(row => ({
          ctnL: row.CTNL,
          ctnW: row.CTNW,
          ctnH: row.CTNH
        }))
      }
    });"""

content = content.replace(old_api, new_api)

with open(r'd:\TSI\TestClaudeCode\TraxEco\backend\src\server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
