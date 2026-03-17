export default {
    // ... your other functions like initView, saveScheme etc ...

    toggleStatus: async (row) => {
        // 1. Double-check we have the ID from the passed row
        const id = row?.id;
        const name = row?.scheme_name || "Scheme";

        if (!id) {
            console.log("Debug - Row Data received:", row);
            return showAlert("Error: ID not found. Ensure Primary Key is 'id' and Column Name matches.", "error");
        }

        try {
            // 2. Run API with the ID
            await toggleSchemeStatus.run({ id: id });
            
            // 3. Success Feedback
            showAlert(`${name} status updated successfully`, "success");
            
            // 4. Refresh the table data
            await getSchemes.run();
        } catch (err) {
            showAlert("Toggle Failed: " + (err.message || "Unknown Error"), "error");
        }
    },
    
    // ... rest of your code ...
}
