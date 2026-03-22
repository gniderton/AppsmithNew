export default {
  // Safe way to format data for the API
  getPayload: () => {
    const raw = appsmith.store.bulkAdvances || [];
    return raw.map(r => ({
      employee_id: r.id,
      amount: Number(r.amount),
      payment_mode: r.payment_mode,
      from_account_id: r.from_account_id,
      bank_statement_entry_id: r.payment_mode === 'Online' ? r.bank_statement_entry_id : null
    }));
  },

  // The code for your "Confirm Advance" Button
  saveAdvances: async () => {
    try {
      await bulkAdvanceAPI.run();
      showAlert("Advances Issued Successfully!", "success");
      closeModal("ModalSalaryAdvance");
      storeValue('bulkAdvances', []); 
      getEmployeeList.run(); 
    } catch (e) {
      showAlert(e.message, "error");
    }
  }
}
