export default {
	// --- A. THE BATCH PROCESSOR ---
	downloadBulkInvoices: async () => {
		const ids = appsmith.store.bulkInvoiceIds || [];
		if (ids.length === 0) return;

		showAlert(`Processing batch of ${ids.length} invoices...`, "info");

		// FIX: Use the return value of .run() to avoid reactive dependency errors
		const bank = await getBankDetails.run();

		for (const id of ids) {
			// Fetch specific invoice details for this ID
			const detailedData = await getUnifiedInvoiceDetail.run({ id: id }); 
			
			if (detailedData && detailedData.invoice_id) {
				// Pass 'bank' as an argument to avoid redundant fetching
				await this.previewInvoice(detailedData, bank);
				
				// Throttle to prevent browser download queue blockage
				await new Promise(r => setTimeout(r, 800));
			}
		}

		// Cleanup memory
		await storeValue('bulkInvoiceIds', []);
		showAlert("Bulk Download Complete!", "success");
	},

	// --- B. AUTO-TRIGGER ---
	onPageLoad: async () => {
		// Wait for app state to settle
		await new Promise(r => setTimeout(r, 500)); 

		if (appsmith.store.bulkInvoiceIds && appsmith.store.bulkInvoiceIds.length > 0) {
			await this.downloadBulkInvoices();
		}
	},

	// --- C. PREVIEW & DOWNLOAD LOGIC ---
	previewInvoice: async (invoiceData, bankDetails = null) => {
		try {
			if (!invoiceData || !invoiceData.invoice_id) throw new Error("No Invoice data selected.");

			// Use passed bank details or fetch once if missing
			const bank = bankDetails || await getBankDetails.run();

			// --- LIBRARY SETUP ---
			if (typeof jspdf === "undefined") throw new Error("jspdf library not loaded.");
			const jsPDFConstructor = jspdf.jsPDF || jspdf;
			const doc = new jsPDFConstructor('p', 'pt', 'a4'); 

			if (typeof doc.autoTable !== "function" && jspdf.plugin && jspdf.plugin.autotable) {
				jsPDFConstructor.API.autoTable = jspdf.plugin.autotable;
			}

			const lines = invoiceData.invoice_lines || [];
			const summaryData = this.getSummary(lines);
			const grandTotal = Number(invoiceData.grand_total || 0);
			const brand = Global_Assets.getSummary();
			const margin = 12; 
			const pageWidth = doc.internal.pageSize.width;

			// --- AMOUNT TO WORDS HELPER ---
			const toWords = (num) => {
				const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
				const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
				const n = ("000000000" + Math.floor(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
				if (!n) return ''; 
				let str = '';
				str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
				str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
				str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
				str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
				str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only ' : 'Only ';
				return str;
			};

			// --- HEADER DRAWING ---
			const drawMainHeader = (currentPage, totalPages) => {
				const headerY = margin;
				try {
					const logo = Global_Assets.getLogo();
					if (logo && logo.startsWith("data:image/")) {
						doc.addImage(logo, 'PNG', margin, headerY, 90, 30);
					}
				} catch(e) {}

				doc.setTextColor(0, 0, 0); 
				doc.setFont("helvetica", "bold");
				doc.setFontSize(16);
				doc.text("SALES INVOICE", pageWidth / 2, headerY + 15, { align: "center" });
				doc.setFontSize(11);
				doc.text(String(invoiceData.invoice_number), pageWidth / 2, headerY + 30, { align: "center" });

				const boxesY = headerY + 40;
				const gap = 8;
				const boxWidth = (pageWidth - (margin * 2) - (gap * 2)) / 3;
				const boxHeight = 95; 

				this._drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
					["From", String(brand.regt_name)],
					["Address", String(brand.address)],
					["Dist/PIN", `${brand.District} - ${brand.pin}`],
					["GST", String(brand.gst)],
					["FSSAI", String(brand.fssai_no)],
					["Email", String(brand.email)],
					["Contact No", String(brand.contact_no)]
				]);

				const cAddr = [invoiceData.customer_address, invoiceData.district, invoiceData.pin_code ? "PIN: " + invoiceData.pin_code : null].filter(Boolean).join(", ");
				this._drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
					["To", String(invoiceData.customer_name)],
					["Address", cAddr || "-"],
					["GSTIN", String(invoiceData.gstin || "-")],
					["Phone", String(invoiceData.customer_phone || "-")],
					["Email", String(invoiceData.customer_email || "-")]
				], 60);

				this._drawSimpleBox(doc, margin + (boxWidth * 2) + (gap * 2), boxesY, boxWidth, boxHeight, [
					["INV No", String(invoiceData.invoice_number)],
					["Date", moment(invoiceData.invoice_date).format("DD/MM/YYYY")],
					["Order Date", moment(invoiceData.order_date).format("DD/MM/YYYY")],
					["TOTAL AMT", Number(grandTotal).toFixed(2)],
					["DSE", String(invoiceData.dse_name || "-")],
					["Route", String(invoiceData.route || "-")],
					["DSE Phone", String(invoiceData.dse_phone || "-")],
					["PAGE", `${currentPage} / ${totalPages}`]
				], 65);
			};

			// --- ITEMS TABLE ---
			doc.autoTable({
				startY: margin + 145,
				margin: { left: margin, right: margin, top: 157, bottom: 12 },
				head: [["S.N", "ITEM NAME", "CODE\nEAN", "HSN", "BATCH\nEXPIRY", "MRP", "QTY", "PRICE", "GROSS", "SCH", "D%", "D.AMT", "TXBL", "GST%", "GST$", "NET$"]],
				body: lines.map((row, index) => [
					index + 1, row.product_name, `${row.product_code || ""}\n${row.ean_code || ""}`, row.hsn_code || "-", 
					`${row.batch_code || ""}\n${row.expiry_date ? moment(row.expiry_date).format("MM/YY") : "-"}`, Number(row.mrp || 0).toFixed(2), row.shipped_qty, 
					Number(row.rate || 0).toFixed(2), Number(row.gross_amount || 0).toFixed(2), Number(row.scheme_amount || 0).toFixed(2), 
					(row.tax_percent || 0) + "%", Number(row.discount_amount || 0).toFixed(2), Number(row.taxable_amount || 0).toFixed(2), 
					(row.tax_percent || 0) + "%", Number(row.tax_amount || 0).toFixed(2), Number(row.amount || 0).toFixed(2)
				]),
				didDrawPage: (data) => {
					drawMainHeader(data.pageNumber, doc.internal.getNumberOfPages());
				},
				theme: 'grid',
				styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0], overflow: 'linebreak', valign: 'middle' },
				headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
				columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 'auto', minCellWidth: 100 }, 2: { cellWidth: 45 }, 3: { cellWidth: 35 }, 4: { cellWidth: 45 } }
			});

			let currentY = doc.lastAutoTable.finalY + 20;
			const pageHeight = doc.internal.pageSize.height;

			// --- TAX SUMMARY ---
			doc.autoTable({
				startY: currentY,
				margin: { left: margin },
				head: [["TAX SUMMARY", "PCS", "GROSS", "SCH", "DISC", "TAXABLE", "TAX", "NET"]],
				body: summaryData.map(row => [row.PARTICULARS, row.Pcs, row.Gross, row.Sch, row.Disc, row.Taxable, row.Tax, row.Net]),
				theme: 'grid',
				styles: { fontSize: 8.5, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0] },
				headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' }
			});

			// --- FOOTER SECTION (Receipt Slip) ---
			const slipY = pageHeight - 160; 
			doc.setDrawColor(0, 0, 0); doc.setLineDash([3, 3], 0);
			doc.line(margin, slipY, pageWidth - margin, slipY); doc.setLineDash([], 0);

			doc.setFontSize(10); doc.setFont("helvetica", "bold");
			doc.text("RECEIPT ACKNOWLEDGEMENT", pageWidth / 2, slipY + 20, { align: "center" });

			const slipBoxY = slipY + 30;
			doc.rect(margin, slipBoxY, pageWidth - (margin * 2), 100);

			doc.setFontSize(9);
			doc.text(`Invoice No: ${invoiceData.invoice_number}`, margin + 10, slipBoxY + 15);
			doc.text(`Date: ${moment(invoiceData.invoice_date).format("DD/MM/YYYY")}`, margin + 10, slipBoxY + 30);
			doc.text(`Total Amount: ${Number(grandTotal).toFixed(2)}`, margin + 10, slipBoxY + 60);

			const bankInfoX = pageWidth / 2 + 5;
			doc.setFont("helvetica", "bold"); doc.text("PAYMENT BANK DETAILS", bankInfoX, slipBoxY + 15);
			doc.setFont("helvetica", "normal"); doc.setFontSize(8);
			doc.text(`Bank: ${bank.bank_name || "-"}`, bankInfoX, slipBoxY + 28);
			doc.text(`Acc No: ${bank.account_number || "-"}`, bankInfoX, slipBoxY + 38);
			doc.text(`IFSC: ${bank.ifsc_code || "-"}`, bankInfoX, slipBoxY + 48);

			doc.text(`Authorized Signatory: __________________`, bankInfoX, slipBoxY + 90);

			// --- DOWNLOAD ---
			const fileName = (invoiceData.invoice_number || "INV") + ".pdf";
			download(doc.output('dataurlstring'), fileName, "application/pdf");

		} catch (error) {
			showAlert("Invoice PDF Error: " + error.message, "error");
		}
	},

	// --- HELPERS ---
	getSummary: (lines) => {
		if (!lines || lines.length === 0) return [];
		const groups = {};
		lines.forEach(row => {
			const taxRate = Number(row.tax_percent || 0);
			const taxName = taxRate > 0 ? `${taxRate}% GST` : 'No Tax';
			if (!groups[taxName]) {
				groups[taxName] = { PARTICULARS: taxName, Pcs: 0, Gross: 0, Sch: 0, Disc: 0, Taxable: 0, Tax: 0, Net: 0 };
			}
			const g = groups[taxName];
			g.Pcs += Number(row.shipped_qty || 0); g.Gross += Number(row.gross_amount || 0); g.Sch += Number(row.scheme_amount || 0);
			g.Disc += Number(row.discount_amount || 0); g.Taxable += Number(row.taxable_amount || 0); g.Tax += Number(row.tax_amount || 0); g.Net += Number(row.amount || 0);
		});
		const resultRows = Object.values(groups);
		if (resultRows.length > 0) {
			const totalRow = resultRows.reduce((acc, curr) => {
				acc.Pcs += curr.Pcs; acc.Gross += curr.Gross; acc.Sch += curr.Sch; acc.Disc += curr.Disc; acc.Taxable += curr.Taxable; acc.Tax += curr.Tax; acc.Net += curr.Net;
				return acc;
			}, { PARTICULARS: 'Grand Total', Pcs: 0, Gross: 0, Sch: 0, Disc: 0, Taxable: 0, Tax: 0, Net: 0 });
			resultRows.push(totalRow);
		}
		return resultRows.map(row => ({
			PARTICULARS: row.PARTICULARS, Pcs: row.Pcs, Gross: row.Gross.toFixed(2), Sch: row.Sch.toFixed(2),
			Disc: row.Disc.toFixed(2), Taxable: row.Taxable.toFixed(2), Tax: row.Tax.toFixed(2), Net: Math.round(row.Net).toFixed(2)
		}));
	},

	_drawSimpleBox: (doc, x, y, width, height, rows, labelWidth = 58) => {
		doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.5); doc.rect(x, y, width, height);
		let rowY = y + 11;
		rows.forEach(r => {
			doc.setFontSize(8.5); doc.setFont("helvetica", "bold");
			const label = String(r[0]) + ":"; doc.text(label, x + 5, rowY);
			doc.setFont("helvetica", "normal");
			const val = String(r[1] || "-"); 
            const splitVal = doc.splitTextToSize(val, width - labelWidth - 5); 
			doc.text(splitVal, x + labelWidth, rowY); rowY += (splitVal.length * 9.5) + 1.5; 
		});
	}
}
