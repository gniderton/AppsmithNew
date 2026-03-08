export default {
	getVendorLedgerData: () => {
		// 1. DATA GUARD: Only process if it's a real Array
		const rawResponse = getVendorLedger.data;
		// Check both the root and the .data property (depending on your API wrapper)
		const rawData = Array.isArray(rawResponse) ? rawResponse : (rawResponse?.data && Array.isArray(rawResponse.data)) ? rawResponse.data : [];

		// 2. Stable Initial State (Prevents Table Schema reset)
		const emptyResult = { opening_balance: 0, transactions: [], closing_balance: 0 };

		// 3. Safety Check: Stop if no dates or no data
		if (!dateStart.selectedDate || !dateEnd.selectedDate || rawData.length === 0) {
			return emptyResult;
		}

		const start = moment(dateStart.selectedDate).startOf('day');
		const end = moment(dateEnd.selectedDate).endOf('day');
		let openingBalance = 0;
		const filteredTxns = [];

		// 4. Sort and Process
		const sorted = _.sortBy(rawData, ['date', 'created_at']);
		sorted.forEach(txn => {
			const txnDate = moment(txn.date);
			const netChange = (Number(txn.credit_amount) || 0) - (Number(txn.debit_amount) || 0);

			if (txnDate.isBefore(start, 'day')) {
				openingBalance += netChange;
			} else if (txnDate.isSameOrBefore(end, 'day') && txnDate.isSameOrAfter(start, 'day')) {
				filteredTxns.push({ ...txn, net_change: netChange });
			}
		});

		// 5. Calculate Running Balances
		let running = openingBalance;
		const finalData = filteredTxns.map(t => {
			running += t.net_change;
			return { ...t, running_balance: Number(running.toFixed(2)) };
		});

		return {
			opening_balance: Number(openingBalance.toFixed(2)),
			transactions: finalData,
			closing_balance: Number(running.toFixed(2))
		};
	}
}