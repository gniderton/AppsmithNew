export default {
  getCombinedInvoices: () => {
    const currentTripInvoices = getDeliveryList.data || [];
    const pendingInvoices = getPendingInvoices.data || [];

    // 1. Get IDs of invoices already in this trip
    const assignedIds = currentTripInvoices.map(i => String(i.invoice_id));

    // 2. Clean up pending list (remove duplicates if an invoice is already in the trip)
    const availablePending = pendingInvoices.filter(i => !assignedIds.includes(String(i.id)));

    // 3. Merge them and add a "Status" tag for easy reading
    const combined = [
      ...currentTripInvoices.map(i => ({
        id: i.invoice_id,
        invoice_number: i.invoice_number,
        customer_name: i.customer_name,
        grand_total: i.grand_total,
        current_status: "Assigned to Trip"
      })),
      ...availablePending.map(i => ({
        id: i.id,
        invoice_number: i.invoice_number,
        customer_name: i.customer_name,
        grand_total: i.grand_total,
        current_status: "Available (Pending)"
      }))
    ];

    return combined;
  }
}
