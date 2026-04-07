export default {
	// 1. Trigger the backup and refresh the list
	runBackup: async () => {
		try {
			const res = await triggerBackup.run();
			showAlert("Backup Successful: " + res.filename, "success");
			
			// Refresh the list automatically
			await apiListBackups.run();
		} catch (e) {
			showAlert("Backup Failed: " + e.message, "error");
		}
	},

	// 2. Open the download link in a new tab
	downloadBackup: (filename) => {
		const downloadUrl = `https://distribution-erp.onrender.com/api/backups/download/${filename}`;
		
		// Use navigateTo to trigger the browser download
		navigateTo(downloadUrl, {}, 'NEW_WINDOW');
	}
}
