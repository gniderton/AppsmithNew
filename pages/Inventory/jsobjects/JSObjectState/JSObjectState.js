export default {
	initializeState: async () => {
		storeValue('printState', {});
		storeValue('isPrinting', false);
		storeValue('poLines', []);
		storeValue('piLines', []);
		storeValue('poMode', 'CREATE');
		storeValue('selectedVendor', {});
		storeValue('selectedBrand', {});
		storeValue('modalMode', 'import');
		storeValue('importData', []);
		storeValue('importErrors', []);
		storeValue('debitLinesData', []);
		storeValue('bulkUpdateData', []);
		storeValue('selectedPOId', []);
		storeValue('CorrectionID',[]);
		storeValue('selectedPO',[]);
		storeValue('paymentamount',0)
	}
}