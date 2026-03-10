export default {
  getSummary: () => {
    // 1. GET SOURCE (From your global Appsmith store variable)
    const viewData = appsmith.store.varInvoiceViewData || {};
    const lines = viewData.invoice_lines || [];
    
    // If there are no lines, return an empty array
    if (lines.length === 0) return [];
    
    const groups = {};

    // 2. Group by Tax Percentage
    lines.forEach(row => {
      // Create a clean label like "5% GST" or "No Tax"
      const taxRate = Number(row.tax_percent || 0);
      const taxName = taxRate > 0 ? `${taxRate}% GST` : 'No Tax';
      
      if (!groups[taxName]) {
        groups[taxName] = { 
          PARTICULARS: taxName, 
          Pcs: 0, 
          Gross: 0, 
          Sch: 0, 
          Disc: 0, 
          Taxable: 0, 
          Tax: 0, 
          Net: 0 
        };
      }
      
      const g = groups[taxName];
      
      // Using standard Number() for safety, matching your JSON keys exactly
      g.Pcs     += Number(row.shipped_qty || 0);
      g.Gross   += Number(row.gross_amount || 0);
      g.Sch     += Number(row.scheme_amount || 0);
      g.Disc    += Number(row.discount_amount || 0);
      g.Taxable += Number(row.taxable_amount || 0);
      g.Tax     += Number(row.tax_amount || 0);
      g.Net     += Number(row.amount || 0);
    });

    // 3. Convert Groups to Array
    const resultRows = Object.values(groups);

    // 4. Calculate Grand Total Row
    // We use .reduce() to sum up every column from our grouped array
    if (resultRows.length > 0) {
      const totalRow = resultRows.reduce((acc, curr) => {
        acc.Pcs     += curr.Pcs;
        acc.Gross   += curr.Gross;
        acc.Sch     += curr.Sch;
        acc.Disc    += curr.Disc;
        acc.Taxable += curr.Taxable;
        acc.Tax     += curr.Tax;
        acc.Net     += curr.Net;
        return acc;
      }, { 
        PARTICULARS: 'Grand Total', 
        Pcs: 0, Gross: 0, Sch: 0, Disc: 0, Taxable: 0, Tax: 0, Net: 0 
      });

      // 5. Append Total Row to the list
      resultRows.push(totalRow);
    }

    // 6. Format the final output to 2 decimal places for money fields
    return resultRows.map(row => {
      return {
        PARTICULARS: row.PARTICULARS,
        Pcs: row.Pcs, // Keep quantity as a normal number/integer
        Gross: row.Gross.toFixed(2),
        Sch: row.Sch.toFixed(2),
        Disc: row.Disc.toFixed(2),
        Taxable: row.Taxable.toFixed(2),
        Tax: row.Tax.toFixed(2),
        Net: Math.round(row.Net).toFixed(2) // Kept your Math.round logic for the Net Total
      };
    });
  }
}
