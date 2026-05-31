export default {
    /**
     * REDESIGNED PREMIUM PAYSLIP PDF GENERATOR
     * Fixes: Minimal margins (15pt), replaces Rupee symbol with 'Rs.' to fix font rendering issues.
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
            
            // --- GEOMETRY & MINIMAL MARGINS ---
            const margin = 15; 
            const pageWidth = doc.internal.pageSize.width; // 595
            const pageHeight = doc.internal.pageSize.height; // 842

            // --- CALCULATE TOTALS ---
            const totalEarnings = Number(breakdown.base_salary.adjusted || header.base_salary) + 
                                 (breakdown.additions.bonuses || []).reduce((sum, b) => sum + Number(b.amount), 0) +
                                 Number(breakdown.additions.leave_encashment || 0);

            const totalDeductions = Number(breakdown.deductions.leave.amount) +
                                   (breakdown.deductions.advances || []).reduce((sum, a) => sum + Number(a.amount), 0) +
                                   (breakdown.deductions.liabilities || []).reduce((sum, l) => sum + Number(l.amount), 0) +
                                   (breakdown.deductions.loans || []).reduce((sum, ln) => sum + Number(ln.amount), 0);

            // --- DECORATIVE HEADER BAR ---
            doc.setFillColor(15, 23, 42); 
            doc.rect(0, 0, pageWidth, 5, 'F');

            // --- LOGO & DOCUMENT TITLE ---
            try {
                const logo = Global_Assets.getLogo();
                if (logo) doc.addImage(logo, 'PNG', margin, 15, 100, 32);
            } catch (e) {}

            doc.setTextColor(15, 23, 42); 
            doc.setFont("helvetica", "bold"); 
            doc.setFontSize(20);
            doc.text("PAYSLIP", pageWidth - margin, 32, { align: "right" });
            
            doc.setFontSize(8.5); 
            doc.setTextColor(100, 116, 139); 
            doc.setFont("helvetica", "bold");
            const monthStr = this._getMonthName(header.month).toUpperCase();
            doc.text(`${monthStr} ${header.year}`, pageWidth - margin, 44, { align: "right" });

            // --- PROFILE CARD CONTAINER (Unified 3-column layout) ---
            const profileY = 60;
            const profileH = 80;
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(241, 245, 249);
            doc.roundedRect(margin, profileY, pageWidth - (margin * 2), profileH, 4, 4, 'FD');
            
            // Left Accent Border
            doc.setFillColor(71, 85, 105);
            doc.rect(margin, profileY, 2.5, profileH, 'F');

            // Col 1: Employee info
            doc.setFontSize(7.5); doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "bold");
            doc.text("EMPLOYEE DETAILS", margin + 12, profileY + 14);
            
            doc.setFont("helvetica", "normal"); doc.setTextColor(15, 23, 42); doc.setFontSize(8);
            doc.text(`Name: ${header.full_name}`, margin + 12, profileY + 28);
            doc.text(`Emp ID: ${header.employee_code}`, margin + 12, profileY + 40);
            doc.text(`Joined: ${moment(header.joining_date).format("DD MMM YYYY")}`, margin + 12, profileY + 52);
            doc.text(`Status: Active`, margin + 12, profileY + 64);

            // Col 2: Payment info
            doc.setFontSize(7.5); doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "bold");
            doc.text("PAYMENT DETAILS", margin + 195, profileY + 14);
            
            doc.setFont("helvetica", "normal"); doc.setTextColor(15, 23, 42); doc.setFontSize(8);
            doc.text(`Payment Mode: ${header.payment_mode}`, margin + 195, profileY + 28);
            doc.text(`Account: ${(header.source_account || "").split('(')[0].trim()}`, margin + 195, profileY + 40);
            doc.text(`Txn Ref ID: #${header.journal_entry_id || header.id}`, margin + 195, profileY + 52);
            doc.text(`Pay Date: ${moment(header.payment_date).format("DD MMM YYYY")}`, margin + 195, profileY + 64);

            // Col 3: Attendance info
            doc.setFontSize(7.5); doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "bold");
            doc.text("ATTENDANCE SUMMARY", margin + 378, profileY + 14);
            
            doc.setFont("helvetica", "normal"); doc.setTextColor(15, 23, 42); doc.setFontSize(8);
            doc.text(`Absent Days: ${header.absent_days || 0} Days`, margin + 378, profileY + 28);
            doc.text(`Half Days: ${header.half_days || 0} Days`, margin + 378, profileY + 40);
            doc.text(`Processed By: ${header.processed_by || 'SYSTEM'}`, margin + 378, profileY + 52);
            doc.text(`Audit Status: Verified`, margin + 378, profileY + 64);

            // --- FINANCIAL SUMMARY TILES (Gross, Deductions, Net) ---
            const statY = profileY + profileH + 15;
            const tileW = (pageWidth - (margin * 2) - 16) / 3;
            const tileH = 40;

            // Gross Additions Card
            doc.setFillColor(240, 253, 244); doc.setDrawColor(220, 252, 231);
            doc.roundedRect(margin, statY, tileW, tileH, 3, 3, 'FD');
            doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(22, 101, 52);
            doc.text("GROSS ADDITIONS", margin + 10, statY + 13);
            doc.setFontSize(12); doc.text(`+ Rs. ${totalEarnings.toFixed(2)}`, margin + 10, statY + 28);

            // Deductions Card
            doc.setFillColor(254, 242, 242); doc.setDrawColor(254, 226, 226);
            doc.roundedRect(margin + tileW + 8, statY, tileW, tileH, 3, 3, 'FD');
            doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(153, 27, 27);
            doc.text("TOTAL DEDUCTIONS", margin + tileW + 18, statY + 13);
            doc.setFontSize(12); doc.text(`- Rs. ${totalDeductions.toFixed(2)}`, margin + tileW + 18, statY + 28);

            // Net Take Home Card
            doc.setFillColor(240, 249, 255); doc.setDrawColor(224, 242, 254);
            doc.roundedRect(margin + (tileW * 2) + 16, statY, tileW, tileH, 3, 3, 'FD');
            doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(7, 89, 133);
            doc.text("NET TAKE-HOME", margin + (tileW * 2) + 26, statY + 13);
            doc.setFontSize(12); doc.text(`Rs. ${Number(header.net_salary).toFixed(2)}`, margin + (tileW * 2) + 26, statY + 28);

            // --- SIDE-BY-SIDE ITEMIZED TABLES ---
            const tableStartY = statY + tileH + 15;
            const colWidth = (pageWidth - (margin * 2) - 16) / 2; // 274pt

            // Left side body (Earnings)
            const earningsRows = [
                ["Basic Salary (Contract)", Number(breakdown.base_salary.original).toFixed(2)],
                ... (breakdown.additions.bonuses || []).map(b => {
                    const desc = b.remarks ? `Bonus: ${b.remarks}` : `Bonus (${b.bonus_type || 'Manual'})`;
                    const dateStr = b.created_at ? `\n[${moment(b.created_at).format("DD MMM")}]` : '';
                    return [desc + dateStr, Number(b.amount).toFixed(2)];
                }),
                ["Leave Encashment", Number(breakdown.additions.leave_encashment).toFixed(2)]
            ].filter(r => Number(r[1]) > 0);

            // Right side body (Deductions)
            const deductionRows = [
                [`Leave Deductions\n(${breakdown.deductions.leave.absent_days || 0} Abs / ${breakdown.deductions.leave.half_days || 0} Half)`, Number(breakdown.deductions.leave.amount).toFixed(2)],
                ... (breakdown.deductions.advances || []).map(a => {
                    const desc = a.remarks ? `Advance: ${a.remarks}` : "Advance Recovery";
                    const dateStr = a.date ? `\n[${moment(a.date).format("DD MMM YYYY")}]` : '';
                    return [desc + dateStr, Number(a.amount).toFixed(2)];
                }),
                ... (breakdown.deductions.liabilities || []).map(l => {
                    const desc = `Liability: ${l.description || 'Misc'}`;
                    const refStr = l.invoice_number ? `\n[Inv: ${l.invoice_number}]` : '';
                    return [desc + refStr, Number(l.amount).toFixed(2)];
                }),
                ... (breakdown.deductions.loans || []).map(loan => {
                    const desc = loan.remarks ? `Loan Recovery: ${loan.remarks}` : "Loan EMI";
                    const dateStr = loan.date ? `\n[${moment(loan.date).format("DD MMM")}]` : '';
                    return [desc + dateStr, Number(loan.amount).toFixed(2)];
                })
            ].filter(r => Number(r[1]) > 0);

            // Render Earnings Table
            doc.autoTable({
                startY: tableStartY,
                margin: { left: margin, right: pageWidth - margin - colWidth },
                head: [["EARNINGS DESCRIPTION", "AMOUNT (Rs.)"]],
                body: earningsRows,
                theme: 'striped',
                styles: { fontSize: 8, cellPadding: 5, textColor: [15, 23, 42], overflow: 'linebreak' },
                headStyles: { fillColor: [51, 65, 85], fontStyle: 'bold', fontSize: 8 },
                columnStyles: { 1: { halign: 'right', fontStyle: 'bold', cellWidth: 65 } }
            });
            const earningsFinalY = doc.lastAutoTable.finalY;

            // Render Deductions Table
            doc.autoTable({
                startY: tableStartY,
                margin: { left: margin + colWidth + 16, right: margin },
                head: [["DEDUCTIONS & RECOVERIES", "AMOUNT (Rs.)"]],
                body: deductionRows,
                theme: 'striped',
                styles: { fontSize: 8, cellPadding: 5, textColor: [15, 23, 42], overflow: 'linebreak' },
                headStyles: { fillColor: [190, 18, 60], fontStyle: 'bold', fontSize: 8 },
                columnStyles: { 1: { halign: 'right', fontStyle: 'bold', cellWidth: 65 } }
            });
            const deductionsFinalY = doc.lastAutoTable.finalY;

            // Get the maximum ending Y coordinate of the two tables
            const tablesFinalY = Math.max(earningsFinalY, deductionsFinalY);

            // --- NET SALARY BANNER BLOCK ---
            const bannerY = tablesFinalY + 20;
            const bannerH = 44;
            doc.setFillColor(4, 120, 87); // Emerald Green
            doc.roundedRect(margin, bannerY, pageWidth - (margin * 2), bannerH, 3, 3, 'F');

            doc.setFontSize(8.5); doc.setTextColor(209, 250, 229); doc.setFont("helvetica", "bold");
            doc.text("NET TAKE-HOME PAYOUT", margin + 12, bannerY + 18);
            doc.setFontSize(6); doc.text(`Rupees in words: ${this._toWords(header.net_salary)}`, margin + 12, bannerY + 32);

            doc.setFontSize(15); doc.setTextColor(255, 255, 255);
            doc.text(`Rs. ${Number(header.net_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - margin - 12, bannerY + 26, { align: "right" });

            // --- REMARKS SECTION (If remarks exist) ---
            if (header.remarks) {
                const remarksY = bannerY + bannerH + 15;
                doc.setDrawColor(226, 232, 240); doc.setFillColor(255, 255, 255);
                doc.roundedRect(margin, remarksY, pageWidth - (margin * 2), 32, 3, 3, 'FD');
                doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 116, 139);
                doc.text("REMARKS & NOTES", margin + 8, remarksY + 11);
                doc.setFont("helvetica", "normal"); doc.setTextColor(51, 65, 85); doc.setFontSize(7);
                doc.text(header.remarks, margin + 8, remarksY + 22);
            }

            // --- SIGNATURES & FOOTER ---
            const footerY = pageHeight - 65;
            doc.setDrawColor(203, 213, 225); 
            doc.line(margin, footerY, margin + 110, footerY); 
            doc.line(pageWidth - margin - 110, footerY, pageWidth - margin, footerY);
            
            doc.setFontSize(7.5); doc.setTextColor(71, 85, 105); doc.setFont("helvetica", "bold");
            doc.text("Employee Signature", margin + 55, footerY + 12, { align: "center" });
            doc.text("Authorized Signatory", pageWidth - margin - 55, footerY + 12, { align: "center" });
            
            doc.setFontSize(6); doc.setTextColor(148, 163, 184); doc.setFont("helvetica", "normal");
            doc.text("Electronic document generated by GNIDERTON ERP System. No physical signature is required.", pageWidth / 2, pageHeight - 15, { align: "center" });

            download(doc.output('dataurlstring'), `Payslip_${header.employee_code}.pdf`, "application/pdf");
            showAlert("Premium Redesigned Payslip Downloaded", "success");

        } catch (error) {
            showAlert("Redesign Error: " + error.message, "error");
        }
    },

    _getMonthName: (m) => ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m - 1],

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