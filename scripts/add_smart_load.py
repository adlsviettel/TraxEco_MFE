import re

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The logic to inject inside handleFetchPO
# We'll find where `setDuplicateWarning` is called.
target_block = """        if (newCustNo && newShipDest && parsedDims.length > 0) {
          // Check if ALL these dimensions already exist
          const allExist = parsedDims.every((dim: any) => 
            configs.some(c => 
              c.custNo === newCustNo && 
              c.shipDest === newShipDest &&
              c.ctnL === dim.l &&
              c.ctnW === dim.w &&
              c.ctnH === dim.h
            )
          );
          setDuplicateWarning(allExist);
        } else {
          setDuplicateWarning(false);
        }"""

replacement_block = """        if (newCustNo && newShipDest) {
          // 1. Check for duplicates
          if (parsedDims.length > 0) {
            const allExist = parsedDims.every((dim: any) => 
              configs.some(c => 
                c.custNo === newCustNo && 
                c.shipDest === newShipDest &&
                c.ctnL === dim.l &&
                c.ctnW === dim.w &&
                c.ctnH === dim.h
              )
            );
            setDuplicateWarning(allExist);
          } else {
            setDuplicateWarning(false);
          }

          // 2. Smart Auto-Load: Find historical shipping marks used for this Label + ShipDest
          const historicalConfigs = configs.filter(c => c.custNo === newCustNo && c.shipDest === newShipDest);
          if (historicalConfigs.length > 0) {
            const uniqueMarks: any[] = [];
            const seen = new Set();
            historicalConfigs.forEach(hc => {
              const key = `${hc.shippingMarkId}-${hc.area}-${hc.sealMethod}`;
              if (!seen.has(key)) {
                seen.add(key);
                uniqueMarks.push({
                  id: Date.now() + Math.random(),
                  shippingMarkId: hc.shippingMarkId || 0,
                  area: hc.area || 'A',
                  sealMethod: hc.sealMethod || 'H',
                  posX: 0, // Will be recalculated below
                  posY: 0
                });
              }
            });
            if (uniqueMarks.length > 0) {
              setMarksData(uniqueMarks); // Pre-fill the dynamic array!
            }
          }

        } else {
          setDuplicateWarning(false);
        }"""

content = content.replace(target_block, replacement_block)

# One more thing: when we setMarksData(uniqueMarks), the recalculation logic below it MUST use `prev => prev.map` to update PosX/PosY.
# The `setMarksData(prev => ...)` is safe because React state updates in the same tick are batched, but `prev` will be the previous state, NOT `uniqueMarks` if we just called `setMarksData(uniqueMarks)`.
# Wait, `setMarksData` is async! If we call `setMarksData(uniqueMarks)`, and then right after we call `setMarksData(prev => ...)`, `prev` might NOT be `uniqueMarks` yet!
# We should apply the PosX/PosY calculation directly to `uniqueMarks` if we have them, OR we just do it inside the `setMarksData(prev => ...)` but wait, if `prev` is the old state, the new items won't be in `prev`.

# Let's fix the recalculation block:
recalc_old = """        // Recalculate marks UI just for the first dimension for display purposes
        if (parsedDims.length > 0) {
          const l = parseFloat(firstL) || 0;
          const w = parseFloat(firstW) || 0;
          const h = parseFloat(firstH) || 0;
          
          setMarksData(prev => prev.map(m => {
            let px = m.posX;
            let py = m.posY;
            if (m.area === 'A' || m.area === 'B') {
              if (l > 0) px = parseFloat(((l - 200) / 2).toFixed(2));
              if (h > 0) py = parseFloat(((h - 160) / 2).toFixed(2));
            } else if (m.area === 'C' || m.area === 'D') {
              if (w > 0) px = parseFloat(((w - 200) / 2).toFixed(2));
              if (h > 0) py = parseFloat(((h - 160) / 2).toFixed(2));
            }
            return { ...m, posX: px, posY: py };
          }));
        }"""

recalc_new = """        // Recalculate marks UI just for the first dimension for display purposes
        if (parsedDims.length > 0) {
          const l = parseFloat(firstL) || 0;
          const w = parseFloat(firstW) || 0;
          const h = parseFloat(firstH) || 0;
          
          setMarksData(prev => {
            // If we just loaded historical marks, 'prev' might not have them yet if batched,
            // but actually setMarksData uses the functional updater. Wait, we called setMarksData(uniqueMarks) earlier!
            // To be safe, we calculate coordinates dynamically based on whatever is in state.
            return prev.map(m => {
              let px = m.posX;
              let py = m.posY;
              if (m.area === 'A' || m.area === 'B') {
                if (l > 0) px = parseFloat(((l - 200) / 2).toFixed(2));
                if (h > 0) py = parseFloat(((h - 160) / 2).toFixed(2));
              } else if (m.area === 'C' || m.area === 'D') {
                if (w > 0) px = parseFloat(((w - 200) / 2).toFixed(2));
                if (h > 0) py = parseFloat(((h - 160) / 2).toFixed(2));
              }
              return { ...m, posX: px, posY: py };
            });
          });
        }"""

