export default {
	previewDebitNote: async (dnHeader) => {
		try {
			if (!dnHeader || !dnHeader.id) throw new Error("No Debit Note data selected.");

			// --- 1. LIBRARY SAFETY ---
			if (typeof jspdf === "undefined") throw new Error("jspdf library not loaded.");
			const jsPDFConstructor = jspdf.jsPDF || jspdf;
			const doc = new jsPDFConstructor('p', 'pt', 'a4');

			if (typeof doc.autoTable !== "function" && jspdf.plugin && jspdf.plugin.autotable) {
				jsPDFConstructor.API.autoTable = jspdf.plugin.autotable;
			}

			// --- 2. PREPARE DATA ---
			const dnLines = getDebitNoteLines.data || [];
			const summaryData = this.getDNTaxSummary(dnLines);
			const grandTotal = Number(dnHeader.amount || 0);
			const brand = Global_Assets.getSummary();
			const margin = 20; 
			const pageWidth = doc.internal.pageSize.width;
			const pageHeight = doc.internal.pageSize.height;

			// --- HELPER: DRAW RECURRING HEADER ---
			const drawMainHeader = (currentPage, totalPages) => {
				const headerY = margin;
				try {
					const logo = Global_Assets.getLogo();
					if (logo && logo.startsWith("data:image/")) {
						doc.addImage(logo, 'PNG', margin, headerY, 90, 30);
					}
				} catch (e) { console.error("Logo error", e); }

				doc.setTextColor(0, 0, 0);
				doc.setFont("helvetica", "bold"); doc.setFontSize(16);
				const title = (dnHeader.note_type || "DEBIT NOTE").toUpperCase();
				doc.text(title, pageWidth / 2, headerY + 15, { align: "center" });

				doc.setFontSize(11); doc.setFont("helvetica", "normal");
				doc.text(String(dnHeader.debit_note_number), pageWidth / 2, headerY + 30, { align: "center" });

				const boxesY = headerY + 45;
				const gap = 8;
				const boxWidth = (pageWidth - (margin * 2) - (gap * 2)) / 3;
				const boxHeight = 90;

				this._drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
					["DN NUMBER", String(dnHeader.debit_note_number)],
					["DATE", moment(dnHeader.debit_note_date).format("DD/MM/YYYY")],
					["LINKED INV", String(dnHeader.linked_invoice_number || "-")],
					["TOTAL AMT", "INR " + Number(grandTotal).toFixed(2)],
					["PAGE", `${currentPage} / ${totalPages}`]
				]);

				this._drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
					["From", String(brand.regt_name)],
					["Address", String(brand.address)],
					["GST", String(brand.gst)],
					["Contact", String(brand.contact_no)],
					["Email", String(brand.email)]
				]);

				const vAddr = [dnHeader.vendor_address, dnHeader.vendor_city, dnHeader.vendor_pin].filter(Boolean).join(", ");
				this._drawSimpleBox(doc, margin + (boxWidth * 2) + (gap * 2), boxesY, boxWidth, boxHeight, [
					["Vendor", String(dnHeader.vendor_name)],
					["Address", vAddr || "-"],
					["GST", String(dnHeader.vendor_gst || "-")],
					["Contact", String(dnHeader.vendor_contact || "-")],
					["Place of Supply", String(dnHeader.place_of_supply || "-")]
				]);

				return boxesY + boxHeight + 15;
			};

			// --- 3. ITEMS TABLE ---
			doc.autoTable({
				startY: 160,
				margin: { left: margin, right: margin, top: 160, bottom: 120 },
				head: [["S.N", "ITEM NAME", "CODE / EAN", "HSN", "BATCH / EXP", "MRP", "QTY", "PRICE", "TXBL", "GST%", "GST$", "NET$"]],
				body: dnLines.map((row, index) => {
					const expiryStr = row['Expiry'] ? moment(row['Expiry']).format("MM/YY") : "-";
					return [
						index + 1, row['Item Name'], `${row['product_code'] || ""}\n${row['EAN Code'] || ""}`, 
						row['hsn_code'] || "-", `${row['Batch No'] || ""}\n${expiryStr}`,
						Number(row['MRP'] || 0).toFixed(2), row['Qty'], Number(row['Price'] || 0).toFixed(2),
						Number(row['Taxable $'] || 0).toFixed(2), row['GST %'] + "%",
						Number(row['GST $'] || 0).toFixed(2), Number(row['Net $'] || 0).toFixed(2)
					];
				}),
				didDrawPage: (data) => {
					drawMainHeader(data.pageNumber, doc.internal.getNumberOfPages());
				},
				theme: 'grid',
				styles: { fontSize: 7, cellPadding: 3, lineColor: [100, 100, 100], lineWidth: 0.5, textColor: [0, 0, 0] },
				headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
				columnStyles: {
					0: { cellWidth: 20 }, 1: { cellWidth: 'auto', minCellWidth: 100 },
					2: { cellWidth: 55 }, 4: { cellWidth: 55 },
					5: { halign: 'right' }, 6: { halign: 'center' }, 7: { halign: 'right' },
					8: { halign: 'right' }, 9: { halign: 'center' }, 10: { halign: 'right' }, 11: { halign: 'right' }
				}
			});

			// --- 4. FOOTER & SUMMARY ---
			let currentY = doc.lastAutoTable.finalY + 15;

			// If summary won't fit on this page, add a new page
			if (currentY > pageHeight - 220) {
				doc.addPage();
				currentY = 160; 
			}

			doc.autoTable({
				startY: currentY,
				margin: { left: margin },
				head: [["TAX SUMMARY", "TOTAL PCS", "TAXABLE VALUE", "TAX AMOUNT", "NET AMOUNT"]],
				body: summaryData.map(row => [
					row.PARTICULARS, row.Pcs, row.Taxable.toFixed(2), row.Tax.toFixed(2), row.Net.toFixed(2)
				]),
				didDrawPage: (data) => {
					// IMPORTANT: This ensures the header is drawn on Page 2 as well
					drawMainHeader(data.pageNumber, doc.internal.getNumberOfPages());
				},
				theme: 'grid',
				styles: { fontSize: 8, cellPadding: 4, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0] },
				headStyles: { fillColor: [245, 245, 245], fontStyle: 'bold' },
				bodyStyles: (row) => (row.at(0) === 'Total' ? { fontStyle: 'bold', fillColor: [250, 250, 250] } : {}),
				tableWidth: 400
			});

			const wordsY = doc.lastAutoTable.finalY + 25;
			doc.setFontSize(10); doc.setFont("helvetica", "bold");
			doc.text("Total Amount (in words):", margin, wordsY);
			doc.setFont("helvetica", "normal");
			doc.text(this.toWords(Math.round(grandTotal)), margin + 120, wordsY);

			doc.setFontSize(8);
			doc.text("This is a computer generated document and does not require a physical signature.", margin, wordsY + 20);

			// Acknowledgement Slip
			const slipY = pageHeight - 100;
			doc.setLineDash([3, 3], 0); doc.line(margin, slipY, pageWidth - margin, slipY); doc.setLineDash([], 0);
			doc.setFontSize(9); doc.setFont("helvetica", "bold");
			doc.text("DETACHABLE ACKNOWLEDGEMENT SLIP", pageWidth / 2, slipY + 15, { align: "center" });

			doc.setFont("helvetica", "normal");
			doc.text(`Debit Note: ${dnHeader.debit_note_number}`, margin, slipY + 35);
			doc.text(`Date: ${moment(dnHeader.debit_note_date).format("DD/MM/YYYY")}`, margin + 180, slipY + 35);
			doc.text(`Amount: ${Number(grandTotal).toFixed(2)}`, margin + 350, slipY + 35);
			doc.text(`Vendor: ${dnHeader.vendor_name}`, margin, slipY + 50);
			doc.text(`Receiver's Signature: ___________________________`, margin + 310, slipY + 80);

			download(doc.output('dataurlstring'), (dnHeader.debit_note_number || "DebitNote") + ".pdf", "application/pdf");
			showAlert("Debit Note Ready", "success");

		} catch (error) {
			showAlert("PDF Generation Failed: " + error.message, "error");
		}
	},

	getDNTaxSummary: (lines) => {
		const groups = {};
		lines.forEach(row => {
			const gstPct = row['GST %'] || "0.00";
			const taxName = gstPct + '% GST';
			if (!groups[taxName]) {
				groups[taxName] = { PARTICULARS: taxName, Pcs: 0, Taxable: 0, Tax: 0, Net: 0 };
			}
			const g = groups[taxName];
			g.Pcs += Number(row['Qty'] || 0);
			g.Taxable += Number(row['Taxable $'] || 0);
			g.Tax += Number(row['GST $'] || 0);
			g.Net += Number(row['Net $'] || 0);
		});
		const resultRows = Object.values(groups);
		if (resultRows.length > 1) {
			const totalRow = resultRows.reduce((acc, curr) => {
				acc.Pcs += curr.Pcs; acc.Taxable += curr.Taxable;
				acc.Tax += curr.Tax; acc.Net += curr.Net; return acc;
			}, { PARTICULARS: 'Total', Pcs: 0, Taxable: 0, Tax: 0, Net: 0 });
			resultRows.push(totalRow);
		}
		return resultRows;
	},

	toWords: (num) => {
		const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
		const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
		const n = ("000000000" + Math.floor(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
		if (!n) return '';
		let str = '';
		str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
		str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
		str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
		str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
		str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only ' : 'Only ';
		return str;
	},

	_drawSimpleBox: (doc, x, y, width, height, rows) => {
		doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.5); doc.rect(x, y, width, height);
		let rowY = y + 12;
		rows.forEach(r => {
			doc.setFontSize(8); doc.setFont("helvetica", "bold");
			doc.text(String(r[0]) + ":", x + 5, rowY);
			doc.setFont("helvetica", "normal");
			const val = String(r[1] || "-");
			const splitVal = doc.splitTextToSize(val, width - 60);
			doc.text(splitVal, x + 58, rowY);
			rowY += (splitVal.length * 9) + 2;
		});
	}
}
