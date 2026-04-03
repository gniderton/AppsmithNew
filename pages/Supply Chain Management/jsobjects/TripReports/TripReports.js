export default {
	// --- MAIN TRIGGER FUNCTION ---
	downloadTripReports: async (type) => {
		if (type === "PICKLIST") {
			await getPickList.run();
			
			if (!getPickList.data || !getPickList.data.trip_info) {
			    return showAlert("Failed to generate Picklist. Check API.", "error");
			}

			const tripInfo = {
				trip_number: getPickList.data.trip_info.trip_number || "-",
				date: getPickList.data.trip_info.date || new Date(),
				vehicle_number: getPickList.data.trip_info.vehicle_number || "Not Assigned",
				driver_name: getPickList.data.trip_info.driver_name || "Unassigned",
				team: getPickList.data.trip_info.team_name || "General Team"
			};

			this.generatePickList(getPickList.data.items || [], tripInfo);

		} else if (type === "DELIVERY_LIST") {
			await getDeliveryList.run();
			
            if (!getDeliveryList.data || !getDeliveryList.data.trip_info) {
			    return showAlert("Failed to generate Delivery List. Check API.", "error");
			}

			const tripInfo = {
				trip_number: getDeliveryList.data.trip_info.trip_number || "-",
				date: getDeliveryList.data.trip_info.date || new Date(),
				vehicle_number: getDeliveryList.data.trip_info.vehicle_number || "Not Assigned",
				driver_name: getDeliveryList.data.trip_info.driver_name || "Unassigned",
				team: getDeliveryList.data.trip_info.team_name || "General Team"
			};

			this.generateDeliveryList(getDeliveryList.data.items || [], tripInfo);
		}
	},

	// --- 1. PICKLIST (PORTRAIT - B&W) ---
	generatePickList: async (data, tripInfo) => {
		try {
			if (typeof jspdf === "undefined") throw new Error("jspdf library not loaded.");
			const jsPDFConstructor = jspdf.jsPDF || jspdf;
			const doc = new jsPDFConstructor('p', 'pt', 'a4'); 
			
			const brand = Global_Assets.getSummary(); 
			const margin = 15; 
			const pageWidth = doc.internal.pageSize.width;
			const pageHeight = doc.internal.pageSize.height;

			// --- HEADER BLOCK (Page 1 Only) ---
			const drawTopSection = () => {
				const headerY = margin + 5;
				try {
					const logo = Global_Assets.getLogo();
					if (logo && logo.startsWith("data:image/")) {
						doc.addImage(logo, 'PNG', margin, headerY, 80, 25);
					}
				} catch(e) {}

				doc.setTextColor(0, 0, 0); // Black
				doc.setFont("helvetica", "bold");
				doc.setFontSize(14);
				doc.text("WAREHOUSE PICKLIST", pageWidth / 2, headerY + 15, { align: "center" });

				const boxesY = headerY + 35;
				const gap = 10; 
				const boxWidth = (pageWidth - (margin * 2) - (gap * 2)) / 3;
				const boxHeight = 55; 

                // BOX 1: Company
				this._drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
					["COMPANY", String(brand.regt_name)],
					["GST", String(brand.gst)],
					["CONTACT", String(brand.contact_no)],
					["EMAIL", String(brand.email)]
				]);

                // BOX 2: Trip Details
				this._drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
					["TEAM", String(tripInfo.team)],
					["DRIVER", String(tripInfo.driver_name)],
					["VEHICLE", String(tripInfo.vehicle_number)]
				]);

                // BOX 3: Item Metrics
				const totalQty = data.reduce((sum, r) => sum + Number(r.total_qty || 0), 0);
				this._drawSimpleBox(doc, margin + (boxWidth * 2) + (gap * 2), boxesY, boxWidth, boxHeight, [
					["TRIP NO", String(tripInfo.trip_number)],
					["DATE", moment(tripInfo.date).format("DD MMM YYYY")],
					["TOTAL ITEMS", `${data.length} Products`],
					["TOTAL QTY", `${totalQty.toFixed(0)} Units`]
				]);

				return boxesY + boxHeight + 2.5; 
			};

			const firstPageTableStart = drawTopSection();

            // --- TABLE ---
			doc.autoTable({
				startY: firstPageTableStart,
				margin: { left: margin, right: margin, bottom: 40, top: 2.5 },
				head: [["S.N", "CODE", "ITEM DESCRIPTION", "BATCHES", "MRP", "QTY", "LOADED [ ]"]],
				body: data.map((row, index) => [
					index + 1,
					row.product_code || "-",
					{ content: row.product_name || "-", styles: { fontStyle: 'bold' } },
					row.batches || "-",
					Number(row.mrp || 0).toFixed(2),
					{ content: Number(row.total_qty || 0).toFixed(0), styles: { fontStyle: 'bold', halign: 'center', fontSize: 10 } },
					""
				]),
				didDrawPage: (data) => {
					// Clean Footer
					doc.setFontSize(8); doc.setTextColor(100); doc.setFont("helvetica", "normal");
					const timestamp = `Generated: ${moment().format("DD MMM YYYY, hh:mm A")}`;
					doc.text(timestamp, margin, pageHeight - 15);
					doc.text(`Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`, pageWidth - margin - 40, pageHeight - 15);
					
					// Signatures on last page
					if (data.pageNumber === doc.internal.getNumberOfPages()) {
						doc.setDrawColor(150); doc.setLineWidth(0.5);
						doc.line(margin, pageHeight - 40, margin + 120, pageHeight - 40);
						doc.text("Warehouse Supervisor", margin, pageHeight - 30);
						
						doc.line(pageWidth - margin - 120, pageHeight - 40, pageWidth - margin, pageHeight - 40);
						doc.text("Driver Signature", pageWidth - margin - 120, pageHeight - 30);
					}
				},
				theme: 'grid',
				styles: { fontSize: 8, cellPadding: 5, lineColor: [0, 0, 0], lineWidth: 0.5, minCellHeight: 20, textColor: [0,0,0], valign: 'middle' },
				headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.5, lineColor: [0,0,0] },
				columnStyles: { 0: { cellWidth: 25 }, 2: { cellWidth: 'auto' }, 4: { cellWidth: 40 }, 5: { cellWidth: 45 }, 6: { cellWidth: 60 } }
			});

			download(doc.output('dataurlstring'), `PickList_${tripInfo.trip_number}.pdf`, "application/pdf");
		} catch (e) { showAlert("PickList Error: " + e.message, "error"); }
	},

	// --- 2. DELIVERY LIST (PORTRAIT - B&W) ---
	generateDeliveryList: async (data, tripInfo) => {
		try {
			if (typeof jspdf === "undefined") throw new Error("jspdf library not loaded.");
			const jsPDFConstructor = jspdf.jsPDF || jspdf;
			// Forced Portrait (p)
			const doc = new jsPDFConstructor('p', 'pt', 'a4'); 
			
			const brand = Global_Assets.getSummary(); 
			const margin = 15; 
			const pageWidth = doc.internal.pageSize.width;
			const pageHeight = doc.internal.pageSize.height;

			// --- HEADER BLOCK (Page 1 Only) ---
			const drawTopSection = () => {
				const headerY = margin + 5;
				try {
					const logo = Global_Assets.getLogo();
					if (logo && logo.startsWith("data:image/")) {
						doc.addImage(logo, 'PNG', margin, headerY, 80, 25);
					}
				} catch(e) {}

				doc.setTextColor(0, 0, 0); // Black
				doc.setFont("helvetica", "bold");
				doc.setFontSize(14);
				doc.text("DELIVERY & COLLECTION SHEET", pageWidth / 2, headerY + 15, { align: "center" });

				const boxesY = headerY + 35;
				const gap = 10; 
				const boxWidth = (pageWidth - (margin * 2) - (gap * 2)) / 3;
				const boxHeight = 55; 

                // BOX 1: Company
				this._drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
					["COMPANY", String(brand.regt_name)],
					["GST", String(brand.gst)],
					["CONTACT", String(brand.contact_no)],
					["EMAIL", String(brand.email)]
				]);

                // BOX 2: Trip Details
				this._drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
					["TEAM", String(tripInfo.team)],
					["DRIVER", String(tripInfo.driver_name)],
					["VEHICLE", String(tripInfo.vehicle_number)]
				]);

                // BOX 3: Route Metrics
				const totalAmnt = data.reduce((sum, r) => sum + Number(r.grand_total || 0), 0);
				this._drawSimpleBox(doc, margin + (boxWidth * 2) + (gap * 2), boxesY, boxWidth, boxHeight, [
					["TRIP NO", String(tripInfo.trip_number)],
					["DATE", moment(tripInfo.date).format("DD MMM YYYY")],
					["TOTAL SHOPS", `${data.length} Customers`],
					["EXPECTED", `Rs. ${totalAmnt.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`]
				]);

				return boxesY + boxHeight + 2.5; 
			};

			const firstPageTableStart = drawTopSection();

            // --- TABLE ---
			doc.autoTable({
				startY: firstPageTableStart,
				margin: { left: margin, right: margin, bottom: 40, top: 2.5 },
				head: [["SEQ", "INVOICE #", "CUSTOMER NAME", "ADDRESS/CONTACT", "BILL AMT", "COLLECTED [ ]", "REMARKS"]],
				body: data.map((row, index) => [
					index + 1,
					row.invoice_number,
					{ content: row.customer_name, styles: { fontStyle: 'bold' } },
					`${row.address || ""}\nPh: ${row.phone || "-"}`,
					{ content: Number(row.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } }, // Removed custom text color
					"", 
					"" // Removed "STATUS" column as Space is tighter in portrait.
				]),
				didDrawPage: (data) => {
					// Clean Footer
					doc.setFontSize(8); doc.setTextColor(100); doc.setFont("helvetica", "normal");
					const timestamp = `Generated: ${moment().format("DD MMM YYYY, hh:mm A")}`;
					doc.text(timestamp, margin, pageHeight - 15);
					doc.text(`Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`, pageWidth - margin - 40, pageHeight - 15);
					
					// Signatures on last page
					if (data.pageNumber === doc.internal.getNumberOfPages()) {
						doc.setDrawColor(150); doc.setLineWidth(0.5);
						doc.line(margin, pageHeight - 40, margin + 120, pageHeight - 40);
						doc.text("Driver Signature", margin, pageHeight - 30);
						
						doc.line(pageWidth - margin - 120, pageHeight - 40, pageWidth - margin, pageHeight - 40);
						doc.text("Manager Signature", pageWidth - margin - 120, pageHeight - 30);
					}
				},
				theme: 'grid',
				// Made padding slightly smaller to fit better in portrait constraints
				styles: { fontSize: 7, cellPadding: 4, lineColor: [0, 0, 0], lineWidth: 0.5, minCellHeight: 25, textColor: [0,0,0], valign: 'middle' },
				headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.5, lineColor: [0,0,0] },
				columnStyles: { 0: { cellWidth: 25 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 110 }, 4: { cellWidth: 60 }, 5: { cellWidth: 70 }, 6: { cellWidth: 70 } }
			});

			download(doc.output('dataurlstring'), `DeliverySheet_${tripInfo.trip_number}.pdf`, "application/pdf");
		} catch (e) { showAlert("Delivery Error: " + e.message, "error"); }
	},

	// --- HELPER: Info Box Grid ---
	_drawSimpleBox: (doc, x, y, width, height, rows) => {
		doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.5); doc.rect(x, y, width, height);
		let rowY = y + 12; // Start slightly lower 
		rows.forEach(r => {
			doc.setFontSize(8); doc.setFont("helvetica", "bold");
			doc.text(String(r[0]) + ":", x + 5, rowY);
			doc.setFont("helvetica", "normal");
			const val = String(r[1] || "-"); 
            // Offset text to align nicely next to the label
			const splitVal = doc.splitTextToSize(val, width - 75); 
			doc.text(splitVal, x + 70, rowY); 
			rowY += (splitVal.length * 10) + 1; 
		});
	}
}
