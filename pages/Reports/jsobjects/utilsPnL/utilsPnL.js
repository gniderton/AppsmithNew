export default {
	// 1. Financial Year Select (Last 3 Years + Next Year)
	getFYOptions: () => {
		const currentYear = new Date().getFullYear();
		const currentMonth = new Date().getMonth() + 1;
		const activeFY = currentMonth >= 4 ? currentYear : currentYear - 1;
		
		const options = [];
		for (let i = -2; i <= 1; i++) {
			const year = activeFY + i;
			options.push({
				label: `FY ${year}-${(year + 1).toString().slice(-2)}`,
				value: year
			});
		}
		return options.sort((a, b) => b.value - a.value); // Newest first
	},

	// 2. Quarter Select
	getQuarterOptions: () => {
		return [
			{ label: "All Quarters", value: "" },
			{ label: "Q1 (Apr - Jun)", value: 1 },
			{ label: "Q2 (Jul - Sep)", value: 2 },
			{ label: "Q3 (Oct - Dec)", value: 3 },
			{ label: "Q4 (Jan - Mar)", value: 4 }
		];
	},

	// 3. Month Select (Standard Calendar Index)
	getMonthOptions: () => {
		const months = [
			"January", "February", "March", "April", "May", "June",
			"July", "August", "September", "October", "November", "December"
		];
		
		const options = [{ label: "All Months", value: "" }];
		
		months.forEach((name, index) => {
			options.push({
				label: name,
				value: index + 1 // Jan = 1, Dec = 12
			});
		});
		
		return options;
	}
}
