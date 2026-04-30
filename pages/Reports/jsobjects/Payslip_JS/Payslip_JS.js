export default {
    /**
     * POLISHED PREMIUM Payslip PDF Generator
     * Fixes: Slimmer margins, Dynamic calculation of dashboard totals.
     */
    async generatePayslip(payslipData) {
        try {
            if (!payslipData || !payslipData.header) throw new Error("No Payslip data provided.");

            const jsPDFConstructor = jspdf.jsPDF || jspdf;
            const doc = new jsPDFConstructor('p', 'pt', 'a4');
            
            if (typeof doc.autoTable !== "function" && jspdf.plugin && jspdf.plugin.autotable) {
                jsPDFConstructor.API.autoTable = jspdf.plugin.autotable;
            }

            const header = payslipData.header;
            const breakdown = payslipData.breakdown;
            const brand = Global_Assets.getSummary();
            
            // --- SLIMMER MARGINS ---
            const margin = 25; 
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;

            // --- CALCULATE TOTALS DYNAMICALLY (Fixes the 0.00 issue) ---
            const totalEarnings = Number(breakdown.base_salary.adjusted || header.base_salary) + 
                                 (breakdown.additions.bonuses || []).reduce((sum, b) => sum + Number(b.amount), 0) +
                                 Number(breakdown.additions.leave_encashment || 0);

            const totalDeductions = Number(breakdown.deductions.leave.amount) +
                                   (breakdown.deductions.advances || []).reduce((sum, a) => sum + Number(a.amount), 0) +
                                   (breakdown.deductions.liabilities || []).reduce((sum, l) => sum + Number(l.amount), 0) +
                                   (breakdown.deductions.loans || []).reduce((sum, ln) => sum + Number(loan.amount), 0);

            // --- BACKGROUND ACCENT & WATERMARK ---
            doc.setFillColor(30, 41, 59); doc.rect(0, 0, pageWidth, 4, 'F');
            doc.setFontSize(60); doc.setTextColor(250, 251, 253); doc.setFont("helvetica", "bold");
            doc.text("CONFIDENTIAL", pageWidth / 2, pageHeight / 2, { align: "center", angle: 45 });

            // --- HEADER ---
            try {
                const logo = Global_Assets.getLogo();
                if (logo) doc.addImage(logo, 'PNG', margin, 20, 100, 35);
            } catch (e) {}

            doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
            doc.text("PAYSLIP", pageWidth - margin, 40, { align: "right" });
            doc.setFontSize(9); doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "normal");
            const monthStr = this._getMonthName(header.month).toUpperCase();
            doc.text(`${monthStr} ${header.year}`, pageWidth - margin, 52, { align: "right" });

            // --- INFO TILES (Compact) ---
            const tileY = 75;
            const tileWidth = (pageWidth - (margin * 2) - 16) / 3;
            const tileHeight = 105;

            this._drawPremiumTile(doc, margin, tileY, tileWidth, tileHeight, "EMPLOYEE", [
                ["Name", header.full_name], ["Emp ID", header.employee_code],
                ["Joined", moment(header.joining_date).format("DD MMM YYYY")], ["Month", `${monthStr} ${header.year}`]
            ], [51, 65, 85]);

            this._drawPremiumTile(doc, margin + tileWidth + 8, tileY, tileWidth, tileHeight, "PAYMENT", [
                ["Ref ID", `#${header.journal_entry_id || header.id}`], ["Pay Date", moment(header.payment_date).format("DD-MM-YYYY")],
                ["Method", header.payment_mode], ["Account", (header.source_account || "").split('(')[0]]
            ], [51, 65, 85]);

            this._drawPremiumTile(doc, margin + (tileWidth * 2) + 16, tileY, tileWidth, tileHeight, "STATUS", [
                ["Absent", header.absent_days + " Days"], ["Half Days", header.half_days + " Days"],
                ["Admin", header.processed_by], ["Verified", "System Generated"]
            ], [51, 65, 85]);

            // --- DASHBOARD SUMMARY (Dynamic Totals) ---
            let currentY = tileY + tileHeight + 25;
            this._drawStat(doc, margin + 5, currentY, "GROSS ADDITIONS", `+ ${totalEarnings.toFixed(2)}`, [21, 128, 61]);
            this._drawStat(doc, margin + tileWidth + 13, currentY, "TOTAL DEDUCTIONS", `- ${totalDeductions.toFixed(2)}`, [185, 28, 28]);
            this._drawStat(doc, margin + (tileWidth * 2) + 21, currentY, "PAYOUT RATIO", `100%`, [30, 41, 59]);

            // --- TABLES ---
            currentY += 45;
            const earningsRows = [
                ["Basic Salary (Contract)", Number(breakdown.base_salary.original).toFixed(2)],
                ... (breakdown.additions.bonuses || []).map(b => [`Bonus: ${b.remarks || b.bonus_type}`, Number(b.amount).toFixed(2)]),
                ["Leave Encashment", Number(breakdown.additions.leave_encashment).toFixed(2)]
            ].filter(r => Number(r[1]) > 0);

            doc.autoTable({
                startY: currentY, margin: { left: margin, right: margin },
                head: [["EARNINGS DESCRIPTION", "AMOUNT (INR)"]], body: earningsRows,
                theme: 'striped', styles: { fontSize: 8.5, cellPadding: 5, textColor: [51, 65, 85] },
                headStyles: { fillColor: [51, 65, 85], fontStyle: 'bold' },
                columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
            });

            const deductionRows = [
                ["Leave Deduction", Number(breakdown.deductions.leave.amount).toFixed(2)],
                ... (breakdown.deductions.advances || []).map(a => ["Advance Recovery", Number(a.amount).toFixed(2)]),
                ... (breakdown.deductions.liabilities || []).map(l => [`Liability: ${l.description} (${l.invoice_number || l.type})`, Number(l.amount).toFixed(2)]),
                ... (breakdown.deductions.loans || []).map(loan => ["Loan EMI", Number(loan.amount).toFixed(2)])
            ].filter(r => Number(r[1]) > 0);

            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 12, margin: { left: margin, right: margin },
                head: [["DEDUCTIONS & RECOVERIES", "AMOUNT (INR)"]], body: deductionRows,
                theme: 'striped', styles: { fontSize: 8.5, cellPadding: 5, textColor: [153, 27, 27] },
                headStyles: { fillColor: [153, 27, 27], fontStyle: 'bold' },
                columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
            });

            // --- TOTAL PAYOUT BAR ---
            currentY = doc.lastAutoTable.finalY + 25;
            doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240);
            doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 50, 4, 4, 'FD');
            doc.setFontSize(10); doc.setTextColor(71, 85, 105); doc.setFont("helvetica", "bold");
            doc.text("NET TAKE-HOME PAY", margin + 15, currentY + 25);
            doc.setFontSize(16); doc.setTextColor(21, 128, 61);
            doc.text(`INR ${Number(header.net_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - margin - 15, currentY + 28, { align: "right" });
            doc.setFontSize(7.5); doc.setTextColor(148, 163, 184); doc.setFont("helvetica", "normal");
            doc.text(`Amount in words: ${this._toWords(header.net_salary)}`, margin + 15, currentY + 40);

            // --- SIGNATURES ---
            const footerY = pageHeight - 70;
            doc.setDrawColor(203, 213, 225); doc.line(margin, footerY, margin + 120, footerY); doc.line(pageWidth - margin - 120, footerY, pageWidth - margin, footerY);
            doc.setFontSize(8); doc.setTextColor(71, 85, 105);
            doc.text("Employee Signature", margin + 60, footerY + 12, { align: "center" });
            doc.text("Authorized Signatory", pageWidth - margin - 60, footerY + 12, { align: "center" });
            doc.setFontSize(6.5); doc.text("Electronic document - No physical signature required.", pageWidth / 2, pageHeight - 15, { align: "center" });

            download(doc.output('dataurlstring'), `Payslip_${header.employee_code}.pdf`, "application/pdf");
            showAlert("Premium Payslip Downloaded", "success");

        } catch (error) {
            showAlert("Design Error: " + error.message, "error");
        }
    },

    _drawPremiumTile(doc, x, y, w, h, title, rows, color) {
        doc.setDrawColor(226, 232, 240); doc.setFillColor(255, 255, 255); doc.roundedRect(x, y, w, h, 3, 3, 'FD');
        doc.setFillColor(...color); doc.rect(x, y, 2.5, h, 'F'); 
        doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...color);
        doc.text(title, x + 8, y + 12);
        let ry = y + 28;
        rows.forEach(r => {
            doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 116, 139);
            doc.text(r[0] + ":", x + 8, ry);
            doc.setFont("helvetica", "normal"); doc.setTextColor(30, 41, 59);
            const val = doc.splitTextToSize(String(r[1] || "-"), w - 55);
            doc.text(val, x + 50, ry); ry += (val.length * 8) + 3;
        });
    },

    _drawStat(doc, x, y, label, val, color) {
        doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(148, 163, 184);
        doc.text(label, x, y);
        doc.setFontSize(13); doc.setTextColor(...color);
        doc.text(val, x, y + 16);
    },

    _getMonthName: (m) => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1],

    _toWords(num) {
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
}
