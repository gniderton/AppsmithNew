export default {
    getFilteredPendingBills: () => {
        // 1. Get raw data and ensure it's an array
        const rawData = getGRNList.data || [];
        const allBills = Array.isArray(rawData) ? rawData : [rawData];
        
        // 2. Get today's date (at start of day for clean math)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const selectedVendorId = appsmith.store.selectedVendor?.id;
        if (!selectedVendorId) return [];

        // 3. Filter and Map
        return allBills
            .filter(bill => 
                bill && 
                Number(bill.vendor_id) === Number(selectedVendorId) && 
                Number(bill.balance) > 0
            )
            .map(bill => {
                // Calculate AR Days
                const receivedDate = new Date(bill.received_date);
                receivedDate.setHours(0, 0, 0, 0);
                
                const diffTime = today.getTime() - receivedDate.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                return {
                    ...bill,
                    "AR Days": diffDays >= 0 ? diffDays : 0 // Result: 0 or positive days
                };
            });
    }
}