export default {
  // 1. Initialize empty counts (Set to run on Page Load)
  initializeTable: () => {
    const initialData = [
      { id: 1, note: 500, count: 0 }, { id: 2, note: 200, count: 0 }, 
      { id: 3, note: 100, count: 0 }, { id: 4, note: 50,  count: 0 }, 
      { id: 5, note: 20,  count: 0 }, { id: 6, note: 10,  count: 0 },
      { id: 7, note: 5,   count: 0 }, { id: 8, note: 2,   count: 0 }, 
      { id: 9, note: 1,   count: 0 }
    ];
    storeValue('denoms', initialData);
  },

  // 2. Commit cell edit immediately (Clears the blue icon)
  // Call this from tblDenominations -> count column -> onSave
  onCellEdit: () => {
    // Clone and update
    let data = [...appsmith.store.denoms];
    const index = data.findIndex(row => row.id === tblDenominations.updatedRow.id);
    if (index !== -1) {
      data[index].count = Number(tblDenominations.updatedRow.count) || 0;
      storeValue('denoms', data);
    }
  },

  // 3. Real-time Total Calculation for Verification
  getTotalSum: () => {
    return (appsmith.store.denoms || []).reduce((acc, row) => acc + (row.note * (row.count || 0)), 0);
  },

  // 4. Format data for the Backend API
  getApiObject: () => {
    return (appsmith.store.denoms || []).reduce((acc, row) => {
      acc[row.note.toString()] = Number(row.count) || 0;
      return acc;
    }, {});
  },

  // 5. Final Submit Logic
  handleTransfer: async () => {
    const formData = JSONFormTransfer.formData;
    const amount = Number(formData.Basic_Details?.amount || 0);
    const fromId = formData.Source_Account?.from_account_id;
    const toId = formData.Destination_Account?.to_account_id;

    // A. Visual Checks
    if (fromId === toId) return showAlert("Source and Destination accounts cannot be the same", "error");
    if (amount <= 0) return showAlert("Transfer amount must be greater than zero", "error");

    // B. Accounting Check (Cash Verification)
    if (fromId == 1 || toId == 1) {
      const tableSum = this.getTotalSum();
      if (tableSum !== amount) {
        return showAlert(`Counting Error! Table total is ₹${tableSum}, but you typed ₹${amount} in the form. Please match them.`, "error");
      }
    }

    // C. Execute API
    try {
      await createTransfer.run();
      showAlert("Internal Transfer Recorded Successfully!", "success");
      
      // D. Clean up
      resetWidget("JSONFormTransfer");
      this.initializeTable();
      
      // Refresh balances or lists if needed
      // getAccountBalances.run();
    } catch (e) {
      showAlert(e.message || "Something went wrong while saving", "error");
    }
  }
}
