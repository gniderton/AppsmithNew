export default {
    createDebitNote: async () => {
        // 1. Setup metadata
        const noteType = selNoteType.selectedOptionValue; // "Debit Note" or "Return Slip"
        const isItemMode = selDNMode.selectedOptionValue === "Item Return";
        let amount = 0;
        let lines = [];

        if (isItemMode) {
            // Source from the storage variable used by the table
            const rawLines = appsmith.store.GlobalDebitLinesData || [];

            lines = rawLines.map(row => {
                const qty = Number(row['Qty'] || 0);
                const price = Number(row['Price'] || 0);    
                const scheme = Number(row['Sch'] || 0);
                const discPct = Number(row['Disc %'] || 0);
                const taxPct = Number(row['GST %'] || 0);

                // --- Exact Replica Math ---
                const gross = qty * price;
                const valForDisc = Math.max(0, gross - scheme);
                const discAmt = valForDisc * (discPct / 100);
                const taxable = Math.max(0, gross - scheme - discAmt);
                const taxAmt = taxable * (taxPct / 100);
                const total = taxable + taxAmt;

                return {
                    product_id: row._product_id,
                    qty: qty,
                    rate: price,
                    batch_number: row['Batch No'] || "",
                    return_type: row.Reason || "Damage",
                    amount: Number(total.toFixed(2)),       
                    tax_amount: Number(taxAmt.toFixed(2))   
                };
            }).filter(l => l.qty > 0);

            amount = _.sumBy(lines, 'amount');
        } else {
            amount = Number(inpDNAmount.value || 0);
        }

        // 2. Validation
        if (!amount || amount <= 0) {
            showAlert("Invalid Amount. Please check your items.", "error");
            return;
        }

        // 3. Trigger API with Payload
        const payload = {
            vendor_id: SelectVendor.selectedOptionValue,
            amount: amount,
            debit_note_date: moment(dtPckDN.selectedDate).format("YYYY-MM-DD"),
            reason: inpDNReason.text,
            linked_invoice_id: selLinkedBill.selectedOptionValue || null,
            note_type: noteType, // PASSING THE TYPE
            lines: isItemMode ? lines : [] 
        };

        try {
            const response = await apiCreateDebitNote.run({ payload });
            
            // Dynamic Success Message
            const msgLabel = noteType === 'Return Slip' ? 'Return Slip' : 'Debit Note';
            showAlert(`${msgLabel} Created: ${response.debit_note_number}`, "success");

            // Post-save actions
            storeValue('lastDNNumber', response.debit_note_number);
            closeModal(modalDebitNote.name);
            getDebitNotes.run();
            
        } catch (error) {
            showAlert("Error: " + error.message, "error");
        }
    }
}
