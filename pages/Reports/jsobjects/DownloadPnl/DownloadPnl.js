export default {
    async previewPnL(pnlData) {
        try {
            if (!pnlData) throw new Error("No P&L data provided.");

            if (typeof jspdf === "undefined") throw new Error("jspdf library not loaded.");
            const jsPDFConstructor = jspdf.jsPDF || jspdf;
            const doc = new jsPDFConstructor('p', 'pt', 'a4'); 

            if (typeof doc.autoTable !== "function" && jspdf.plugin && jspdf.plugin.autotable) {
                jsPDFConstructor.API.autoTable = jspdf.plugin.autotable;
            }

            const brand = Global_Assets.getSummary();
            const margin = 17.5; // Updated Margin as requested
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;

            // --- HELPER: DRAW RECURRING HEADER ---
            const drawPnLHeader = (currentPage, totalPages) => {
                const headerY = margin + 5;
                try {
                    const logo = Global_Assets.getLogo();
                    if (logo.startsWith("data:image/")) {
                        doc.addImage(logo, 'PNG', margin, headerY, 90, 25);
                    }
                } catch(e) {}

                // Title Section
                doc.setTextColor(40, 40, 40); 
                doc.setFont("helvetica", "bold");
                doc.setFontSize(14);
                doc.text("PROFIT & LOSS STATEMENT", pageWidth - margin, headerY + 10, { align: "right" });
                doc.setFontSize(9);
                doc.setFont("helvetica", "normal");
                doc.text(`Financial Period: ${pnlData.period.start} to ${pnlData.period.end}`, pageWidth - margin, headerY + 22, { align: "right" });

                // Divider Line
                doc.setDrawColor(230, 230, 230);
                doc.line(margin, headerY + 35, pageWidth - margin, headerY + 35);

                const boxesY = headerY + 45;
                const gap = 10;
                const boxWidth = (pageWidth - (margin * 2) - (gap * 2)) / 3;
                const boxHeight = 50; // Tighter Box Height

                // Stat Boxes (Modern Style)
                this._drawStatBox(doc, margin, boxesY, boxWidth, boxHeight, "TOTAL REVENUE", Number(pnlData.summary.total_revenue).toLocaleString('en-IN'));
                this._drawStatBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, "GROSS PROFIT", Number(pnlData.summary.gross_profit).toLocaleString('en-IN'));
                
                // net profit color: Red if negative, Greenish-Black if positive
                const netProfitMatch = Number(pnlData.summary.net_profit) < 0;
                this._drawStatBox(doc, margin + (boxWidth * 2) + (gap * 2), boxesY, boxWidth, boxHeight, "NET PROFIT", Number(pnlData.summary.net_profit).toLocaleString('en-IN'), netProfitMatch);

                return boxesY + boxHeight + 10; // Tighter gap before table
            };

            // --- 2. GENERATE TABLE BODY ---
            let tableData = [];
            const sections = ['revenue', 'cogs', 'operating_expenses', 'other_income'];
            
            sections.forEach(secKey => {
                const section = pnlData.sections[secKey];
                if (section && section.lines.length > 0) {
                    // Cleaner Section Header
                    tableData.push([
                        { content: section.title.toUpperCase(), styles: { fontStyle: 'bold', fillColor: [248, 249, 250], textColor: [40, 40, 40] } },
                        { content: "", styles: { fillColor: [248, 249, 250] } },
                        { content: Number(section.total).toFixed(2), styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 249, 250], textColor: [40, 40, 40] } }
                    ]);
                    
                    section.lines.forEach(line => {
                        tableData.push([`    ${line.name}`, line.code, line.amount.toFixed(2)]);
                    });
                    // Empty spacer row between sections
                    tableData.push([{ content: "", colSpan: 3, styles: { cellPadding: 1, border: 0 } }]);
                }
            });

            // --- 3. RENDER TABLE ---
            doc.autoTable({
                startY: 125, // Tighter start position
                margin: { left: margin, right: margin, bottom: 60 },
                head: [["PARTICULARS", "CODE", "AMOUNT (INR)"]],
                body: tableData,
                theme: 'plain', // Use plain for a more professional "report" feel
                styles: { fontSize: 8.5, cellPadding: 4, textColor: [60, 60, 60], lineColor: [240, 240, 240], lineWidth: 0.5 },
                headStyles: { fillColor: [255, 255, 255], textColor: [100, 100, 100], fontStyle: 'bold', borderBottom: 1 },
                columnStyles: { 
                    0: { cellWidth: 'auto' }, 
                    1: { cellWidth: 50, halign: 'center' }, 
                    2: { cellWidth: 80, halign: 'right' } 
                },
                didDrawPage: (data) => {
                   drawPnLHeader(data.pageNumber, doc.internal.getNumberOfPages());
                }
            });

            // --- 4. FOOTER & MARGINS ---
            let finalY = doc.lastAutoTable.finalY + 20;
            if (finalY > pageHeight - 80) { doc.addPage(); finalY = 50; }

            // Margin Summaries
            doc.setFontSize(10); doc.setFont("helvetica", "bold");
            doc.setTextColor(80, 80, 80);
            doc.text(`Gross Margin: ${pnlData.summary.gross_margin}`, margin, finalY);
            doc.text(`Net Margin: ${pnlData.summary.net_margin}`, pageWidth - margin, finalY, { align: "right" });

            // Branded Footer (The one you liked)
            doc.setFontSize(8); doc.setFont("helvetica", "normal");
            doc.setTextColor(120, 120, 120);
            doc.text(`${brand.regt_name} | GST: ${brand.gst} | Email: ${brand.email}`, pageWidth/2, pageHeight - 25, { align: "center" });
            doc.text(`Address: ${brand.address}, ${brand.District} - ${brand.pin}`, pageWidth/2, pageHeight - 15, { align: "center" });

            const fileName = `PnL_Report_${pnlData.period.start}.pdf`;
            download(doc.output('dataurlstring'), fileName, "application/pdf");
            showAlert("Professional P&L PDF Generated", "success");

        } catch (error) {
            showAlert("PDF Error: " + error.message, "error");
        }
    },

    // Modern Stat Box Helper
    _drawStatBox(doc, x, y, width, height, label, value, isNegative = false) {
        doc.setDrawColor(240, 240, 240);
        doc.setFillColor(252, 253, 255);
        doc.rect(x, y, width, height, 'FD');
        
        doc.setFontSize(7); doc.setFont("helvetica", "bold");
        doc.setTextColor(150, 150, 150);
        doc.text(label, x + (width/2), y + 15, { align: "center" });
        
        doc.setFontSize(12); doc.setFont("helvetica", "bold");
        doc.setTextColor(isNegative ? 200 : 40, 40, 40); // Simple Red fallback if negative
        doc.text(value, x + (width/2), y + 35, { align: "center" });
    }
}
