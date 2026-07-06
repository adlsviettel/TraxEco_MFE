import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace TableHead
table_head_old = '''              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>ShippingMark ID</TableCell>
                  <TableCell>CustNo</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Dài (L)</TableCell>
                  <TableCell>Rộng (W)</TableCell>
                  <TableCell>Cao (H)</TableCell>
                  <TableCell>Mặt in</TableCell>
                  <TableCell>Seal</TableCell>
                  <TableCell>PosX</TableCell>
                  <TableCell>PosY</TableCell>
                  <TableCell>ShipDest</TableCell>
                  <TableCell>Ext1</TableCell>
                  <TableCell align="center" sx={{ 
                    position: 'sticky', 
                    right: 0, 
                    bgcolor: 'background.paper', 
                    zIndex: 1, 
                    borderLeft: '1px solid #e0e0e0',
                    boxShadow: '-2px 0 5px rgba(0,0,0,0.05)'
                  }}>
                    Thao tác
                  </TableCell>
                </TableRow>
              </TableHead>'''

# Note: In the file, the Vietnamese characters are actually:
# DAi (L), RTng (W), Cao (H), Mt in, Thao tAc etc.
# Because of encoding issues when the file was originally created or modified.
# So it's safer to use regex to replace the entire TableHead.

table_head_new = '''              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Số Lượng Tem</TableCell>
                  <TableCell>CustNo</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Dài (L)</TableCell>
                  <TableCell>Rộng (W)</TableCell>
                  <TableCell>Cao (H)</TableCell>
                  <TableCell>ShipDest</TableCell>
                  <TableCell align="center" sx={{ 
                    position: 'sticky', 
                    right: 0, 
                    bgcolor: 'background.paper', 
                    zIndex: 1, 
                    borderLeft: '1px solid #e0e0e0',
                    boxShadow: '-2px 0 5px rgba(0,0,0,0.05)'
                  }}>
                    Thao tác
                  </TableCell>
                </TableRow>
              </TableHead>'''

content = re.sub(r'<TableHead>.*?</TableHead>', table_head_new, content, flags=re.DOTALL)

# Replace TableBody
table_body_new = '''            <TableBody>
              {paginatedConfigs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">Không có dữ liệu. Hãy thêm mới hoặc tìm kiếm PO.</TableCell>
                </TableRow>
              ) : (
                paginatedConfigs.map((group: any) => (
                  <TableRow key={group.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>{group.marks.length > 0 ? group.marks[0].recNo : ''}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>{group.marks.length} tem</TableCell>
                    <TableCell>{group.custNo}</TableCell>
                    <TableCell>{group.customer}</TableCell>
                    <TableCell><strong>{group.ctnL}</strong></TableCell>
                    <TableCell><strong>{group.ctnW}</strong></TableCell>
                    <TableCell><strong>{group.ctnH}</strong></TableCell>
                    <TableCell>{group.shipDest}</TableCell>
                    <TableCell align="center" sx={{ 
                      position: 'sticky', 
                      right: 0, 
                      bgcolor: 'background.paper', 
                      zIndex: 1, 
                      borderLeft: '1px solid #e0e0e0'
                    }}>
                      <Stack direction="row" justifyContent="center">
                        <Tooltip title="Chỉnh sửa (Sửa cả cụm)">
                          <IconButton size="small" color="primary" onClick={() => handleOpenDialogGroup(group)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Nhân bản (Copy cả cụm)">
                          <IconButton size="small" color="info" onClick={() => handleOpenDialogGroup(group, true)}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa cả cụm">
                          <IconButton size="small" color="error" onClick={() => handleDeleteGroup(group)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>'''

content = re.sub(r'<TableBody>.*?</TableBody>', table_body_new, content, flags=re.DOTALL)

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
