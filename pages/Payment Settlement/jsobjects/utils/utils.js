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
            // FIXED: Added String() to match the store key perfectly
            const change = localChanges[String(p.id)];
            if (change && change.type === 'payment') {
                return { ...p, verification_status: change.status, rejection_reason: change.reason };
            }
            return p;
        });

        // Patch Expenses
        const mergedExpenses = (dbData.expenses || []).map(e => {
            // FIXED: Added String() here too
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
        const data = this.getMergedData(); 
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
     * 3. CATEGORY STAGER (Deferred Decision)
     */
    stageCategory: async (rows, categoryLabel) => {
        const current = appsmith.store.stagedChanges || {};
        
        rows.forEach(line => {
            const reasonVal = line.rejection_reason;
            const isRejected = (reasonVal && Number(reasonVal) !== 0);

            current[String(line.id)] = { 
                type: 'payment',
                status: isRejected ? 'Rejected' : 'Verified', 
                reason: isRejected ? reasonVal : null 
            };
        });

        await storeValue('stagedChanges', current);
        showAlert(`${categoryLabel} items processed!`, "success");
    },

    /**
     * 4. CELL SYNC (Silent Record)
     */
    syncEdit: async (row, update, type) => {
        if (!row || !row.id) return; 

        const current = appsmith.store.stagedChanges || {};
        const finalReason = (update.rejection_reason !== undefined) ? update.rejection_reason : row.rejection_reason;
        
        current[String(row.id)] = { 
            type: type, 
            status: 'Pending', 
            reason: finalReason 
        };
        await storeValue('stagedChanges', current);
    },

    /**
     * 5. CASH & DENOMINATION LOGIC
     * Requirement = (Gross Cash Collection) - (All Verified Expenses)
     */
    getCashRequirement: () => {
        const data = this.getMergedData();
        const totalCollection = Number(data.summary?.total_collection_cash || 0);
        
        // Subtract ALL expenses that are 'Verified'. 
        // (In DSR, expenses are paid from the cash collected).
        const totalExpenses = (data.expenses || [])
            .filter(e => e.status === 'Verified')
            .reduce((acc, e) => acc + Number(e.amount || 0), 0);
            
        return totalCollection - totalExpenses;
    },

    getEnteredCashTotal: () => {
        const denoms = appsmith.store.denoms || {};
        // Safety: Ensure every value is treated as a clean number to avoid NaN
        return Object.entries(denoms).reduce((acc, [val, count]) => {
            const denomination = Number(val === 'coins' ? 1 : val) || 0;
            const noteCount = Number(count) || 0;
            return acc + (denomination * noteCount);
        }, 0);
    },

    isCashMatching: () => {
        const req = this.getCashRequirement();
        const entered = this.getEnteredCashTotal();
        return Math.abs(req - entered) < 0.01;
    },

    /**
     * 6. INDIVIDUAL APPROVE
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
