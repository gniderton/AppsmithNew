export default {
  viewVendorProfile: async () => {
    // 1. Set the Selected Vendor context
    const vendorRow = tblVendors.triggeredRow || tblVendors.selectedRow;
    await storeValue('selectedVendor', vendorRow);
    
    // 2. Open the Drawer / Panel (Best to use String name)
    showModal('drawerVendorProfile');
    
    // 3. Trigger all required data fetches in parallel
    // ONLY run the queries. The JS functions (Ledger_Logic, etc.) 
    // will react and update your tables automatically when the data arrives!
    await Promise.all([
      Vendors.run(),
      getVendorDebitNotes.run(),
      getVendorLedger.run(),
      getGRNList.run(),
			getVendorPendingBills.getFilteredPendingBills(),
			Ledger_Logic.getVendorLedgerData()
    ]);
    
    showAlert(`Viewing Profile: ${vendorRow.vendor_name}`, "info");
  }
}