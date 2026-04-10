export default {
    /**
     * 🚀 NEW: VALIDATION RULE
     * Use this in the "Disabled" property of your Approve Button:
     * {{ !utils.canApproveOnline() }}
     */
    canApproveOnline: () => {
        const data = utils.getMergedData();
        const pendingOnline = data.payments.filter(p => 
            ['NEFT','UPI','Bank Transfer'].includes(p.payment_mode) && 
            p.verification_status === 'Pending'
        );

        // If there are no pending items, button should be disabled
        if (pendingOnline.length === 0) return false;

        // Returns true ONLY if every pending line has a selected bank statement ID
        return pendingOnline.every(p => {
            // Check if it has an ID, and ensure it's not an empty string
            return p.bank_stmt_id && String(p.bank_stmt_id).length > 0;
        });
    },

    // ... (Keep your other functions like getMergedData, stageCategory, etc.)
}
