import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

table_new = '''            <TableBody>
              {paginatedConfigs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} align="center">Không có dữ liệu. Hãy thêm mới hoặc tìm kiếm PO.</TableCell>
                </TableRow>
              ) : (
                paginatedConfigs.map((group: any) => (
                  <TableRow key={group.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>{group.marks.length > 0 ? group.marks[0].recNo : ''}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{group.marks.map((m: any) => m.shippingMarkId).join(', ')}</TableCell>
                    <TableCell>{group.custNo}</TableCell>
                    <TableCell>{group.customer}</TableCell>
                    <TableCell><strong>{group.ctnL}</strong></TableCell>
                    <TableCell><strong>{group.ctnW}</strong></TableCell>
                    <TableCell><strong>{group.ctnH}</strong></TableCell>
                    <TableCell>{group.marks.map((m: any) => m.area).join(', ')}</TableCell>
                    <TableCell>{group.marks.map((m: any) => m.sealMethod).join(', ')}</TableCell>
                    <TableCell sx={{ color: '#1976d2' }}>
                      {group.marks.map((m: any) => m.posX).join(', ')}
                    </TableCell>
                    <TableCell sx={{ color: '#1976d2' }}>
                      {group.marks.map((m: any) => m.posY).join(', ')}
                    </TableCell>
                    <TableCell>{group.shipDest}</TableCell>
                    <TableCell>{group.marks.map((m: any) => m.ext1 || '').join(', ')}</TableCell>
                    <TableCell>
                      <Stack direction="row">
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

# Also update the delete icon inside the Dialog
delete_icon_new = '''                  {!editingId && marksData.length > 1 && (
                    <IconButton color="error" onClick={() => {
                      if (mark.recNo) {
                        setDeletedMarks(prev => [...prev, mark.recNo]);
                      }
                      setMarksData(p => p.filter(m => m.id !== mark.id));
                    }}>
                      <DeleteIcon />
                    </IconButton>
                  )}'''

# Also update executeSave
execute_save_new = '''  const executeSave = async () => {
    try {
      setLoading(true);
      
      for (const recNo of deletedMarks) {
         await authFetch(`/v2/label-config/${recNo}`, { method: 'DELETE' });
      }

      const promises: any[] = [];
      const dimsToSave = fetchedDimensions.length > 0 
        ? fetchedDimensions 
        : [{ l: commonData.ctnL, w: commonData.ctnW, h: commonData.ctnH }];

      dimsToSave.forEach(dim => {
        marksData.forEach(mark => {
          let px = mark.posX;
          let py = mark.posY;
          
          if (!mark.recNo || (px === 0 && py === 0)) {
            const dimL = parseFloat(dim.l) || 0;
            const dimW = parseFloat(dim.w) || 0;
            const dimH = parseFloat(dim.h) || 0;
            
            if (mark.area === 'A' || mark.area === 'B') {
              if (dimL > 0) px = parseFloat(((dimL - 200) / 2).toFixed(2));
              if (dimH > 0) py = parseFloat(((dimH - 160) / 2).toFixed(2));
            } else if (mark.area === 'C' || mark.area === 'D') {
              if (dimW > 0) px = parseFloat(((dimW - 200) / 2).toFixed(2));
              if (dimH > 0) py = parseFloat(((dimH - 160) / 2).toFixed(2));
            }
          }

          const newCustNo = dim.l ? commonData.custNo : commonData.custNo;

          const payload = {
            recNo: mark.recNo,
            custNo: newCustNo,
            ctnL: dim.l ? Math.round(parseFloat(dim.l)).toString() : commonData.ctnL,
            ctnW: dim.w ? Math.round(parseFloat(dim.w)).toString() : commonData.ctnW,
            ctnH: dim.h ? Math.round(parseFloat(dim.h)).toString() : commonData.ctnH,
            posX: px,
            posY: py,
            area: mark.area,
            shipDest: commonData.shipDest,
            customer: commonData.customer,
            shippingMarkId: mark.shippingMarkId,
            sealMethod: mark.sealMethod,
            ext1: commonData.ext1,
            ext2: commonData.ext2,
            ext3: commonData.ext3
          };

          promises.push(
            authFetch('/v2/label-config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
          );
        });
      });

      await Promise.all(promises);
      fetchConfigs();
      handleCloseDialog();
    } catch (err: any) {
      setError(err.message || 'Lưu thất bại');
    } finally {
      setLoading(false);
    }
  };'''

content = re.sub(r'<TableBody>.*?</TableBody>', table_new, content, flags=re.DOTALL)
content = re.sub(r'\{!editingId && marksData\.length > 1 && \(\s*<IconButton color="error" onClick=\{\(\) => setMarksData\(p => p\.filter\(m => m\.id !== mark\.id\)\)\}>\s*<DeleteIcon />\s*</IconButton>\s*\)\}', delete_icon_new, content, flags=re.DOTALL)

# Find executeSave and replace it
import textwrap
content = re.sub(r'const executeSave = async \(\) => \{.*?\n  \};\n', execute_save_new + '\n', content, flags=re.DOTALL)


with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
