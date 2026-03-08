export default {
  getTaxSummary: () => {
    // 1. Read from the store (Source of truth)
    const lines = appsmith.store.piLines || [];
    const groups = {};

    lines.forEach(row => {
      // Group by Tax Name or Percentage
      const gstPct = row['GST %'] !== undefined ? row['GST %'] : 5;
      const taxName = row['Tax Name'] || (gstPct + '% GST');
      
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
      g.Disc    += Number(row['Disc $'] || 0);
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
    
    // 3. Round all values to 2 decimal places for the UI
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
