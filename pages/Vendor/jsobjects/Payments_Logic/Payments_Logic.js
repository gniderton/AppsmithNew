export default {
  preparePayment: async () => {
    // 1. Calculate Total using Lodash (available as '_' in Appsmith)
    const totalToPay = _.sumBy(tblPendingBills.selectedRows.map(row=>Number(row.balance))) || 0;
    
    // 2. Store the Total for the Modal Input
    // Set the 'Default Value' of your payment input to: {{appsmith.store.paymentAmount}}
    await storeValue('paymentAmount',totalToPay);
    
    // 3. Trigger Bank/Account Queries in Parallel
    await Promise.all([
      apiGetBank.run(),
      getBankAccounts.run()
    ]);
    
    // 4. Open the Modal
    showModal(modalMakePayment.name);
    
    showAlert(`Amount for Selected Bills: ${totalToPay}`, "info");
  }
}