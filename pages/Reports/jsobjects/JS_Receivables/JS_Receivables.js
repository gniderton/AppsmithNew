export default {
	// MAIN FUNCTION: Symmetric "Collection Master" with Bare Minimum Margins
	downloadReceivablesPDF: async () => {
		try {
			const data = tblRecievables.tableData;
			if (!data || data.length === 0) throw new Error("No data available to download.");

			// --- 1. DATA LOOKUPS & SORTING ---
			const selectedDseName = SelectDse.selectedOptionValue;
			const dseDetails = getEmployees.data.find(emp => emp.full_name === selectedDseName) || {};

			const sortedData = [...data].sort((a, b) => {
				const nameA = (a.customer_name || "").toUpperCase();
				const nameB = (b.customer_name || "").toUpperCase();
				if (nameA < nameB) return -1;
				if (nameA > nameB) return 1;
				return new Date(a.invoice_date) - new Date(b.invoice_date);
			});

			// --- 2. CALCULATE FINANCIAL METRICS ---
			const osTotal = sortedData.reduce((sum, item) => sum + Number(item.balance || 0), 0);
			const invCount = sortedData.length;
			const custCount = [...new Set(sortedData.map(i => i.customer_id))].length;
			const above21DaysAmt = sortedData.filter(i => i.days_from_billed > 21).reduce((s, i) => s + Number(i.balance), 0);
			const targetAmt = osTotal * 0.30;

			// --- 3. LIBRARY SETUP ---
			if (typeof jspdf === "undefined") throw new Error("jspdf library not loaded.");
			const jsPDFConstructor = jspdf.jsPDF || jspdf;
			const doc = new jsPDFConstructor('p', 'pt', 'a4'); 
			const brand = Global_Assets.getSummary(); 
			
			const margin = 5; 
			const pageWidth = doc.internal.pageSize.width;
			const pageHeight = doc.internal.pageSize.height;

			// --- HEADER & RECONCILIATION BLOCK (Page 1 Only) ---
			const drawTopSection = () => {
				const headerY = margin;
				try {
					const logo = Global_Assets.getLogo();
					if (logo.startsWith("data:image/")) {
						doc.addImage(logo, 'PNG', margin, headerY, 80, 25);
					}
				} catch(e) {}

				doc.setTextColor(0, 0, 0); 
				doc.setFont("helvetica", "bold");
				doc.setFontSize(14);
				doc.text("PAYMENT COLLECTION MASTER", pageWidth / 2, headerY + 12, { align: "center" });

				const boxesY = headerY + 35;
				const gap = 5; 
				const boxWidth = (pageWidth - (margin * 2) - (gap * 2)) / 3;
				const boxHeight = 50; 

				this._drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
					["COMPANY", String(brand.regt_name)],
					["GST", String(brand.gst)],
					["CONTACT", String(brand.contact_no)],
					["EMAIL", String(brand.email)]
				]);

				this._drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
					["DSE CODE", String(dseDetails.employee_code || "-")],
					["DSE NAME", selectedDseName || "ALL SALES"],
					["ROUTE", SelectRoute.selectedOptionValue || "ALL ROUTES"],
					["DATE", moment().format("DD/MM/YYYY")]
				]);

				this._drawSimpleBox(doc, margin + (boxWidth * 2) + (gap * 2), boxesY, boxWidth, boxHeight, [
					["O/S TOTAL", `Rs. ${osTotal.toFixed(0)}`],
					["INV/CUST", `${invCount} / ${custCount}`],
					["> 21 DAYS", `Rs. ${above21DaysAmt.toFixed(0)}`],
					["TARGET 30%", `Rs. ${targetAmt.toFixed(0)}`]
				]);

				const reconY = boxesY + boxHeight + 5;

				doc.autoTable({
					startY: reconY,
					margin: { left: margin },
					tableWidth: boxWidth,
					head: [["DENOMINATION", "QTY", "AMOUNT"]],
					body: [ ["500", "", ""], ["200", "", ""], ["100", "", ""], ["50", "", ""], ["20", "", ""], ["10", "", ""], ["Others", "", ""], ["TOTAL CASH", "", ""] ],
					theme: 'grid',
					styles: { fontSize: 7, cellPadding: 3, lineColor: [0,0,0], textColor: [0,0,0], minCellHeight: 18 },
					headStyles: { 
						fillColor: [255, 255, 255], 
						textColor: [0, 0, 0], 
						fontStyle: 'bold',
						lineWidth: 0.5,
						lineColor: [0, 0, 0]
					}
				});

				doc.autoTable({
					startY: reconY,
					margin: { left: margin + boxWidth + gap },
					tableWidth: (boxWidth * 2) + gap,
					head: [["COLLECTION SUMMARY", "AMOUNT"]],
					body: [ 
						["TOTAL CASH RECEIPT", ""], 
						["CHEQUE TOTAL", ""], 
						["ONLINE / UPI TOTAL", ""], 
						["EXPENSES (IF ANY)", ""], 
						["GRAND TOTAL COLLECTED", ""] 
					],
					theme: 'grid',
					styles: { fontSize: 7, cellPadding: 3, minCellHeight: 27, lineColor: [0,0,0], textColor: [0,0,0], valign: 'middle' },
					headStyles: { 
						fillColor: [255, 255, 255], 
						textColor: [0, 0, 0], 
						fontStyle: 'bold',
						lineWidth: 0.5,
						lineColor: [0, 0, 0]
					}
				});

				return doc.lastAutoTable.finalY + 2.5; 
			};

			const firstPageTableStart = drawTopSection();

			// --- 4. MAIN BILL TABLE ---
			doc.autoTable({
				startY: firstPageTableStart,
				margin: { left: margin, right: margin, bottom: 13, top: 5 }, 
				head: [["Date", "Inv No", "Customer", "Amt", "Bal", "P.Date", "Mode", "Bank/Ref No", "Paid", "D"]],
				body: sortedData.map((row) => [
					moment(row.invoice_date).format("DD/MM/YY"),
					row.invoice_number.replace("INV-26-", ""),
					row.customer_name,
					Number(row.bill_amount).toFixed(0),
					Number(row.balance).toFixed(0),
					"", "", "", "", 
					row.days_from_billed
				]),
				// FIXED: didDrawPage now draws a clean footer instead of overlapping top text
				didDrawPage: (data) => {
					const totalPages = doc.internal.getNumberOfPages();
					doc.setFontSize(5);
					doc.setTextColor(100);
					doc.setFont("helvetica", "normal");
					
					const footerText = `Page ${data.pageNumber}`;
					const timestamp = `Generated on: ${moment().format("DD MMM YYYY, hh:mm A")}`;
					
					// Draw page number on the right
					doc.text(footerText, pageWidth - margin - 30, pageHeight - 5);
					// Draw timestamp on the left
					doc.text(timestamp, margin, pageHeight - 5);
				},
				theme: 'grid',
				styles: { fontSize: 5, cellPadding: 4, lineColor: [0, 0, 0], lineWidth: 0.5, minCellHeight: 22, textColor: [0,0,0], valign: 'middle' },
				headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
				columnStyles: { 
					0: { cellWidth: 50 }, 1: { cellWidth: 45 }, 2: { cellWidth: 'auto' },
					3: { halign: 'right', cellWidth: 40 }, 4: { halign: 'right', cellWidth: 40 },
					5: { cellWidth: 50 }, 6: { cellWidth: 40 }, 7: { cellWidth: 'auto' },
					8: { cellWidth: 45 }, 9: { halign: 'center', cellWidth: 25 }
				}
			});

			download(doc.output('dataurlstring'), `Collection_${selectedDseName || 'Global'}.pdf`, "application/pdf");

		} catch (error) {
			showAlert("PDF Error: " + error.message, "error");
		}
	},

	// HELPER: DRAWS HEADER BOXES
	_drawSimpleBox: (doc, x, y, width, height, rows) => {
		doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.5); doc.rect(x, y, width, height);
		let rowY = y + 11;
		rows.forEach(r => {
			doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
			doc.text(String(r[0]) + ":", x + 4, rowY);
			doc.setFont("helvetica", "normal");
			const val = String(r[1] || "-"); 
			const splitVal = doc.splitTextToSize(val, width - 65); 
			doc.text(splitVal, x + 63, rowY); 
			rowY += (splitVal.length * 8.5) + 2; 
		});
	}
}