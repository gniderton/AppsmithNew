export default {
	// Function to populate the Multi-select widget
	getUniqueMonths: () => {
		const data = salesReport.data.lines || [];
		const months = data.map(item => {
			const d = new Date(item.date);
			return {
				label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
				value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` // Format: "2026-04"
			};
		});

		// Use a Map to filter for unique month-year combinations
		return [...new Map(months.map(m => [m.value, m])).values()]
			.sort((a, b) => b.value.localeCompare(a.value)); // Sort descending (newest first)
	},

	// Helper to get currently filtered data from the Table
	// Replace 'Table1' with your actual table widget name
	getFilteredData: () => {
		const allData = salesReport.data.lines || [];
		const selectedMonths = MultiSelect1.selectedOptionValues;

		if (!selectedMonths || selectedMonths.length === 0) {
			return allData;
		}

		return allData.filter(row => {
			const rowMonth = row.date.substring(0, 7); // Extracts "2026-04"
			return selectedMonths.includes(rowMonth);
		});
	},

	// Stats Calculations
	getStats: () => {
		const data = this.getFilteredData();
		
		const totalGross = data.reduce((sum, row) => sum + (row.total_amount || 0), 0);
		const totalTax = data.reduce((sum, row) => sum + (row.tax || 0), 0);
		const taxableSales = totalGross - totalTax;
		
		const paidInvoices = data.filter(r => r.status === 'Paid');
		const collectionRate = data.length > 0 
			? (paidInvoices.length / data.length) * 100 
			: 0;

		return {
			gross: totalGross.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }),
			taxable: taxableSales.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }),
			tax: totalTax.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }),
			count: data.length,
			rate: collectionRate.toFixed(1) + "%"
		};
	}
}