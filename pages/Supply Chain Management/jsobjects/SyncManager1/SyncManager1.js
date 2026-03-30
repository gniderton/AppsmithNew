export default {
  // 1. Run this when you click "View Details" to initialize the tables
 // In your JS Object (e.g., SyncManager)
initSyncDetails: async () => {
  const details = getSyncDetails.data;
  
  // Safety check: if there is no data, return empty lists
  if (!details) return { manifest: [], returns: [] };

  const manifest = (details.manifest || []).map(r => ({ 
    ...r, 
    colVerification: 'Approved' 
  }));
  
  const returns = (details.returns || []).map(r => ({ 
    ...r, 
    colReturnStatus: 'Approved' 
  }));
  
  // Store them for editing
  await storeValue('manifestData', manifest);
  await storeValue('returnsData', returns);

  // 💡 Adding this return fixes the error you are seeing!
  return { manifest, returns };
},

  // 2. Run this in the Manifest Table's "onSave" or "onCellChange"
  handleManifestEdit: (updatedRow, index) => {
    let data = appsmith.store.manifestData;
    data[index] = updatedRow;
    storeValue('manifestData', data);
  },

  // 3. Run this in the Returns Table's "onSave" or "onCellChange"
  handleReturnEdit: (updatedRow, index) => {
    let data = appsmith.store.returnsData;
    data[index] = updatedRow;
    storeValue('returnsData', data);
  },

  // 4. Final Settle Logic
  settle: async () => {
    // Format the payload for the API
    const payload = {
      sync_id: tblSyncLogs.selectedRow.id,
      manifest_verifications: appsmith.store.manifestData.map(r => ({
        invoice_id: r.invoice_id,
        status: r.colVerification
      })),
      return_verifications: appsmith.store.returnsData.map(r => ({
        return_id: r.id,
        status: r.colReturnStatus
      })),
      verified_by: getMe.data.id
    };

    // Run the API
    try {
      await settleSyncAPI.run(payload);
      showAlert('All verifications saved!', 'success');
      getSyncLogs.run(); // Refresh list
      closeModal('mdlVerification');
    } catch (e) {
      showAlert('Save failed: ' + e.message, 'error');
    }
  }
}
