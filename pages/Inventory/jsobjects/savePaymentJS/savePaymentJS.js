export default {
  makePayment: async () => {
    const vendor = appsmith.store.selectedVendor;
    const totalAmount = Number(payAmount.text);
    const isRefund = payType.selectedOptionValue === 'REFUND';

    if (!totalAmount || totalAmount <= 0) {
      showAlert('Enter valid amount', 'error'); return;
    }

    let allocations = [];
    if (!isRefund) {
      const selectedBills = tblPendingBills.selectedRows || [];
      let remaining = totalAmount;
      for (const bill of selectedBills) {
        if (remaining <= 0) break;
        const alloc = Math.min(Number(bill['Balance $']), remaining);
        if (alloc > 0) {
          allocations.push({ invoice_id: bill.id, amount: alloc });
          remaining -= alloc;
        }
      }
    }

    const payload = {
      vendor_id:       vendor.id,
      amount:          totalAmount,
      payment_date:    payDate.selectedDate,
      mode:            payMode.selectedOptionValue,
      transaction_ref: payRef.text,
      remarks:         payRemarks.text,
      type:            payType.selectedOptionValue,
      allocations
    };
    storeValue('paymentPayload', payload);
    await apiMakePayment.run();
    closeModal('modalMakePayment');
    await getGRNList.run();
  }
}