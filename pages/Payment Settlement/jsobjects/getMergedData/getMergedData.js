export default {
  mergedData: () => {
    const dbData = getReportDetails.data;
    const localChanges = appsmith.store.stagedChanges || {};

    if (!dbData || !dbData.payments) return { payments: [], summary: {} };

    // Update the payments with whatever is in the store
    const mergedPayments = dbData.payments.map(p => {
      const change = localChanges[p.id];
      if (change) {
        return { 
          ...p, 
          verification_status: change.status, 
          rejection_reason: change.reason 
        };
      }
      return p;
    });

    return {
      ...dbData,
      payments: mergedPayments
    };
  }
}
