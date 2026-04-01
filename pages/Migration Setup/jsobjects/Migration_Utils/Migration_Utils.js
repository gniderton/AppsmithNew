export default {
	// 1. Helper to safely format dates for the backend
	formatDate: (dateStr) => {
		if (!dateStr || dateStr === "") return null;
		const d = moment(dateStr, ["YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY", "MM/DD/YYYY", "YYYY/MM/DD"]);
		return d.isValid() ? d.format("YYYY-MM-DD") : null;
	},

	// 2. Updated Template with 5 Prices for OpeningStock
	downloadTemplate: () => {
		const module = SelectModule.selectedOptionValue;
		if (!module) return showAlert("Please select a module first", "warning");

		let headers = "";
		let fileName = "";

		switch(module) {
			case "Customers":
				headers = "customer_name,whatsapp_number,email,is_active,gstin,pan,credit_limit,credit_days,channel_id,route_id,dse_id,route_type_id,address_line1,city,state,pincode\n";
				fileName = "Template_Customers.csv";
				break;
			case "Vendors":
				headers = "company_name,contact_person,phone_number,email_address,gstin,pan,credit_limit_amount,credit_period_days,city,state,pin_code\n";
				fileName = "Template_Vendors.csv";
				break;
			case "OpeningStock":
                // Added: purchase_rate, distributor_rate, wholesale_rate, dealer_rate, retail_rate
				headers = "product_id,batch_code,expiry_date,quantity,mrp,purchase_rate,distributor_rate,wholesale_rate,dealer_rate,retail_rate,status_type\n";
				fileName = "Template_Opening_Stock.csv";
				break;
			case "OutstandingInvoices":
				headers = "customer_id,old_invoice_number,invoice_date,grand_total,amount_paid\n";
				fileName = "Template_Outstanding_Invoices.csv";
				break;
			case "OutstandingBills":
				headers = "vendor_id,old_bill_number,bill_date,grand_total,amount_paid\n";
				fileName = "Template_Outstanding_Bills.csv";
				break;
			case "CustomerAdvances":
				headers = "customer_id,advance_date,amount,payment_mode,reference_number\n";
				fileName = "Template_Customer_Advances.csv";
				break;
			case "VendorAdvances":
				headers = "vendor_id,advance_date,amount,payment_mode,reference_number\n";
				fileName = "Template_Vendor_Advances.csv";
				break;
			case "Loans":
				headers = "type,entity_id,loan_date,total_amount,paid_amount,description\n";
				fileName = "Template_Loans.csv";
				break;
			default:
				return showAlert("Module template not defined yet", "error");
		}

		download(headers, fileName, "text/csv");
		showAlert(`Template for ${module} downloaded!`, "success");
	},

    // 3. Routes the imported data to the correct Backend API with date cleaning
    startImport: async () => {
        const module = SelectModule.selectedOptionValue;
        const uploadData = FilePickerImport.files[0]?.data;
        
        if (!uploadData || uploadData.length === 0) {
            return showAlert("Please upload a filled CSV file first.", "error");
        }

        const cleanedData = uploadData.map(row => {
            const newRow = { ...row };
            if (newRow.bill_date) newRow.bill_date = this.formatDate(newRow.bill_date);
            if (newRow.invoice_date) newRow.invoice_date = this.formatDate(newRow.invoice_date);
            if (newRow.loan_date) newRow.loan_date = this.formatDate(newRow.loan_date);
            if (newRow.advance_date) newRow.advance_date = this.formatDate(newRow.advance_date);
            if (newRow.expiry_date) newRow.expiry_date = this.formatDate(newRow.expiry_date);
            return newRow;
        });

        try {
            switch(module) {
                case "Customers": await BulkImport_Customers.run({ data: cleanedData }); break;
                case "Vendors": await BulkImport_Vendors.run({ data: cleanedData }); break;
                case "OpeningStock": await BulkImport_Inventory.run({ data: cleanedData }); break;
                case "OutstandingInvoices": await BulkImport_Invoices.run({ data: cleanedData }); break;
                case "OutstandingBills": await BulkImport_Bills.run({ data: cleanedData }); break;
                case "CustomerAdvances": await BulkImport_CustAdvances.run({ data: cleanedData }); break;
                case "VendorAdvances": await BulkImport_VendAdvances.run({ data: cleanedData }); break;
                case "Loans": await BulkImport_Loans.run({ data: cleanedData }); break;
            }
            showAlert(`Successfully imported ${cleanedData.length} records into ${module}!`, "success");
            resetWidget("FilePickerImport", true); 
        } catch (error) {
            showAlert(`Import Failed: ${error.message}`, "error");
        }
    }
}
