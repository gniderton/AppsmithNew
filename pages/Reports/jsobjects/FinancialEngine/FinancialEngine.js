export default {
// Add this inside your FinancialEngine JS Object
getRunningStatement: () => {
    const rawData = fetch_source_transactions.data || {};
    const transactions = rawData.transactions || [];
    let runningBal = Number(rawData.opening_balance || 0);

    return transactions.map(row => {
        const inflow = Number(row.inflow || 0);
        const outflow = Number(row.outflow || 0);
        runningBal += (inflow - outflow);
        
        return {
            ...row,
            running_balance: runningBal.toFixed(2)
        };
    });
}
}