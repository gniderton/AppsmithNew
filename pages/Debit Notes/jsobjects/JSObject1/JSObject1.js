export default {
  duplicateRow: async () => {
    // 1. Get the current list
    const currentData = appsmith.store.GlobalDebitLinesData || [];
    const index = tblDebitLines.triggeredRowIndex;

    if (index === undefined || index === -1) {
      showAlert("Please click the row again", "warning");
      return;
    }

    // 2. Clone the data
    let newData = [...currentData];
    const sourceRow = newData[index];

    // 3. Create the duplicate
    const copy = { 
      ...sourceRow,
      "_row_id": "row_" + Math.random().toString(36).substr(2, 9),
      "Qty": 0, "Gross $": 0, "Disc. $": 0, "Taxable $": 0, "GST $": 0, "Net $": 0 
    };

    // 4. Insert into the array
    newData.splice(index + 1, 0, copy);

    // 5. Update the store and WAIT for it
    await storeValue('GlobalDebitLinesData', newData);
    
    // 6. Force a message to confirm it ran
    showAlert("Row Duplicated", "success");
    
    return appsmith.store.GlobalDebitLinesData;
  }
}
