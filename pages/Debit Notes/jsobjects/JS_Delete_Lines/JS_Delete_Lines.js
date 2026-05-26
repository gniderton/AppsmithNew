export default {
  // Option 1: DELETE SELECTED ROWS (Checks the ones to delete, click button)
  deleteSelectedLines: async () => {
    const currentLines = appsmith.store.GlobalDebitLinesData || [];
    const selectedRows = tblDebitLines.selectedRows || [];

    if (selectedRows.length === 0) {
      showAlert("No rows selected to delete.", "warning");
      return;
    }

    // Filter out the selected row IDs
    const selectedIds = selectedRows.map(row => row._row_id);
    const updatedLines = currentLines.filter(line => !selectedIds.includes(line._row_id));

    await storeValue('GlobalDebitLinesData', updatedLines);
    showAlert(`Removed ${selectedRows.length} lines.`, "success");
  },

  // Option 2: KEEP ONLY SELECTED ROWS (Checks the ones to keep, delete everything else)
  keepOnlySelectedLines: async () => {
    const selectedRows = tblDebitLines.selectedRows || [];

    if (selectedRows.length === 0) {
      showAlert("No rows selected. Keeping nothing will clear the table.", "warning");
      return;
    }

    // The selectedRows array is already the set of rows you want to keep
    await storeValue('GlobalDebitLinesData', selectedRows);
    showAlert(`Kept ${selectedRows.length} lines and deleted the rest.`, "success");
  },

  // Option 3: ROW-LEVEL DELETE (Click trash icon on a single row)
  deleteSingleLine: async (rowToDelete) => {
    const currentLines = appsmith.store.GlobalDebitLinesData || [];
    const updatedLines = currentLines.filter(line => line._row_id !== rowToDelete._row_id);
    
    await storeValue('GlobalDebitLinesData', updatedLines);
  }
}