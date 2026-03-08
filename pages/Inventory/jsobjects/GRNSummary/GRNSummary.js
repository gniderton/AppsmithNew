export default {
  getSummary: () => {
    // 1. GET SOURCE (Appsmith Table data)
    const lines = tblViewLines.tableData || [];
    const groups = {};

    // 2. Group by Tax Name
    lines.forEach(row => {
      const taxName = row['Tax Name'] || 'No Tax';
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
      // Note: Using standard Number() for safety
      g.Pcs     += Number(row['Qty'] || 0);
      g.Gross   += Number(row['Gross'] || 0);
      g.Sch     += Number(row['Sch'] || 0);
      
      // Using Math.max to avoid negative discounts if Gross is 0
      const rowGross = Number(row['Gross'] || 0);
      g.Disc    += (Number(row['Disc %'] || 0) / 100 * rowGross);
      
      g.Taxable += Number(row['Taxable'] || 0);
      
      // Handle Tax Amount Mapping (supporting multiple potential keys for parity)
      const taxAmt = Number(row['GST $'] || row['tax_amount'] || 0);
      g.Tax     += taxAmt;
      g.Net     += Math.round(Number(row['Net $'] || 0));
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

    return resultRows;
  }
}
