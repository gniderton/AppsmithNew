export default {
  openNewGRN: async () => {
    // 1. Reset State Variables (Critical for new GRN)
    await storeValue('CorrectionID', null);
    await storeValue('CorrectionData', {});
    await storeValue('piLines', []);
		await storeValue('preSelectedVendor',[]);
		await storeValue('preSelectedPO', []);
		
    
    // 2. Clear All Widgets
    resetWidget("vendorDropdownGRN", true); 
    resetWidget("ChoosePo", true);
    resetWidget("dateVendorInvoice", true);
    resetWidget("vendorInvoiceNo", true);
    resetWidget("dateReceived", true);
    
    // 3. Open the Modal
    showModal(modalFrameGRN.name);
  }
}
