export default {
  handleTransfer: async () => {
    const formData = JSONFormTransfer.formData;
    const fromId = formData.Source_Account?.from_account_id;
    const toId = formData.Destination_Account?.to_account_id;
    const amount = Number(formData.Basic_Details?.amount || 0);
    
    // 1. Basic Validations
    if (!fromId || !toId) {
      return showAlert("Please select both Source and Destination accounts", "error");
    }
    if (fromId === toId) {
      return showAlert("Source and Destination accounts cannot be the same", "error");
    }
    if (amount <= 0) {
      return showAlert("Please enter a valid transfer amount", "error");
    }
    
    // 2. Denomination Validation (If either account is Cash)
    if (fromId == 1 || toId == 1) {
      const dens = formData.Cash_Denominations;
      const totalDens = Object.entries(dens).reduce((acc, [denom, count]) => {
        return acc + (Number(denom) * Number(count || 0));
      }, 0);
      
      if (totalDens !== amount) {
        return showAlert(`Denomination total (₹${totalDens}) does not match the transfer amount (₹${amount}). Please fix the counts!`, "error");
      }
    }
    
    // 3. Run the API
    try {
      await createTransfer.run(); // Ensure your API name matches this
      
      showAlert("Internal Transfer Recorded Successfully!", "success");
      
      // 4. Reset & Refresh
      resetWidget("JSONFormTransfer");
      
      // Pro Tip: Run your list and balance refresh queries here
      // fetchTransferHistory.run();
      // fetchAccountBalances.run();
      
    } catch (err) {
      showAlert(err.message || "Something went wrong while recording the transfer", "error");
    }
  }
}
