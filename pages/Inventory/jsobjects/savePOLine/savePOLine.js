export default {
  onCellChange: () => {
    const changes = poTable.updatedRow ? [poTable.updatedRow] : [];
    if (changes.length === 0) return;

    const change = changes[0];
    const targetProductId = change._product_id;
    const currentLines = appsmith.store.poLines || [];

    const targetIndex = currentLines.findIndex(row =>
      row._product_id === targetProductId || row.product_id === targetProductId
    );
    if (targetIndex === -1) return;

    const updated = currentLines.map((row, i) => {
      if (i !== targetIndex) return row;
      const merged = { ...row, ...change };
      const Qty     = Number(merged.Qty) || 0;
      const Price   = Number(merged.Price) || 0;
      const Sch     = Number(merged.Sch) || 0;
      const DiscPct = Number(merged["Disc %"]) || 0;
      const GstPct  = Number(merged["GST %"]) || 5;
      const Gross   = Qty * Price;
      const DiscAmt = (Gross - Sch) * (DiscPct / 100);
      const Taxable = Gross - Sch - DiscAmt;
      const Tax     = Taxable * (GstPct / 100);
      return { ...merged,
        "Gross $": Gross, "Disc. $": DiscAmt,
        "Taxable $": Taxable, "GST $": Tax, "Net $": Taxable + Tax
      };
    });
    storeValue('poLines', updated);
  }
}