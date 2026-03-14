export default {
	// 1. Add item to the temporary adjustment list
	addAdjustment: () => {
		const newItem = {
			product_id: selAdjProduct.selectedOptionValue,
			product_name: selAdjProduct.selectedOptionLabel,
			batch_code: selAdjBatch.selectedOptionValue || null,
			qty: Number(inpAdjQty.text),
			reason: selAdjReason.selectedOptionValue
		};

		// Validation
		if (!newItem.product_id || !newItem.qty || newItem.qty === 0) {
			showAlert("Please select a Product and enter a valid Qty", "error");
			return; 
		}

		// Append to existing array in store
		const currentList = appsmith.store.varAdjustmentList || [];
		storeValue('varAdjustmentList', [...currentList, newItem]);

		// Reset Inputs for next entry
		resetWidget("selAdjProduct");
		resetWidget("selAdjBatch");
		resetWidget("inpAdjQty");
	},

	// 2. Delete a single line from the adjustment table
	deleteRow: () => {
		const current = appsmith.store.varAdjustmentList || [];
		// Filters out the index of the row where the delete button was clicked
		const updated = current.filter((item, index) => index !== tblAdjustments.triggeredRowIndex);
		storeValue('varAdjustmentList', updated);
	},

	// 3. Final submission to the Database
	submitToDatabase: () => {
		const items = appsmith.store.varAdjustmentList || [];
		
		if (items.length === 0) {
			showAlert("No items to adjust. Please add items first.", "warning");
			return;
		}

		apiCreateStockAdjustment.run()
			.then(() => {
				showAlert(`Successfully adjusted ${items.length} items!`, "success");
				// Clear store and close modal
				storeValue('varAdjustmentList', []);
				closeModal("ModalAdjust");
				
				// Optional: Refresh your inventory data
				// getProducts.run();
			})
			.catch((err) => {
				showAlert("Adjustment failed: " + err.message, "error");
			});
	}
}
