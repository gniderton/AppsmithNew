export default {
	previewGRN: async (grnRow) => {
		try {
			if (!grnRow || !grnRow.id) throw new Error("No GRN data found.");

			const grnHeader = grnRow;
			const grnLines = grnHeader.lines_json || [];
			const summaryData = GRNSummary.getSummary();
			const grandTotal = summaryData.find(s => s.PARTICULARS === 'Grand Total')?.Net || 0;

			const brand = (typeof Global_Assets !== 'undefined' && Global_Assets.branding) ? Global_Assets.branding : {
				regt_name: "Gniderton Private Limited", address: "-", pin: "-", gst: "-", logo: "", 
				contact_no: "-", email: "-", District: "-"
			};

			const { jsPDF } = jspdf;
			const doc = new jsPDF('p', 'pt', 'a4'); 
			const margin = 12; 
			const pageWidth = doc.internal.pageSize.width;

			// --- HELPER: AMOUNT TO WORDS ---
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
			}

			// --- HELPER: DRAW RECURRING HEADER ---
			const drawMainHeader = (currentPage, totalPages) => {
				const headerY = margin;

				// 1. Logo
				try {
					if (brand.logo.startsWith("data:image/")) {
						doc.addImage(brand.logo, 'PNG', margin, headerY, 90, 30);
					}
				} catch(e) {}

				// Center: Title
				doc.setTextColor(0, 0, 0); 
				doc.setFont("helvetica", "bold");
				doc.setFontSize(16);
				doc.text("GOODS RECEIPT NOTE (GRN)", pageWidth / 2, headerY + 15, { align: "center" });
				doc.setFontSize(11);
				doc.text(String(grnHeader.invoice_number), pageWidth / 2, headerY + 30, { align: "center" });

				// THREE SEPARATE BOXES
				const boxesY = headerY + 40;
				const gap = 8;
				const boxWidth = (pageWidth - (margin * 2) - (gap * 2)) / 3;
				const boxHeight = 70; 

				// Box 1: GRN Metadata
				this._drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
					["GRN NO", String(grnHeader.invoice_number)],
					["DATE", moment(grnHeader.received_date).format("DD/MM/YYYY")],
					["VND INV", String(grnHeader.vendor_invoice_number || "-")],
					["PAGE", `${currentPage} / ${totalPages}`]
				]);

				// Box 2: Company Details
				this._drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
					["Bill From", String(brand.regt_name)],
					["Address", String(brand.address)],
					["District", String(brand.District)],
					["GST", String(brand.gst)]
				]);

				// Box 3: Vendor Details
				this._drawSimpleBox(doc, margin + (boxWidth * 2) + (gap * 2), boxesY, boxWidth, boxHeight, [
					["Vendor", String(grnHeader.vendor_name)],
					["Code", String(grnHeader.vendor_code)],
					["Address", `${grnHeader.vendor_address_1 || ""} ${grnHeader.vendor_address_2 || ""}`],
					["GST / PAN", `${grnHeader.vendor_gst || "-"} / ${grnHeader.vendor_pan || "-"}`]
				]);

				return boxesY + boxHeight; 
			};

			// --- 2. ITEMS TABLE ---
			doc.autoTable({
				startY: margin + 40 + 70 + 10, // Added a small gap (+10)
				margin: { left: margin, right: margin, top: margin + 140 }, // Adjusted top margin for page break headers
				head: [["S.N", "ITEM NAME", "BATCH", "EXPIRY", "MRP", "QTY", "PRICE", "GROSS", "SCH", "D%", "D.AMT", "TXBL", "GST%", "GST$", "NET$"]],
				body: grnLines.map((row, index) => {
					const gross = Number(row['Gross'] || 0);
					const sch = Number(row['Sch'] || 0);
					const discPct = Number(row['Disc %'] || 0);
					const discAmt = (gross - sch) * (discPct / 100);

					return [
						index + 1, row['Item Name'], row['Batch No'] || "DEFAULT",
						row['Expiry'] ? moment(row['Expiry']).format("MM/YY") : "-",
						Number(row['MRP']).toFixed(2), row['Qty'], Number(row['Price']).toFixed(2),
						gross.toFixed(2), sch.toFixed(2), discPct + "%", discAmt.toFixed(2),
						Number(row['Taxable']).toFixed(2), Number(row['Tax %']) + "%",
						Number(row['GST $']).toFixed(2), Number(row['Net $']).toFixed(2)
					];
				}),
				didDrawPage: (data) => {
					const totalPages = doc.internal.getNumberOfPages();
					drawMainHeader(data.pageNumber, totalPages);
				},
				theme: 'grid',
				styles: { 
					fontSize: 7.5, cellPadding: 2, 
					lineColor: [0, 0, 0], lineWidth: 0.5,
					textColor: [0, 0, 0] 
				},
				headStyles: { 
					fillColor: [255, 255, 255], 
					textColor: [0, 0, 0], 
					fontStyle: 'bold',
					lineWidth: 0.5 
				},
				columnStyles: { 
					0: { cellWidth: 20 }, 1: { cellWidth: 'auto', minCellWidth: 100 },
					2: { cellWidth: 38 }, 3: { cellWidth: 32 }, 4: { halign: 'right' },
					5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' },
					8: { halign: 'right' }, 9: { halign: 'right' }, 10: { halign: 'right' },
					11: { halign: 'right' }, 12: { halign: 'center' }, 13: { halign: 'right' }, 14: { halign: 'right' }
				}
			});

			// --- 3. TAX SUMMARY ---
			doc.autoTable({
				startY: doc.lastAutoTable.finalY + 8,
				margin: { left: margin },
				head: [["TAX SUMMARY", "PCS", "GROSS", "SCH", "DISC", "TAXABLE", "TAX", "NET"]],
				body: summaryData.map(row => [
					row.PARTICULARS, row.Pcs, row.Gross.toFixed(2), row.Sch.toFixed(2),
					row.Disc.toFixed(2), row.Taxable.toFixed(2), row.Tax.toFixed(2), row.Net.toFixed(2)
				]),
				theme: 'grid',
				styles: { 
					fontSize: 8, cellPadding: 2.5, 
					lineColor: [0, 0, 0], lineWidth: 0.5,
					textColor: [0, 0, 0] 
				},
				headStyles: { 
					fillColor: [255, 255, 255], 
					textColor: [0, 0, 0], 
					fontStyle: 'bold',
					lineWidth: 0.5 
				},
				bodyStyles: (row) => (row.at(0) === 'Grand Total' ? { fontStyle: 'bold', fillColor: [250, 250, 250] } : {})
			});

			// --- 4. AMOUNT IN WORDS ---
			const wordsY = doc.lastAutoTable.finalY + 20;
			doc.setFontSize(12);
			doc.setFont("helvetica", "bold");
			doc.text("Total Amount (in words):", margin, wordsY);
			doc.setFont("helvetica", "normal");
			doc.text(toWords(Math.round(grandTotal)), margin + 150, wordsY);

			// --- 5. FOOTER NOTES / TERMS ---
			const notesY = wordsY + 20;
			doc.setFontSize(8.5);
			doc.setFont("helvetica", "bold");
			doc.text("Notes / Terms:", margin, notesY);
			doc.setFont("helvetica", "normal");
			doc.text("1. Payments will be made as per the GRN accepted amount.", margin, notesY + 14);
			doc.text("2. This is a computer generated document and does not require a physical signature.", margin, notesY + 26);

			const base64String = doc.output('dataurlstring');
			storeValue('currentPDF', base64String);
			storeValue('currentPDFName', (grnHeader.invoice_number || "GRN") + ".pdf");
			showModal('modalPDFPreview');

		} catch (error) {
			showAlert("PDF Layout Error: " + error.message, "error");
		}
	},

	_drawSimpleBox: (doc, x, y, width, height, rows) => {
		doc.setDrawColor(0, 0, 0);
		doc.setLineWidth(0.5);
		doc.rect(x, y, width, height);
		let rowY = y + 11;
		rows.forEach(r => {
			doc.setFontSize(8);
			doc.setFont("helvetica", "bold");
			doc.setTextColor(0, 0, 0);
			const label = String(r[0]) + ":";
			doc.text(label, x + 5, rowY);

			doc.setFont("helvetica", "normal");
			const val = String(r[1] || "-");
			const splitVal = doc.splitTextToSize(val, width - 62); 
			doc.text(splitVal, x + 58, rowY);
			rowY += (splitVal.length * 9) + 1.5; 
		});
	}
}
