export default {
  syncTransitEntry: async () => {
    // 1. Get Changes from Appsmith Table (updatedRows contains the edited cells)
    const changes = tblTransitEntry.updatedRows || [];
    if (changes.length === 0) return;

    // 2. Access Appsmith Store (equivalent to Retool Variables)
    // Assuming your data is stored in the Appsmith store
    let newTableData = _.cloneDeep(appsmith.store.varTransitTableData || []);
    let sessionMap = _.cloneDeep(appsmith.store.varTransitStock || {});

    // 3. Process Changes
    changes.forEach(change => {
      // Appsmith 'updatedRows' structure: { "0": { "qty": 10 }, "1": { "rate": 50 } }
      // The key is the row index. 'change.allRowData' gives the full row.
      const updatedRowData = change.allFields;
      const pid = String(updatedRowData.item_id);
      
      // Find row in our local copy
      const targetIndex = newTableData.findIndex(row => String(row.item_id) === pid);

      if (targetIndex !== -1) {
        // A. Update the specific row
        newTableData[targetIndex] = { ...newTableData[targetIndex], ...updatedRowData };

        // B. Sync to Global Session Map
        const finalRow = newTableData[targetIndex];
        sessionMap[pid] = {
          qty: Number(finalRow.qty),
          batch_code: finalRow.batch_code,
          rate: Number(finalRow.rate)
        };
      }
    });

    // 4. Commit Changes to Appsmith Store
    // 'true' as the second argument ensures the store persists across sessions
    await storeValue("varTransitTableData", newTableData);
    await storeValue("varTransitStock", sessionMap);

    // 5. Cleanup UI Markers 
    // In Appsmith, resetting the table data property usually clears "dirty" cells
    resetWidget("tblTransitEntry", true);

    showAlert(`Updated ${changes.length} line(s)`, "info");
  }
}