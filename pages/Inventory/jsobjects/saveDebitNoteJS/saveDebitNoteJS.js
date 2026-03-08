export default {
  saveDebitNote: async () => {
    const isItemMode = dnMode.selectedOptionValue === "Item Return";
    let amount = 0;
    let lines = [];

    if (isItemMode) {
      const rawLines = tblDebitLines.tableData;
      lines = rawLines.map(row => {
        const qty     = Number(row.Qty || 0);
        const price   = Number(row.Price || 0);
        const scheme  = Number(row.Sch || 0);
        const discPct = Number(row['Disc %'] || 0);
        const taxPct  = Number(row['GST %'] || 0);
        const gross   = qty * price;
        const discAmt = Math.max(0, gross - scheme) * (discPct / 100);
        const taxable = Math.max(0, gross - scheme - discAmt);
        const taxAmt  = taxable * (taxPct / 100);
        return {
          product_id:  row._product_id, qty, rate: price,
          batch_number: row['Batch No'] || '',
          return_type: row.Reason || 'Damage',
          amount: taxable + taxAmt
        };
      }).filter(l => l.qty > 0);
      amount = lines.reduce((s, l) => s + l.amount, 0);
    } else {
      amount = Number(dnAmount.text);
    }

    if (!amount || amount <= 0) { showAlert('Invalid Amount', 'error'); return; }

    const payload = {
      vendor_id:         appsmith.store.selectedVendor.id,
      amount,
      debit_note_date:   dnDate.selectedDate,
      reason:            dnReason.text,
      linked_invoice_id: selLinkedBill.selectedOptionValue || null,
      lines:             isItemMode ? lines : []
    };
    storeValue('debitNotePayload', payload);
    await apiCreateDebitNote.run();
    closeModal('modalDebitNote');
    await getVendorDebitNotes.run();
  }
}