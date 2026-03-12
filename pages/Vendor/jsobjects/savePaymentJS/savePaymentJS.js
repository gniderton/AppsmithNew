export default {
  submitPayment: async () => {
    // 1. Get Context & Inputs
    const vendor = appsmith.store.selectedVendor; 
    const totalAmount = Number(payAmount.text || 0);
    const mode = payMode.selectedOptionValue;
    const type = payType.selectedOptionValue;
    const isRefund = type === 'REFUND';

    // 2. Initial Validation
    if (!totalAmount || totalAmount <= 0) {
      return showAlert("Please enter a valid amount", "error");
    }

    // 3. FIFO Allocation Logic
    let allocations = [];
    if (!isRefund) {
      const selectedBills = tblPendingBills.selectedRows || [];
      if (selectedBills.length > 0) {
        let remaining = totalAmount;
        for (const bill of selectedBills) {
          if (remaining <= 0) break;
          
          // Handle 'Balance $' or 'balance' depending on your API
          const balance = Number(bill.balance || bill['Balance $'] || 0);
          const alloc = Math.min(balance, remaining);
          
          if (alloc > 0) {
            allocations.push({
              invoice_id: bill.id,
              amount: Number(alloc.toFixed(2))
            });
            remaining -= alloc;
          }
        }
      }
    }

    // 4. Construct Payload
    const payload = {
      vendor_id: Number(vendor.id),
      amount: totalAmount,
      payment_date: moment(payDate.selectedDate).format("YYYY-MM-DD"),
      mode: mode,
      transaction_type: type,
      remarks: payRemarks.text,
      bank_account_id: selPaymentBank.selectedOptionValue,
      allocations: isRefund ? [] : allocations,
      
      // Dynamic Reference Logic (Online vs Cheque vs Other)
      transaction_ref: mode === 'Online' ? selBankRefVendor.selectedOptionLabel : (mode === 'Cheque' ? payChqNo.text : payRef.text),
      bank_statement_entry_id: mode === 'Online' ? selBankRefVendor.selectedOptionValue : null,
      
      // Cheque Details
      cheque_no: payChqNo.text,
      cheque_date: payChqDate.selectedDate ? moment(payChqDate.selectedDate).format("YYYY-MM-DD") : null,
      bank_name: payChqBank.selectedOptionValue
    };

    // 5. Execution
    try {
      // Trigger the API and send the payload
      await apiMakePayment.run({ payload });
      
      closeModal('modalMakePayment');
      showAlert("Payment Recorded Successfully", "success");
			showModal(drawerVendorProfile.name);
      
      // Refresh Ledger and Pending Bills in parallel
      await Promise.all([
        getVendorLedger.run(),
				q_getUnconsumedDebits.run()
      ]);
      
    } catch (e) {
      showAlert("Error processing payment: " + e.message, "error");
    }
  }
}