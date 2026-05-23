export default {
    /**
     * PREMIUM Forensic Financial Snapshot PDF Generator
     * Generates a multi-section financial summary based on the forensic snapshot data.
     */
    async exportForensicReport(forensicData) {
        try {
            if (!forensicData) throw new Error("No forensic snapshot data provided.");

            // --- 1. LIBRARY SAFETY ---
            if (typeof jspdf === "undefined") throw new Error("jspdf library not loaded.");
            const jsPDFConstructor = jspdf.jsPDF || jspdf;
            const doc = new jsPDFConstructor('p', 'pt', 'a4'); 

            // Ensure AutoTable attachment
            if (typeof doc.autoTable !== "function" && jspdf.plugin && jspdf.plugin.autotable) {
                jsPDFConstructor.API.autoTable = jspdf.plugin.autotable;
            }

            const brand = Global_Assets.getSummary();
            const margin = 20; 
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;

            // --- 2. HELPER: DRAW RECURRING HEADER ---
            const drawHeader = (currentPage, totalPages) => {
                const headerY = margin + 5;
                try {
                    const logo = Global_Assets.getLogo();
                    if (logo && logo.startsWith("data:image/")) {
                        doc.addImage(logo, 'PNG', margin, headerY, 90, 25);
                    }
                } catch(e) {}

                // Title Section
                doc.setTextColor(30, 41, 59); // Slate-800
                doc.setFont("helvetica", "bold");
                doc.setFontSize(14);
                doc.text("FORENSIC FINANCIAL SNAPSHOT", pageWidth - margin, headerY + 10, { align: "right" });
                
                doc.setFontSize(8.5);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(100, 116, 139); // Slate-500
                const generatedDate = moment(forensicData.timestamp).format("DD MMM YYYY, hh:mm A");
                doc.text(`Snapshot Generated: ${generatedDate}`, pageWidth - margin, headerY + 22, { align: "right" });

                // Divider Line
                doc.setDrawColor(226, 232, 240); // Slate-200
                doc.line(margin, headerY + 32, pageWidth - margin, headerY + 32);

                const boxesY = headerY + 40;
                const gap = 10;
                const boxWidth = (pageWidth - (margin * 2) - (gap * 2)) / 3;
                const boxHeight = 50;

                // Summary Dashboard Stat Boxes
                this._drawStatBox(doc, margin, boxesY, boxWidth, boxHeight, "TOTAL REAL ASSETS", `INR ${Number(forensicData.summary.total_assets).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
                this._drawStatBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, "TOTAL LIABILITIES", `INR ${Number(forensicData.summary.total_liabilities).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
                
                const netCapital = Number(forensicData.summary.net_capital);
                this._drawStatBox(doc, margin + (boxWidth * 2) + (gap * 2), boxesY, boxWidth, boxHeight, "NET CAPITAL (EQUITY)", `INR ${netCapital.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, netCapital < 0);

                return boxesY + boxHeight + 15;
            };

            // --- 3. PREPARE SECTIONS DATA ---
            
            // A. Liquid Accounts & Balances
            const liquidRows = (forensicData.accounts || []).map(acc => [
                acc.name,
                acc.category,
                Number(acc.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })
            ]);

            // B. Receivables & Payables Summary (Top 5 each)
            const partyRows = [];
            (forensicData.receivables || []).slice(0, 5).forEach(r => {
                partyRows.push([r.party, "Receivable (Customer)", `${r.pending_bills} Bills`, Number(r.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })]);
            });
            (forensicData.payables || []).slice(0, 5).forEach(p => {
                partyRows.push([p.party, "Payable (Vendor)", "-", Number(p.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })]);
            });

            // C. Loans
            const loanRows = [];
            (forensicData.loans_given || []).forEach(l => {
                loanRows.push([l.party_name, "LOAN GIVEN (Asset)", l.status, Number(l.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })]);
            });
            (forensicData.loans_taken || []).forEach(l => {
                loanRows.push([l.party_name, "LOAN TAKEN (Liability)", l.status, Number(l.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })]);
            });

            // D. Inventory Valuation & Fixed Assets (Top 5 Stock + All Assets)
            const assetRows = [];
            (forensicData.stock || []).slice(0, 5).forEach(s => {
                assetRows.push([s.product_name, "Inventory (Stock)", `${Number(s.stock_qty).toLocaleString()} Units`, Number(s.valuation).toLocaleString('en-IN', { minimumFractionDigits: 2 })]);
            });
            (forensicData.assets_list || []).forEach(a => {
                assetRows.push([a.asset_name, `Fixed Asset (${a.category})`, a.status, Number(a.purchase_cost).toLocaleString('en-IN', { minimumFractionDigits: 2 })]);
            });

            // E. Pending Cheques In Hand
            const chequeRows = (forensicData.cheques_list || []).map(c => [
                c.cheque_number,
                moment(c.cheque_date).format("DD/MM/YYYY"),
                c.party_name,
                c.bank_name,
                Number(c.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })
            ]);

            // --- 4. RENDER CONSOLIDATED REPORT SECTIONS ---
            let startY = 125;

            // SECTION 1: Liquid Accounts
            doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(51, 65, 85);
            doc.text("1. LIQUID ACCOUNTS & BALANCES", margin, startY);
            doc.autoTable({
                startY: startY + 5,
                margin: { left: margin, right: margin, bottom: 60 },
                head: [["ACCOUNT NAME", "CATEGORY", "BALANCE (INR)"]],
                body: liquidRows,
                theme: 'striped',
                styles: { fontSize: 8, cellPadding: 4.5, textColor: [30, 41, 59] },
                headStyles: { fillColor: [51, 65, 85], fontStyle: 'bold' },
                columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
                didDrawPage: (data) => {
                    drawHeader(data.pageNumber, doc.internal.getNumberOfPages());
                }
            });

            // SECTION 2: Top Receivables & Payables
            startY = doc.lastAutoTable.finalY + 20;
            if (startY > pageHeight - 120) { doc.addPage(); startY = 125; }
            doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(51, 65, 85);
            doc.text("2. OUTSTANDING RECEIVABLES & PAYABLES (TOP PARTIES)", margin, startY);
            doc.autoTable({
                startY: startY + 5,
                margin: { left: margin, right: margin, bottom: 60 },
                head: [["PARTY NAME", "CLASSIFICATION", "DETAILS", "BALANCE (INR)"]],
                body: partyRows.length > 0 ? partyRows : [["No outstanding parties", "-", "-", "0.00"]],
                theme: 'striped',
                styles: { fontSize: 8, cellPadding: 4.5, textColor: [30, 41, 59] },
                headStyles: { fillColor: [71, 85, 105], fontStyle: 'bold' },
                columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } }
            });

            // SECTION 3: Loans Summary
            startY = doc.lastAutoTable.finalY + 20;
            if (startY > pageHeight - 120) { doc.addPage(); startY = 125; }
            doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(51, 65, 85);
            doc.text("3. OUTSTANDING LOANS", margin, startY);
            doc.autoTable({
                startY: startY + 5,
                margin: { left: margin, right: margin, bottom: 60 },
                head: [["PARTY NAME", "LOAN TYPE / DIRECTION", "STATUS", "PRINCIPAL BALANCE (INR)"]],
                body: loanRows.length > 0 ? loanRows : [["No outstanding loans", "-", "-", "0.00"]],
                theme: 'striped',
                styles: { fontSize: 8, cellPadding: 4.5, textColor: [30, 41, 59] },
                headStyles: { fillColor: [51, 65, 85], fontStyle: 'bold' },
                columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } }
            });

            // SECTION 4: Asset & Stock Valuations
            startY = doc.lastAutoTable.finalY + 20;
            if (startY > pageHeight - 120) { doc.addPage(); startY = 125; }
            doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(51, 65, 85);
            doc.text("4. INVENTORY VALUATIONS & FIXED ASSETS", margin, startY);
            doc.autoTable({
                startY: startY + 5,
                margin: { left: margin, right: margin, bottom: 60 },
                head: [["ITEM / ASSET NAME", "CLASSIFICATION", "QUANTITY / STATUS", "VALUATION / COST (INR)"]],
                body: assetRows.length > 0 ? assetRows : [["No active valuations reported", "-", "-", "0.00"]],
                theme: 'striped',
                styles: { fontSize: 8, cellPadding: 4.5, textColor: [30, 41, 59] },
                headStyles: { fillColor: [71, 85, 105], fontStyle: 'bold' },
                columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } }
            });

            // SECTION 5: Pending incoming Cheques
            if (chequeRows.length > 0) {
                startY = doc.lastAutoTable.finalY + 20;
                if (startY > pageHeight - 120) { doc.addPage(); startY = 125; }
                doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(51, 65, 85);
                doc.text("5. PENDING INCOMING CHEQUES", margin, startY);
                doc.autoTable({
                    startY: startY + 5,
                    margin: { left: margin, right: margin, bottom: 60 },
                    head: [["CHEQUE NO", "CHEQUE DATE", "PARTY NAME", "BANK NAME", "AMOUNT (INR)"]],
                    body: chequeRows,
                    theme: 'striped',
                    styles: { fontSize: 8, cellPadding: 4.5, textColor: [30, 41, 59] },
                    headStyles: { fillColor: [51, 65, 85], fontStyle: 'bold' },
                    columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } }
                });
            }

            // --- 5. RENDER BRANDED FOOTERS ON ALL PAGES ---
            const totalPages = doc.internal.getNumberOfPages();
            doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
            doc.setTextColor(148, 163, 184); // Slate-400
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.text(`${brand.regt_name} | GST: ${brand.gst} | Email: ${brand.email}`, pageWidth / 2, pageHeight - 25, { align: "center" });
                doc.text(`Address: ${brand.address}, ${brand.District} - ${brand.pin} | Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 15, { align: "center" });
            }

            const fileName = `Forensic_Report_${moment(forensicData.timestamp).format("YYYYMMDD_HHmm")}.pdf`;
            download(doc.output('dataurlstring'), fileName, "application/pdf");
            showAlert("Forensic Financial Snapshot PDF Generated", "success");

        } catch (error) {
            showAlert("Forensic PDF Error: " + error.message, "error");
        }
    },

    // Modern Stat Box Helper
    _drawStatBox(doc, x, y, width, height, label, value, isNegative = false) {
        doc.setDrawColor(241, 245, 249); // Slate-100
        doc.setFillColor(248, 250, 252); // Slate-50
        doc.roundedRect(x, y, width, height, 4, 4, 'FD');
        
        doc.setFontSize(7); doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.text(label, x + (width / 2), y + 15, { align: "center" });
        
        doc.setFontSize(11); doc.setFont("helvetica", "bold");
        // Soft red text color if Negative Net Profit/Equity, else dark gray
        doc.setTextColor(isNegative ? 185 : 15, isNegative ? 28 : 23, isNegative ? 28 : 42); 
        doc.text(value, x + (width / 2), y + 35, { align: "center" });
    }
}