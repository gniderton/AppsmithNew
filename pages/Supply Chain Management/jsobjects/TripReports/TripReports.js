export default {
	// --- MAIN TRIGGER FUNCTION ---
	downloadTripReports: async (type) => {
		const selectedTrip = tblSyncLogs.triggeredRow || tblSyncLogs.selectedRow;
		
		if (!selectedTrip) {
			return showAlert("Please select a trip first", "warning");
		}

		// Look up team details
		const teamDetails = getDeliveryTeam.data.find(t => t.id == (selectedTrip.delivery_team_id || 1)) || {};

		const tripInfo = {
			trip_number: selectedTrip.trip_number || `TR-${selectedTrip.id}`,
			date: selectedTrip.created_at || new Date(),
			vehicle_number: selectedTrip.vehicle_number || teamDetails.vehicle_number || "KL-11-Z-0000",
			driver_name: selectedTrip.driver_name || teamDetails.driver_name || "Driver",
			team: selectedTrip.team_name || teamDetails.name || "General Team"
		};

		if (type === "PICKLIST") {
			await getPickList.run();
			this.generatePickList(getPickList.data, tripInfo);
		} else if (type === "DELIVERY_LIST") {
			await getDeliveryList.run();
			this.generateDeliveryList(getDeliveryList.data, tripInfo);
		}
	},

	// --- 1. PICKLIST (PORTRAIT) ---
	generatePickList: async (data, tripInfo) => {
		try {
			const doc = new jspdf.jsPDF('p', 'pt', 'a4');
			const margin = 25;
			const pageWidth = doc.internal.pageSize.width;
			
			// Defensive Logo Access
			const logo = Global_Assets.branding?.logo || ""; 

			const drawHeader = () => {
				if (logo) doc.addImage(logo, 'PNG', margin, 20, 80, 30);
				doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 58, 138);
				doc.text("TRIP PICKLIST", pageWidth / 2, 40, { align: "center" });

				this._drawInfoBox(doc, margin, 65, pageWidth - (margin * 2), 50, [
					["TRIP #", tripInfo.trip_number],
					["DATE", moment(tripInfo.date).format("DD MMM YYYY")],
					["VEHICLE", tripInfo.vehicle_number],
					["DRIVER", tripInfo.driver_name],
					["TEAM", tripInfo.team]
				]);
			};

			doc.autoTable({
				startY: 130,
				margin: { left: margin, right: margin, top: 120 },
				head: [["S.N", "CODE", "ITEM DESCRIPTION", "MRP", "QTY", "LOADED [ ]"]],
				body: data.map((row, index) => [
					index + 1,
					row.product_code || "-",
					{ content: row.product_name || "-", styles: { fontStyle: 'bold' } },
					Number(row.mrp || 0).toFixed(2),
					{ content: Number(row.total_qty || 0).toFixed(0), styles: { fontStyle: 'bold', halign: 'center', fontSize: 11 } },
					"[  ]"
				]),
				didDrawPage: () => drawHeader(),
				theme: 'grid',
				styles: { fontSize: 9, cellPadding: 6, valign: 'middle' },
				headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255] },
				columnStyles: { 0: { cellWidth: 30 }, 2: { cellWidth: 'auto' }, 4: { cellWidth: 60 }, 5: { cellWidth: 70, halign: 'center' } }
			});

			const fY = doc.lastAutoTable.finalY + 40;
			doc.setFontSize(10); doc.setTextColor(50);
			doc.text("Warehouse Supervisor: ________________", margin, fY);
			doc.text("Driver Signature: ________________", pageWidth - 180, fY);

			download(doc.output('dataurlstring'), `PickList_${tripInfo.trip_number}.pdf`, "application/pdf");
		} catch (e) { showAlert("PickList Error: " + e.message, "error"); }
	},

	// --- 2. DELIVERY LIST (LANDSCAPE) ---
	generateDeliveryList: async (data, tripInfo) => {
		try {
			const doc = new jspdf.jsPDF('l', 'pt', 'a4');
			const margin = 20;
			const pageWidth = doc.internal.pageSize.width;
			
			// Defensive Logo Access
			const logo = Global_Assets.branding?.logo || "";

			const drawHeader = () => {
				if (logo) doc.addImage(logo, 'PNG', margin, 20, 80, 30);
				doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(153, 27, 27);
				doc.text("DELIVERY & COLLECTION SHEET", pageWidth / 2, 40, { align: "center" });

				this._drawInfoBox(doc, margin, 65, pageWidth - (margin * 2), 50, [
					["TRIP #", tripInfo.trip_number],
					["DATE", moment(tripInfo.date).format("DD MMM YYYY")],
					["VEHICLE", tripInfo.vehicle_number],
					["DRIVER", tripInfo.driver_name],
					["TEAM", tripInfo.team]
				]);
			};

			doc.autoTable({
				startY: 130,
				margin: { left: margin, right: margin, top: 120 },
				head: [["SEQ", "INVOICE #", "CUSTOMER NAME", "ADDRESS/CONTACT", "BILL AMT", "STATUS", "COLLECTED [ ]", "REMARKS"]],
				body: data.map((row, index) => [
					index + 1,
					row.invoice_number,
					{ content: row.customer_name, styles: { fontStyle: 'bold' } },
					`${row.address || ""}\nPh: ${row.phone || "-"}`,
					{ content: Number(row.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
					row.delivery_status || "Pending",
					"",
					""
				]),
				didDrawPage: () => drawHeader(),
				theme: 'grid',
				styles: { fontSize: 8, cellPadding: 5, valign: 'middle' },
				headStyles: { fillColor: [153, 27, 27], textColor: [255, 255, 255] },
				columnStyles: { 0: { cellWidth: 30 }, 2: { cellWidth: 140 }, 4: { cellWidth: 80 }, 6: { cellWidth: 80 } }
			});

			const fY = doc.lastAutoTable.finalY + 30;
			doc.setFontSize(10);
			doc.text(`Total Expected Collection: ${data.reduce((a, b) => a + Number(b.grand_total), 0).toFixed(2)}`, margin, fY);
			doc.text("Driver Signature: ________________", margin, fY + 40);
			doc.text("Manager Signature: ________________", pageWidth - 180, fY + 40);

			download(doc.output('dataurlstring'), `DeliverySheet_${tripInfo.trip_number}.pdf`, "application/pdf");
		} catch (e) { showAlert("Delivery Error: " + e.message, "error"); }
	},

	// --- HELPER: Info Box Grid ---
	_drawInfoBox: (doc, x, y, width, height, items) => {
		doc.setDrawColor(220); doc.setLineWidth(0.5); doc.rect(x, y, width, height);
		const cellW = width / items.length;
		items.forEach((item, i) => {
			const cX = x + (i * cellW);
			doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(120);
			doc.text(item[0], cX + 8, y + 15);
			doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(0);
			doc.text(String(item[1]), cX + 8, y + 35);
			if (i < items.length - 1) doc.line(cX + cellW, y + 8, cX + cellW, y + height - 8);
		});
	}
}
