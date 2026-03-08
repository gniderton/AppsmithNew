export default {
  commitUpdates: async () => {
    const rows = tblReviewUpdates.tableData;
    if (!rows || rows.length === 0) { showAlert('Nothing to save', 'warning'); return; }
    const num = v => v ? Number(v).toFixed(2) : null;
    const payload = rows.map(r => ({
      id:               r['Product ID'],
      mrp:              num(r['MRP']),
      purchase_rate:    num(r['Purchase Rate']),
      distributor_rate: num(r['Distributor']),
      wholesale_rate:   num(r['Wholesale']),
      dealer_rate:      num(r['Dealer']),
      retail_rate:      num(r['Retail']),
      case_quantity:    Number(r['Case Qty'] || 1),
      uom:              r['UOM'], model_number: r['Model No'],
      min_stock_level:  Number(r['Min Stock'] || 0),
      box_length_cm:    num(r['Length']),
      box_width_cm:     num(r['Width']),
      box_height_cm:    num(r['Height']),
      weight_kg:        num(r['Weight']),
      description:      r['Description']
    }));
    storeValue('bulkUpdatePayload', payload);
    await apiBulkUpdate.run();
    storeValue('bulkUpdateData', []);
    showAlert('All products updated!', 'success');
  }
}