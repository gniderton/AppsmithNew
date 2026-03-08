export default {
  getDNTaxSummary: () => {
    // 1. Read from the API response (ensure the name matches your query)
    const lines = getDebitNoteLines.data || [];
    const groups = {};

    lines.forEach(row => {
      // Group by GST % string (e.g., "18.00")
      const gstPct = row['GST %'] || "0.00";
      const taxName = gstPct + '% GST';
      
      if (!groups[taxName]) {
        groups[taxName] = { 
          PARTICULARS: taxName, 
          Pcs: 0, Gross: 0, Sch: 0, Disc: 0, 
          Taxable: 0, Tax: 0, Net: 0 
        };
      }
      
      const g = groups[taxName];
      g.Pcs     += Number(row['Qty'] || 0);
      g.Gross   += Number(row['Gross $'] || 0);
      g.Sch     += Number(row['Sch'] || 0);
      g.Disc    += Number(row['Disc. $'] || 0); // Uses 'Disc. $' from your JSON
      g.Taxable += Number(row['Taxable $'] || 0);
      g.Tax     += Number(row['GST $'] || 0);
      g.Net     += Number(row['Net $'] || 0);
    });

    const resultRows = Object.values(groups);

    // 2. Add Grand Total Row
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
      }, { PARTICULARS: 'Total', Pcs: 0, Gross: 0, Sch: 0, Disc: 0, Taxable: 0, Tax: 0, Net: 0 });

      resultRows.push(totalRow);
    }
    
    // 3. Final Rounding to 2 Decimals
    return resultRows.map(row => ({
      ...row,
      Gross: Number(row.Gross.toFixed(2)),
      Disc: Number(row.Disc.toFixed(2)),
      Taxable: Number(row.Taxable.toFixed(2)),
      Tax: Number(row.Tax.toFixed(2)),
      Net: Number(row.Net.toFixed(2))
    }));
  }
}