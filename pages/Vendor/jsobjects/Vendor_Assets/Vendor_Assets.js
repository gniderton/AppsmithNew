export default {
    previewPaymentSlip: async (paymentId) => {
        try {
            await getVendorPaymentSlipDetails.run({ payment_id: paymentId });
            const data = getVendorPaymentSlipDetails.data;
            if (!data || !data.header) throw new Error("Payment data not found.");
            
            const header = data.header;
            const allocations = data.allocations || [];
            const reconciliations = data.invoice_reconciliation || [];
            
            const pageWidth = 595; 
            const margin = 17.5; 

            // --- HELPERS ---
            const toWordsIndian = (num) => {
                const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
                const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
                const n = ("000000000" + Math.floor(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
                if (!n) return ''; 
                let str = '';
                str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
                str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
                str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
                str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
                str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[Number(n[5])]] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only' : 'Only';
                return str;
            };

            const jsPDFConstructor = jspdf.jsPDF || jspdf;
            const doc = new jsPDFConstructor('p', 'pt', 'a4');
            if (typeof doc.autoTable !== "function" && jspdf.plugin && jspdf.plugin.autotable) {
                jsPDFConstructor.API.autoTable = jspdf.plugin.autotable;
            }

            // --- BRANDING ---
            const brand = (typeof Global_Assets !== 'undefined') ? (Global_Assets.branding || Global_Assets.getSummary()) : {};
            try {
                const logo = (typeof Global_Assets !== 'undefined' && Global_Assets.getLogo) ? Global_Assets.getLogo() : brand.logo;
                if (logo) doc.addImage(logo, 'PNG', margin, 30, 110, 35);
            } catch(e) {}

            doc.setFontSize(16); doc.setTextColor(0); doc.setFont("helvetica", "bold");
            doc.text("PAYMENT VOUCHER", pageWidth / 2, 55, { align: 'center' });
            doc.setLineWidth(1.5); doc.line(230, 60, 365, 60);

            // --- BOXES ---
            const boxWidth = (pageWidth - (margin * 2) - 10) / 3;
            const boxY = 85;
            doc.setLineWidth(1); doc.setDrawColor(0);
            
            doc.rect(margin, boxY, boxWidth, 100);
            doc.setFontSize(8); doc.text("VOUCHER DETAILS", margin + 5, boxY + 12);
            doc.setFont("helvetica", "normal"); doc.setFontSize(9);
            doc.text(`Slip No: ${header.payment_number || '-'}`, margin + 5, boxY + 30);
            doc.text(`Date: ${header.payment_date ? moment(header.payment_date).format('DD-MMM-YYYY') : '-'}`, margin + 5, boxY + 45);
            doc.text(`Mode: ${header.payment_mode || '-'}`, margin + 5, boxY + 60);
            doc.text(`Ref: ${header.final_ref || '-'}`, margin + 5, boxY + 75);

            doc.rect(margin + boxWidth + 5, boxY, boxWidth, 100);
            doc.setFont("helvetica", "bold"); doc.setFontSize(8);
            doc.text("ISSUED BY", margin + boxWidth + 10, boxY + 12);
            doc.setFontSize(9); doc.text(brand.regt_name || brand.name || "Company", margin + boxWidth + 10, boxY + 28, { maxWidth: boxWidth - 15 });
            doc.setFontSize(8); doc.setFont("helvetica", "normal");
            doc.text(brand.address || "", margin + boxWidth + 10, boxY + 40, { maxWidth: boxWidth - 15 });
            doc.text(`GST: ${brand.gst || '-'}`, margin + boxWidth + 10, boxY + 70);
            doc.text(`Bank: ${header.bank_name || 'N/A'}`, margin + boxWidth + 10, boxY + 92);

            doc.rect(margin + (boxWidth * 2) + 10, boxY, boxWidth, 100);
            doc.setFont("helvetica", "bold"); doc.setFontSize(8);
            doc.text("PAID TO", margin + (boxWidth * 2) + 15, boxY + 12);
            doc.setFontSize(9); doc.text(header.vendor_name || "-", margin + (boxWidth * 2) + 15, boxY + 28, { maxWidth: boxWidth - 15 });
            doc.setFontSize(8); doc.setFont("helvetica", "normal");
            doc.text(`Code: ${header.vendor_code || '-'}`, margin + (boxWidth * 2) + 15, boxY + 45);
            doc.text(`GST: ${header.vendor_gst || '-'}`, margin + (boxWidth * 2) + 15, boxY + 58);
            doc.text(`Location: ${header.vendor_city || ''}`, margin + (boxWidth * 2) + 15, boxY + 84);

            // --- 5. MAIN VOUCHER TABLE ---
            const mainBody = allocations.map(a => [
                moment(a.invoice_date).format('DD-MMM-YYYY'),
                a.bill_no_vendor || '-',
                Number(a.bill_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                Number(a.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })
            ]);

            doc.autoTable({
                startY: 195,
                head: [['Bill Date', 'Vendor Bill No', 'Bill Amount', 'Paid Now']],
                body: mainBody,
                theme: 'grid', 
                headStyles: { fillColor: [255, 255, 255], textColor: 0, fontSize: 8, fontStyle: 'bold', halign: 'center', lineWidth: 0.5, lineColor: [0, 0, 0] },
                columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
                styles: { fontSize: 8, cellPadding: 5, lineColor: [0, 0, 0], lineWidth: 0.5 },
                margin: { left: margin, right: margin }
            });

            // --- 6. SETTLEMENT RECONCILIATION TABLES (LEFT ALIGNED, NO FILL) ---
            let reconY = doc.lastAutoTable.finalY + 30;
            doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
            doc.text("SETTLEMENT RECONCILIATION:", margin, reconY);
            reconY += 10;

            reconciliations.forEach((recon) => {
                if (reconY > 730) { doc.addPage(); reconY = 40; }
                
                doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
                doc.text(`Audit Trail for Bill: ${recon.bill_no_vendor}`, margin, reconY + 12);
                
                const historyRows = (recon.full_history || []).map(h => [
                   `Debit: ${h.type} (${h.ref_no})`,
                   Number(h.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })
                ]);

                const reconData = [
                    [{ content: 'Total Bill Value (Credit)', styles: { fontStyle: 'bold' } }, { content: Number(recon.bill_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' } }],
                    ...historyRows,
                    [{ content: 'Closing Balance', styles: { fontStyle: 'bold' } }, { content: Number(recon.balance_remaining).toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' } }]
                ];

                doc.autoTable({
                    startY: reconY + 15,
                    body: reconData,
                    theme: 'grid',
                    styles: { fontSize: 7, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.5, fillColor: [255, 255, 255] },
                    columnStyles: { 1: { halign: 'right', cellWidth: 80 } },
                    margin: { left: margin, right: margin + 200 } // Width limited for a cleaner look
                });
                
                reconY = doc.lastAutoTable.finalY + 15;
            });

            // --- 7. FINAL FOOTER ---
            if (reconY > 750) { doc.addPage(); reconY = 40; }
            doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
            doc.text(`TOTAL PAID: Rs.${Number(header.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, margin, reconY + 20);

            const wordString = toWordsIndian(header.amount);
            doc.setFontSize(9); doc.setFont("helvetica", "italic"); doc.setTextColor(50);
            doc.text(`Rupees: ${wordString}`, margin, reconY + 35);

            doc.setFont("helvetica", "normal"); doc.setTextColor(0); doc.setFontSize(9);
            doc.text("Remarks: " + (header.remarks || '-'), margin, reconY + 55);

            doc.setFont("helvetica", "bold");
            doc.text("For " + (brand.regt_name || brand.name || "Company"), pageWidth - margin, reconY + 75, { align: 'right' });
            doc.line(pageWidth - margin - 150, reconY + 110, pageWidth - margin, reconY + 110);
            doc.text("Authorized Signatory", pageWidth - margin, reconY + 125, { align: 'right' });

            const fileName = `Voucher_${header.payment_number || 'Draft'}.pdf`;
            download(doc.output('dataurlstring'), fileName, "application/pdf");
            showAlert("Payment Voucher Generated", "success");

        } catch (err) {
            showAlert('PDF Generation Error: ' + err.message, 'error');
        }
    }
}
