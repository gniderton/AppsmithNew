export default {
    /**
     * 1. MERGE LOGIC (The Data Source)
     * Use this as the Data Source for all your tables!
     */
    getMergedData: () => {
        const dbData = getReportDetails.data;
        const localChanges = appsmith.store.stagedChanges || {};

        if (!dbData || !dbData.payments) return { payments: [], expenses: [], summary: {} };

        // Patch Payments
        const mergedPayments = dbData.payments.map(p => {
            const change = localChanges[String(p.id)];
            if (change && change.type === 'payment') {
                return { ...p, verification_status: change.status, rejection_reason: change.reason };
            }
            return p;
        });

        // Patch Expenses
        const mergedExpenses = (dbData.expenses || []).map(e => {
            const change = localChanges[String(e.id)];
            if (change && change.type === 'expense') {
                return { ...e, status: change.status, rejection_reason: change.reason };
            }
            return e;
        });

        return { ...dbData, payments: mergedPayments, expenses: mergedExpenses };
    },

    /**
     * 2. SUMMARY & STATS
     * Calculates real-time totals.
     */
    getSummaryStats: () => {
        // Change 'utils' below if you named your JS Object something else!
        const data = utils.getMergedData(); 
        if (!data || !data.payments) return {};

        const sum = (items) => items.reduce((acc, i) => acc + Number(i.amount || 0), 0);
        const p = data.payments;
        const e = data.expenses || [];

        const stats = {
            cash_pending: sum(p.filter(x => x.payment_mode === 'Cash' && x.verification_status === 'Pending')),
            cheque_pending: sum(p.filter(x => x.payment_mode === 'Cheque' && x.verification_status === 'Pending')),
            online_pending: sum(p.filter(x => ['NEFT','UPI','Bank Transfer'].includes(x.payment_mode) && x.verification_status === 'Pending')),
            expenses_pending: sum(e.filter(x => x.status === 'Pending')),
            expense_auth_blocked: data.expense_stats?.requires_auth && data.expense_stats?.daily_total > 250
        };

        stats.all_cleared = (stats.cash_pending + stats.cheque_pending + stats.online_pending + stats.expenses_pending) === 0 && !stats.expense_auth_blocked;
        return stats;
    },

    /**
     * 3. CATEGORY STAGER (The Final Decision Decision)
     * ✨ This is where 'Rejected' vs 'Verified' is decided!
     */
    stageCategory: async (rows, categoryLabel) => {
        const current = appsmith.store.stagedChanges || {};
        
        rows.forEach(line => {
            const reasonVal = line.rejection_reason;
            // The Logic: If reason is NOT 0, it's a Reject. Else, it's a Verify.
            const isRejected = (reasonVal && Number(reasonVal) !== 0);

            current[String(line.id)] = { 
                type: 'payment',
                status: isRejected ? 'Rejected' : 'Verified', // Decided here!
                reason: isRejected ? reasonVal : null 
            };
        });

        await storeValue('stagedChanges', current);
        showAlert(`${categoryLabel} items processed!`, "success");
    },

    /**
     * 4. CELL SYNC (Silent Record)
     * Just records the selection to clear the 'blue mark'.
     * Status stays 'Pending' until the Stage button is clicked.
     */
    syncEdit: async (row, update, type) => {
        if (!row || !row.id) return; 
        const current = appsmith.store.stagedChanges || {};
        
        // Save the selection, but ALWAYS keep status as 'Pending' for now
        const finalReason = (update.rejection_reason !== undefined) ? update.rejection_reason : row.rejection_reason;
        
        current[String(row.id)] = { 
            type: type, 
            status: 'Pending', // Stays pending for now!
            reason: finalReason 
        };
        await storeValue('stagedChanges', current);
    },

    /**
     * 5. INDIVIDUAL APPROVE
     */
    approveRow: async () => {
        const row = tblExpenses.triggeredRow;
        if (!row || !row.id) return;
        const bankId = tblExpenses.updatedRow.bank_account_id || row.bank_account_id;

        await processExpenseAPI.run({
            id: row.id,
            action: 'Verified',
            bank_account_id: bankId,
            user_id: appsmith.user.id
        });

        getReportDetails.run();
        showAlert("Expense Approved!", "success");
    }
}