# Actually, a better way is to calculate PosX/PosY directly in the `uniqueMarks` creation, and then just call `setMarksData(uniqueMarks)` ONCE.
# Let's replace the whole block:
full_old = """        // Show first dimension in commonData
        const firstL = parsedDims.length > 0 ? parsedDims[0].l : commonData.ctnL;
        const firstW = parsedDims.length > 0 ? parsedDims[0].w : commonData.ctnW;
        const firstH = parsedDims.length > 0 ? parsedDims[0].h : commonData.ctnH;

        if (newCustNo && newShipDest && parsedDims.length > 0) {
          // Check if ALL these dimensions already exist
          const allExist = parsedDims.every((dim: any) => 
            configs.some(c => 
              c.custNo === newCustNo && 
              c.shipDest === newShipDest &&
              c.ctnL === dim.l &&
              c.ctnW === dim.w &&
              c.ctnH === dim.h
            )
          );
          setDuplicateWarning(allExist);
        } else {
          setDuplicateWarning(false);
        }

        setCommonData(prev => ({
          ...prev,
          custNo: newCustNo,
          shipDest: newShipDest,
          ctnL: firstL,
          ctnW: firstW,
          ctnH: firstH
        }));
        
        // Recalculate marks UI just for the first dimension for display purposes
        if (parsedDims.length > 0) {
          const l = parseFloat(firstL) || 0;
          const w = parseFloat(firstW) || 0;
          const h = parseFloat(firstH) || 0;
          
          setMarksData(prev => prev.map(m => {
            let px = m.posX;
            let py = m.posY;
            if (m.area === 'A' || m.area === 'B') {
              if (l > 0) px = parseFloat(((l - 200) / 2).toFixed(2));
              if (h > 0) py = parseFloat(((h - 160) / 2).toFixed(2));
            } else if (m.area === 'C' || m.area === 'D') {
              if (w > 0) px = parseFloat(((w - 200) / 2).toFixed(2));
              if (h > 0) py = parseFloat(((h - 160) / 2).toFixed(2));
            }
            return { ...m, posX: px, posY: py };
          }));
        }"""

full_new = """        // Show first dimension in commonData
        const firstL = parsedDims.length > 0 ? parsedDims[0].l : commonData.ctnL;
        const firstW = parsedDims.length > 0 ? parsedDims[0].w : commonData.ctnW;
        const firstH = parsedDims.length > 0 ? parsedDims[0].h : commonData.ctnH;

        setCommonData(prev => ({
          ...prev,
          custNo: newCustNo,
          shipDest: newShipDest,
          ctnL: firstL,
          ctnW: firstW,
          ctnH: firstH
        }));

        if (newCustNo && newShipDest) {
          // 1. Check Duplicates
          if (parsedDims.length > 0) {
            const allExist = parsedDims.every((dim: any) => 
              configs.some(c => 
                c.custNo === newCustNo && 
                c.shipDest === newShipDest &&
                c.ctnL === dim.l &&
                c.ctnW === dim.w &&
                c.ctnH === dim.h
              )
            );
            setDuplicateWarning(allExist);
          } else {
            setDuplicateWarning(false);
          }

          // 2. Smart Auto-Load & Recalculate
          const l = parseFloat(firstL) || 0;
          const w = parseFloat(firstW) || 0;
          const h = parseFloat(firstH) || 0;

          const historicalConfigs = configs.filter(c => c.custNo === newCustNo && c.shipDest === newShipDest);
          if (historicalConfigs.length > 0) {
            const uniqueMarks: any[] = [];
            const seen = new Set();
            historicalConfigs.forEach(hc => {
              const key = `${hc.shippingMarkId}-${hc.area}-${hc.sealMethod}`;
              if (!seen.has(key)) {
                seen.add(key);
                
                let px = 0;
                let py = 0;
                if (hc.area === 'A' || hc.area === 'B') {
                  if (l > 0) px = parseFloat(((l - 200) / 2).toFixed(2));
                  if (h > 0) py = parseFloat(((h - 160) / 2).toFixed(2));
                } else if (hc.area === 'C' || hc.area === 'D') {
                  if (w > 0) px = parseFloat(((w - 200) / 2).toFixed(2));
                  if (h > 0) py = parseFloat(((h - 160) / 2).toFixed(2));
                }

                uniqueMarks.push({
                  id: Date.now() + Math.random(),
                  shippingMarkId: hc.shippingMarkId || 0,
                  area: hc.area || 'A',
                  sealMethod: hc.sealMethod || 'H',
                  posX: px,
                  posY: py
                });
              }
            });
            if (uniqueMarks.length > 0) {
              setMarksData(uniqueMarks);
            }
          } else {
            // No history, just recalculate existing marksData
            setMarksData(prev => prev.map(m => {
              let px = m.posX;
              let py = m.posY;
              if (m.area === 'A' || m.area === 'B') {
                if (l > 0) px = parseFloat(((l - 200) / 2).toFixed(2));
                if (h > 0) py = parseFloat(((h - 160) / 2).toFixed(2));
              } else if (m.area === 'C' || m.area === 'D') {
                if (w > 0) px = parseFloat(((w - 200) / 2).toFixed(2));
                if (h > 0) py = parseFloat(((h - 160) / 2).toFixed(2));
              }
              return { ...m, posX: px, posY: py };
            }));
          }
        } else {
          setDuplicateWarning(false);
          // Just recalculate existing marksData
          const l = parseFloat(firstL) || 0;
          const w = parseFloat(firstW) || 0;
          const h = parseFloat(firstH) || 0;
          setMarksData(prev => prev.map(m => {
            let px = m.posX;
            let py = m.posY;
            if (m.area === 'A' || m.area === 'B') {
              if (l > 0) px = parseFloat(((l - 200) / 2).toFixed(2));
              if (h > 0) py = parseFloat(((h - 160) / 2).toFixed(2));
            } else if (m.area === 'C' || m.area === 'D') {
              if (w > 0) px = parseFloat(((w - 200) / 2).toFixed(2));
              if (h > 0) py = parseFloat(((h - 160) / 2).toFixed(2));
            }
            return { ...m, posX: px, posY: py };
          }));
        }"""

content = content.replace(full_old, full_new)

with open(r'd:\TSI\TestClaudeCode\TraxEco\src\apps\FGS_WH\pages\LabelConfigPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
