export default {
    convertToDN: async () => {
        // 1. Validation
        if (!debiteNotetbl.triggeredRow?.id) {
            return showAlert("No Return Slip selected.", "warning");
        }

        try {
            // 2. Execute API
            const response = await apiConvertRSToDN.run({ 
                id: debiteNotetbl.triggeredRow.id 
            });

            // 3. Extract DN Number for the alert
            const dnData = response?.data || response;
            const newDN = dnData?.debit_note_number || "New DN";

            showAlert(`Converted Successfully! New DN: ${newDN}`, "success");

            // 4. THE CLEANUP
            // Close the modal and refresh the background data simultaneously
            closeModal('modalFrameDebitNote'); 
            await getDebitNotes.run();
            
        } catch (error) {
            showAlert("Conversion Failed: " + (error?.message || "Unknown Error"), "error");
        }
    }
}