export default {
  approveRow: async () => {
    // 1. Get current row data and combine with edits
    const row = tblExpenses.triggeredRow;
    const bankId = tblExpenses.updatedRow.bank_account_id || row.bank_account_id;

    // 2. Trigger the API with params
    await processExpenseAPI.run({
        id: row.id,
        action: 'Verified',
        bank_account_id: bankId,
        user_id: appsmith.user.id
    });

    // 3. Refresh and Alert
    getReportDetails.run();
		getSyncExpenses.run();
    showAlert("Expense Approved!", "success");
  }
}
