export default {
	// Function 1: Generates the correct blank CSV for the selected module
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
				headers = "product_id,batch_code,expiry_date,quantity,mrp,status_type\n";
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

    // Function 2: Routes the imported data to the correct Backend API
    startImport: async () => {
        const module = SelectModule.selectedOptionValue;
        const uploadData = FilePickerImport.files[0]?.data;
        
        if (!uploadData || uploadData.length === 0) {
            return showAlert("Please upload a filled CSV file first.", "error");
        }

        try {
            switch(module) {
                case "Customers":
                    await BulkImport_Customers.run({ data: uploadData });
                    break;
                case "Vendors":
                    await BulkImport_Vendors.run({ data: uploadData });
                    break;
                case "OpeningStock":
                    await BulkImport_Inventory.run({ data: uploadData });
                    break;
                case "OutstandingInvoices":
                    await BulkImport_Invoices.run({ data: uploadData });
                    break;
                case "OutstandingBills":
                    await BulkImport_Bills.run({ data: uploadData });
                    break;
                case "CustomerAdvances":
                    await BulkImport_CustAdvances.run({ data: uploadData });
                    break;
                case "VendorAdvances":
                    await BulkImport_VendAdvances.run({ data: uploadData });
                    break;
                case "Loans":
                    await BulkImport_Loans.run({ data: uploadData });
                    break;
            }
            showAlert(`Successfully imported ${uploadData.length} records into ${module}!`, "success");
            resetWidget("FilePickerImport", true); 
            
        } catch (error) {
            showAlert(`Import Failed: ${error.message}`, "error");
        }
    }
}
