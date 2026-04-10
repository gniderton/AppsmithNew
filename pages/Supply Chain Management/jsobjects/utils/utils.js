export default {
  getMergedData: () => {
    // IMPORTANT: Reference the .data property of your API
    const rawData = verifiedTripHistory.data; 
    
    // Get selected values from your Multi-select widget
    const selectedKeys = MultiSelect_Summary.selectedOptionValues;
    
    // Safety check: if API hasn't run or nothing is selected
    if (!rawData || !selectedKeys || selectedKeys.length === 0) {
      return [];
    }

    let combinedResults = [];

    selectedKeys.forEach(key => {
      const summaryArray = rawData[key];
      
      if (Array.isArray(summaryArray)) {
        const items = summaryArray.map(item => ({
          "Category": key.replace("_summary", "").toUpperCase(),
          "Product Name": item.product_name,
          "Total Qty": item.total_qty,
          "MRP": item.mrp || "0.00",
          "Total Amount": item.total_amount || "0.00"
        }));
        combinedResults = combinedResults.concat(items);
      }
    });

    return combinedResults;
  }
}