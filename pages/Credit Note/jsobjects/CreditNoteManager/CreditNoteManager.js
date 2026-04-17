export default {
    // 1. MAIN FUNCTION: Prints the Credit Note with full formatting
    previewCreditNote: async (cnHeader) => {
        try {
            if (!cnHeader || !cnHeader.id) throw new Error("No Credit Note data selected.");
            
            // --- 1. LIBRARY SETUP ---
            if (typeof jspdf === "undefined") throw new Error("jspdf library not loaded.");
            const jsPDFConstructor = jspdf.jsPDF || jspdf;
            const doc = new jsPDFConstructor('p', 'pt', 'a4'); 
            
            if (typeof doc.autoTable !== "function" && jspdf.plugin && jspdf.plugin.autotable) {
                jsPDFConstructor.API.autoTable = jspdf.plugin.autotable;
            }

            // --- 2. PREPARE DATA ---
            const cnLines = cnHeader.items || []; 
            const summaryData = this.getTaxSummary(cnLines); 
            const grandTotal = Number(cnHeader.amount || 0);
            const brand = Global_Assets.getSummary(); 
            const margin = 12; 
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height; // Added pageHeight reference

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

            // --- HELPER: DRAW PAGE HEADER ---
            const drawMainHeader = (currentPage, totalPages) => {
                const headerY = margin;
                try {
                    const logo = Global_Assets.getLogo();
                    if (logo.startsWith("data:image/")) {
                        doc.addImage(logo, 'PNG', margin, headerY, 90, 30);
                    }
                } catch(e) {}
                
                doc.setTextColor(0, 0, 0); 
                doc.setFont("helvetica", "bold");
                doc.setFontSize(16);
                doc.text("CREDIT NOTE", pageWidth / 2, headerY + 15, { align: "center" });
                
                doc.setFontSize(11);
                doc.text(String(cnHeader.return_number), pageWidth / 2, headerY + 30, { align: "center" });

                const boxesY = headerY + 40;
                const gap = 8;
                const boxWidth = (pageWidth - (margin * 2) - (gap * 2)) / 3;
                const boxHeight = 85; 

                // Box 1: Document Details
                this._drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
                    ["CN NUMBER", String(cnHeader.return_number)],
                    ["DATE", moment(cnHeader.return_date).format("DD/MM/YYYY")],
                    ["LINKED INV", String(cnHeader.linked_invoice_number || "-")],
                    ["TOTAL AMT", Number(grandTotal).toFixed(2)],
                    ["PAGE", `${currentPage} / ${totalPages}`]
                ]);

                // Box 2: Company Details
                this._drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
                    ["From", String(brand.regt_name)],
                    ["Address", String(brand.address)],
                    ["Dist/PIN", `${brand.District} - ${brand.pin}`],
                    ["GST", String(brand.gst)],
                    ["FSSAI", String(brand.fssai_no)],
                    ["Email", String(brand.email)],
                    ["Contact No", String(brand.contact_no)]
                ]);

                // Box 3: Customer Details
                const cArr = [cnHeader.customer_address, cnHeader.customer_district, cnHeader.customer_pin ? "PIN: " + cnHeader.customer_pin : null].filter(Boolean).join(", ");
                this._drawSimpleBox(doc, margin + (boxWidth * 2) + (gap * 2), boxesY, boxWidth, boxHeight, [
                    ["Customer", String(cnHeader.customer_name)],
                    ["Address", cArr || "-"],
                    ["GST", String(cnHeader.customer_gst || "-")],
                    ["Contact", String(cnHeader.customer_contact || "-")],
                    ["Email", String(cnHeader.customer_email || "-")]
                ]);
                
                return boxesY + boxHeight; 
            };

            // --- 3. ITEMS TABLE ---
            doc.autoTable({
                startY: margin + 40 + 85 + 10,
                margin: { left: margin, right: margin, top: margin + 140, bottom: 120 }, // Added bottom margin to prevent table overlapping slip
                head: [["S.N", "ITEM NAME", "CODE\nEAN", "HSN", "BATCH\nEXPIRY", "MRP", "QTY", "PRICE", "GROSS", "SCH", "D%", "D.AMT", "TXBL", "GST%", "GST$", "NET$"]],
                body: cnLines.map((row, index) => {
                    const expiryStr = row['Expiry'] ? moment(row['Expiry']).format("MM/YY") : "-";
                    return [
                        index + 1, row['Item Name'], `${row['product_code'] || ""}\n${row['EAN Code'] || ""}`, 
                        row['hsn_code'] || "-", `${row['Batch No'] || ""}\n${expiryStr}`,
                        Number(row['MRP'] || 0).toFixed(2), row['Qty'], Number(row['Price'] || 0).toFixed(2),
                        Number(row['Gross $'] || 0).toFixed(2), Number(row['Sch'] || 0).toFixed(2), 
                        row['Disc %'] || "0%", Number(row['Disc. $'] || 0).toFixed(2),
                        Number(row['Taxable $'] || 0).toFixed(2), (row['GST %'] || 0) + "%",
                        Number(row['GST $'] || 0).toFixed(2), Number(row['Net $'] || 0).toFixed(2)
                    ];
                }),
                didDrawPage: (data) => {
                    const totalPages = doc.internal.getNumberOfPages();
                    drawMainHeader(data.pageNumber, totalPages);
                },
                theme: 'grid',
                styles: { 
                    fontSize: 6, 
                    cellPadding: 2, 
                    lineColor: [0, 0, 0], 
                    lineWidth: 0.5, 
                    textColor: [0, 0, 0],
                    valign: 'middle' 
                },
                headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.5, valign: 'middle' },
                columnStyles: { 
                    0: { cellWidth: 15 }, 1: { cellWidth: 'auto', minCellWidth: 80 },
                    2: { cellWidth: 40 }, 3: { cellWidth: 30 }, 4: { cellWidth: 40 },
                    5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' },
                    8: { halign: 'right' }, 9: { halign: 'right' }, 10: { halign: 'right' },
                    11: { halign: 'right' }, 12: { halign: 'right' }, 13: { halign: 'center' },
                    14: { halign: 'right' }, 15: { halign: 'right' }
                }
            });

            // --- 4. TAX SUMMARY (FIXED OVERLAP LOGIC) ---
            let currentY = doc.lastAutoTable.finalY + 8;
            
            // Check if summary and footer fit on the page, else add new page
            if (currentY + 150 > pageHeight) {
                doc.addPage();
                const totalPages = doc.internal.getNumberOfPages();
                currentY = drawMainHeader(totalPages, totalPages) + 10;
            }

            doc.autoTable({
                startY: currentY,
                margin: { left: margin },
                head: [["TAX SUMMARY", "PCS", "GROSS", "SCH", "DISC", "TAXABLE", "TAX", "NET"]],
                body: summaryData.map(row => [
                    row.PARTICULARS, row.Pcs, row.Gross.toFixed(2), row.Sch.toFixed(2),
                    row.Disc.toFixed(2), row.Taxable.toFixed(2), row.Tax.toFixed(2), row.Net.toFixed(2)
                ]),
                theme: 'grid',
                styles: { 
                    fontSize: 7.5, 
                    cellPadding: 2, 
                    lineColor: [0, 0, 0], 
                    lineWidth: 0.5, 
                    textColor: [0, 0, 0],
                    valign: 'middle'
                },
                headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' }
            });

            // Footer Total in Words
            const wordsY = doc.lastAutoTable.finalY + 25;
            doc.setFontSize(11); doc.setFont("helvetica", "bold");
            doc.text("Total Amount (in words):", margin, wordsY);
            doc.setFont("helvetica", "normal");
            doc.text(toWords(Math.round(grandTotal)), margin + 140, wordsY);

            // Ack Slip at the very bottom
            const slipY = pageHeight - 110;
            doc.setLineDash([3, 3], 0); doc.line(margin, slipY, pageWidth - margin, slipY); doc.setLineDash([], 0); 
            doc.setFontSize(9); doc.setFont("helvetica", "bold");
            doc.text("DETACHABLE ACKNOWLEDGEMENT SLIP", pageWidth / 2, slipY + 20, { align: "center" });
            
            const slipContentY = slipY + 45; doc.setFont("helvetica", "normal");
            doc.text(`Credit Note: ${cnHeader.return_number}`, margin, slipContentY);
            doc.text(`Date: ${moment(cnHeader.return_date).format("DD/MM/YYYY")}`, margin + 180, slipContentY);
            doc.text(`Amt: ${grandTotal.toFixed(2)}`, margin + 350, slipContentY);
            doc.text(`Customer: ${cnHeader.customer_name}`, margin, slipContentY + 20);
            doc.text(`Auth. Signature: ___________________________`, margin + 310, slipContentY + 35);

            // --- 5. EXECUTE DOWNLOAD ---
            const fileName = (cnHeader.return_number || "CreditNote") + ".pdf";
            download(doc.output('dataurlstring'), fileName, "application/pdf");
            showAlert("Credit Note PDF Downloaded", "success");

        } catch (error) {
            showAlert("PDF Error: " + error.message, "error");
        }
    },

    // HELPER: TAX SUMMARY LOGIC
    getTaxSummary: (lines) => {
        const groups = {};
        lines.forEach(row => {
            const gstPct = row['GST %'] || "0.00";
            const taxName = gstPct + '% GST';
            if (!groups[taxName]) {
                groups[taxName] = { PARTICULARS: taxName, Pcs: 0, Gross: 0, Sch: 0, Disc: 0, Taxable: 0, Tax: 0, Net: 0 };
            }
            const g = groups[taxName];
            g.Pcs     += Number(row['Qty'] || 0);
            g.Gross   += Number(row['Gross $'] || 0);
            g.Sch     += Number(row['Sch'] || 0);
            g.Disc    += Number(row['Disc. $'] || 0);
            g.Taxable += Number(row['Taxable $'] || 0);
            g.Tax     += Number(row['GST $'] || 0);
            g.Net     += Number(row['Net $'] || 0);
        });
        const resultRows = Object.values(groups);
        if (resultRows.length > 0) {
            const totalRow = resultRows.reduce((acc, curr) => {
                acc.Pcs     += curr.Pcs; acc.Gross   += curr.Gross; acc.Sch     += curr.Sch;
                acc.Disc    += curr.Disc; acc.Taxable += curr.Taxable; acc.Tax     += curr.Tax;
                acc.Net     += curr.Net; return acc;
            }, { PARTICULARS: 'Total', Pcs: 0, Gross: 0, Sch: 0, Disc: 0, Taxable: 0, Tax: 0, Net: 0 });
            resultRows.push(totalRow);
        }
        return resultRows;
    },

    // HELPER: DRAWS HEADER BOXES
    _drawSimpleBox: (doc, x, y, width, height, rows) => {
        doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.5); doc.rect(x, y, width, height);
        let rowY = y + 11;
        rows.forEach(r => {
            doc.setFontSize(8); doc.setFont("helvetica", "bold");
            doc.text(String(r[0]) + ":", x + 5, rowY);
            doc.setFont("helvetica", "normal");
            const val = String(r[1] || "-"); 
            const splitVal = doc.splitTextToSize(val, width - 62); 
            doc.text(splitVal, x + 58, rowY); 
            rowY += (splitVal.length * 9) + 1.5; 
        });
    }
}