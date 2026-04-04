export default {
	uploadStatement: async () => {
		// 1. Validation
		if (FilePicker1.files.length === 0) {
			return showAlert("Please select a statement file first!", "warning");
		}
		if (!SelectBank.selectedOptionValue) {
			return showAlert("Please select the target Bank Account!", "warning");
		}

		// 2. Trigger the API
		return Api_UploadStatement.run()
			.then((res) => {
				// Success Message with Transaction Count
				showAlert(`Import Successful! ${res.count} transactions added. (Batch: ${res.batchId})`, "success");
				
				// Cleanup
				resetWidget("FilePicker1");
				
				// Optional: Refresh your table/display after upload
				// getStatementList.run(); 
			})
			.catch((err) => {
				// Detailed Error Message
				const errorMsg = err.message || "Unknown error occurred";
				showAlert(`Upload Failed: ${errorMsg}`, "error");
			});
	}
}
