export default {
  handleExport: () => {
    const sales = getGstr1.data || [];
    const purchases = getGstr3b.data || [];
    
    // Combine data
    const allData = [
      ...sales.map(r => ({ ...r, "ReportType": "GSTR-1 (Sales)" })),
      ...purchases.map(r => ({ ...r, "ReportType": "GSTR-3B (Purchases)" }))
    ];

    if (allData.length === 0) {
      return showAlert("No data found for the selected period", "warning");
    }

    // 1. Create CSV Header
    const headers = Object.keys(allData[0]).join(",");
    
    // 2. Create CSV Rows
    const rows = allData.map(row => 
      Object.values(row).map(value => `"${value}"`).join(",")
    ).join("\n");

    const csvContent = `${headers}\n${rows}`;
    const fileName = `GST_Report_${moment().format('MMM_YYYY')}.csv`;
    
    // 3. Download as CSV
    download(csvContent, fileName, "text/csv");
    
    showAlert('GST Report Generated Successfully!', 'success');
  }
}
