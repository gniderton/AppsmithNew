export default {
	previewPO: async (apiResponse) => {
		try {
			if (!apiResponse || !apiResponse.header) throw new Error("No PO data found.");

			const poHeader = apiResponse.header;
			const poLines = apiResponse.lines || [];

			const brand = (typeof Global_Assets !== 'undefined' && Global_Assets.branding) ? Global_Assets.branding : {
				regt_name: "Gniderton Private Limited", address: "-", pin: "-", gst: "-", logo: "", 
				contact_no: "-", email: "-", District: "-"
			};

			const { jsPDF } = jspdf;
			const doc = new jsPDF('l', 'pt', 'a4'); // Landscape for Wide PO table
			const margin = 20;
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
				doc.text("PURCHASE ORDER", pageWidth / 2, headerY + 15, { align: "center" });
				doc.setFontSize(11);
				doc.text(String(poHeader.po_number || "-"), pageWidth / 2, headerY + 30, { align: "center" });

				// THREE SEPARATE BOXES
				const boxesY = headerY + 40;
				const gap = 10;
				const boxWidth = (pageWidth - (margin * 2) - (gap * 2)) / 3;
				const boxHeight = 60; 

				// Box 1: PO Metadata
				this._drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
					["PO NUMBER", String(poHeader.po_number || "-")],
					["PO DATE", moment(poHeader.po_date).format("DD/MM/YYYY")],
					["TOTAL QTY", String(poHeader.total_qty || 0)],
					["PAGE", `${currentPage} / ${totalPages}`]
				]);

				// Box 2: Bill To (Registration)
				this._drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
					["Bill To", String(brand.regt_name)],
					["Address", String(brand.address)],
					["District", String(brand.District)],
					["GST", String(brand.gst)]
				]);

				// Box 3: Vendor Details
				this._drawSimpleBox(doc, margin + (boxWidth * 2) + (gap * 2), boxesY, boxWidth, boxHeight, [
					["Vendor", String(poHeader.vendor_name)],
					["Code", String(poHeader.vendor_code)],
					["Address", String(poHeader.vendor_address || "-")],
					["GST", String(poHeader.vendor_gst || "-")]
				]);

				return boxesY + boxHeight; 
			};

			// --- 2. THE DATA TABLE ---
			doc.autoTable({
				startY: margin + 40 + 60 + 8, // Small gap after boxes
				margin: { left: margin, right: margin, top: margin + 140 }, // Space for repeated headers
				head: [["S.N", "EAN", "CODE", "ITEM NAME", "MRP", "QTY", "PRICE", "GROSS", "SCH", "D%", "D.AMT", "TXBL", "GST%", "GST$", "NET$"]],
				body: poLines.map((row, index) => {
					const qty = Number(row.ordered_qty || 0);
					const rate = Number(row.rate || 0);
					const schemeAmt = Number(row.scheme_amount || 0);
					const discPct = Number(row.discount_percent || 0);
					const gross = qty * rate;
					const valForDisc = Math.max(0, gross - schemeAmt);
					const derivedDiscAmt = valForDisc * (discPct / 100);
					const derivedTaxable = Math.max(0, gross - schemeAmt - derivedDiscAmt);

					return [
						index + 1, row.ean_code || "-", row.product_code || "-", row.product_name || "Item",
						Number(row.product_mrp || 0).toFixed(2), qty, rate.toFixed(2),
						gross.toFixed(2), schemeAmt.toFixed(2), discPct + "%",
						derivedDiscAmt.toFixed(2), derivedTaxable.toFixed(2), 
						row.tax_percent + "%", Number(row.tax_amount || 0).toFixed(2),
						Number(row.amount || 0).toFixed(2)
					];
				}),
				didDrawPage: (data) => {
					const totalPages = doc.internal.getNumberOfPages();
					drawMainHeader(data.pageNumber, totalPages);
				},
				theme: 'grid',
				styles: { 
					fontSize: 7, cellPadding: 2, 
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
					0: { cellWidth: 20 }, 3: { cellWidth: 'auto', minCellWidth: 150 },
					4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' },
					7: { halign: 'right' }, 8: { halign: 'right' }, 9: { halign: 'right' },
					10: { halign: 'right' }, 11: { halign: 'right' }, 12: { halign: 'center' },
					13: { halign: 'right' }, 14: { halign: 'right' }
				}
			});

			// --- 3. TOTALS & WORDS ---
			const finalY = doc.lastAutoTable.finalY + 15;

			// Total Box (Right corner)
			const totalBoxWidth = 150;
			const totalBoxX = pageWidth - margin - totalBoxWidth;
			doc.setDrawColor(0);
			doc.rect(totalBoxX, finalY, totalBoxWidth, 20);
			doc.setFont("helvetica", "bold");
			doc.setFontSize(10);
			doc.text("GRAND TOTAL:", totalBoxX + 5, finalY + 14);
			doc.text(Number(poHeader.total_net || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), totalBoxX + totalBoxWidth - 5, finalY + 14, { align: "right" });

			// Amount in words
			const wordsY = finalY + 35;
			doc.setFontSize(9);
			doc.setFont("helvetica", "bold");
			doc.text("Total Amount (in words):", margin, wordsY);
			doc.setFont("helvetica", "normal");
			doc.text(toWords(Math.round(poHeader.total_net || 0)), margin + 110, wordsY);

			// --- 4. FOOTER NOTES / TERMS ---
			const notesY = wordsY + 20;
			doc.setFontSize(8.5);
			doc.setFont("helvetica", "bold");
			doc.text("Notes / Terms:", margin, notesY);
			doc.setFont("helvetica", "normal");
			doc.text("1. Please supply only the items and quantities explicitly mentioned in this Purchase Order.", margin, notesY + 14);
			doc.text("2. This is a computer generated document and does not require a physical signature.", margin, notesY + 26);

			const base64String = doc.output('dataurlstring');
			storeValue('currentPDF', base64String);
			storeValue('currentPDFName', String(poHeader.po_number || "PO") + ".pdf");
			showModal('modalPDFPreview');

		} catch (error) {
			showAlert("PDF Logic Error: " + error.message, "error");
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
			const splitVal = doc.splitTextToSize(val, width - 65); 
			doc.text(splitVal, x + 60, rowY);
			rowY += (splitVal.length * 9) + 1.5; 
		});
	}
}
