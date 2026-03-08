export default {
  viewVendorProfile: async () => {
    // 1. Set the Selected Vendor context
    // TriggeredRow contains all columns from the row you clicked
    const vendorRow = tblVendors.triggeredRow || tblVendors.selectedRow;
    await storeValue('selectedVendor', vendorRow);
    
    // 2. Open the Drawer / Panel
    showModal(drawerVendorProfile.name);
    
    // 3. Trigger all required data fetches in parallel
    // This effectively "refreshes" your dependent tables
    await Promise.all([
      Vendors.run(),
      getVendorDebitNotes.run(),
      getVendorPendingBills.getFilteredPendingBills(), // This refreshes tblPendingBills
      getGRNList.run()       // This refreshes tblGrn
    ]);
    
    showAlert(`Viewing Profile: ${vendorRow.vendor_name}`, "info");
  }
}