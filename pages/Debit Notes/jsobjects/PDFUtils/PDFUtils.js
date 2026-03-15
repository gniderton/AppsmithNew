export default {
    previewDebitNote: async (dnHeader) => {
        try {
            if (!dnHeader || !dnHeader.id) throw new Error("No Debit Note data selected.");
            
            // 1. Prepare Data
            const dnLines = getDebitNoteLines.data || [];
            const summaryData = this.getDNTaxSummary(dnLines);
            const grandTotal = Number(dnHeader.amount || 0);

            const brand = Global_Assets.getSummary();

            const { jsPDF } = jspdf;
            const doc = new jsPDF('p', 'pt', 'a4'); // Portrait
            const margin = 12; 
            const pageWidth = doc.internal.pageSize.width;

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

            // --- HELPER: DRAW RECURRING HEADER ---
            const drawMainHeader = (currentPage, totalPages) => {
                const headerY = margin;
                
                // 1. Logo
                try {
                    const logo = Global_Assets.getLogo();
                    if (logo.startsWith("data:image/")) {
                        doc.addImage(logo, 'PNG', margin, headerY, 90, 30);
                    }
                } catch(e) {}

                // Center: Dynamic Title
                doc.setTextColor(0, 0, 0); 
                doc.setFont("helvetica", "bold");
                doc.setFontSize(16);
                const title = (dnHeader.note_type || "DEBIT NOTE").toUpperCase();
                doc.text(title, pageWidth / 2, headerY + 15, { align: "center" });
                doc.setFontSize(11);
                doc.text(String(dnHeader.debit_note_number), pageWidth / 2, headerY + 30, { align: "center" });

                // THREE SEPARATE BOXES
                const boxesY = headerY + 40;
                const gap = 8;
                const boxWidth = (pageWidth - (margin * 2) - (gap * 2)) / 3;
                const boxHeight = 85; // Increased to fit all rows

                // Box 1: Metadata
                this._drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
                    ["DN NUMBER", String(dnHeader.debit_note_number)],
                    ["DATE", moment(dnHeader.debit_note_date).format("DD/MM/YYYY")],
                    ["LINKED INV", String(dnHeader.linked_invoice_number || "-")],
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

                // Box 3: Vendor Details
                const vArr = [
                    dnHeader.vendor_address,
                    dnHeader.vendor_city,
                    dnHeader.vendor_district,
                    dnHeader.vendor_pin ? "PIN: " + dnHeader.vendor_pin : null
                ].filter(Boolean).join(", ");

                this._drawSimpleBox(doc, margin + (boxWidth * 2) + (gap * 2), boxesY, boxWidth, boxHeight, [
                    ["Vendor", String(dnHeader.vendor_name)],
                    ["Address", vArr || "-"],
                    ["GST", String(dnHeader.vendor_gst || "-")],
                    ["Contact", String(dnHeader.vendor_contact || "-")],
                    ["Email", String(dnHeader.vendor_email || "-")]
                ]);

                return boxesY + boxHeight; 
            };

            // --- 2. ITEMS TABLE (16 COLUMNS WITH WRAPPING) ---
            doc.autoTable({
                startY: margin + 40 + 85 + 10,
                margin: { left: margin, right: margin, top: margin + 140 },
                head: [["S.N", "ITEM NAME", "CODE\nEAN", "HSN", "BATCH\nEXPIRY", "MRP", "QTY", "PRICE", "GROSS", "SCH", "D%", "D.AMT", "TXBL", "GST%", "GST$", "NET$"]],
                body: dnLines.map((row, index) => {
                    const expiryStr = row['Expiry'] ? moment(row['Expiry']).format("MM/YY") : "-";
                    return [
                        index + 1, 
                        row['Item Name'], 
                        `${row['product_code'] || ""}\n${row['EAN Code'] || ""}`, 
                        row['hsn_code'] || "-", 
                        `${row['Batch No'] || ""}\n${expiryStr}`,
                        Number(row['MRP'] || 0).toFixed(2), 
                        row['Qty'], 
                        Number(row['Price'] || 0).toFixed(2),
                        Number(row['Gross $'] || 0).toFixed(2), 
                        Number(row['Sch'] || 0).toFixed(2), 
                        row['Disc %'] + "%", 
                        Number(row['Disc. $'] || 0).toFixed(2),
                        Number(row['Taxable $'] || 0).toFixed(2), 
                        row['GST %'] + "%",
                        Number(row['GST $'] || 0).toFixed(2), 
                        Number(row['Net $'] || 0).toFixed(2)
                    ];
                }),
                didDrawPage: (data) => {
                    const totalPages = doc.internal.getNumberOfPages();
                    drawMainHeader(data.pageNumber, totalPages);
                },
                theme: 'grid',
                styles: { 
                    fontSize: 6, cellPadding: 2, 
                    lineColor: [0, 0, 0], lineWidth: 0.5,
                    textColor: [0, 0, 0] 
                },
                headStyles: { 
                    fillColor: [255, 255, 255], 
                    textColor: [0, 0, 0], 
                    fontStyle: 'bold',
                    lineWidth: 0.5 
                },
                columnStyles: { 
                    0: { cellWidth: 15 }, 1: { cellWidth: 'auto', minCellWidth: 80 },
                    2: { cellWidth: 40 }, 3: { cellWidth: 30 }, 4: { cellWidth: 40 },
                    5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' },
                    8: { halign: 'right' }, 9: { halign: 'right' }, 10: { halign: 'right' },
                    11: { halign: 'right' }, 12: { halign: 'right' }, 13: { halign: 'center' },
                    14: { halign: 'right' }, 15: { halign: 'right' }
                }
            });

            // --- 3. TAX SUMMARY ---
            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 8,
                margin: { left: margin },
                head: [["TAX SUMMARY", "PCS", "GROSS", "SCH", "DISC", "TAXABLE", "TAX", "NET"]],
                body: summaryData.map(row => [
                    row.PARTICULARS, row.Pcs, row.Gross.toFixed(2), row.Sch.toFixed(2),
                    row.Disc.toFixed(2), row.Taxable.toFixed(2), row.Tax.toFixed(2), row.Net.toFixed(2)
                ]),
                theme: 'grid',
                styles: { fontSize: 7.5, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0] },
                headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
                bodyStyles: (row) => (row.at(0) === 'Total' ? { fontStyle: 'bold', fillColor: [250, 250, 250] } : {})
            });

            // --- 4. AMOUNT IN WORDS ---
            const wordsY = doc.lastAutoTable.finalY + 20;
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Total Amount (in words):", margin, wordsY);
            doc.setFont("helvetica", "normal");
            doc.text(toWords(Math.round(grandTotal)), margin + 140, wordsY);

            // --- 5. FOOTER ---
            const notesY = wordsY + 20;
            doc.setFontSize(8.5);
            doc.text("This is a computer generated document and does not require a physical signature.", margin, notesY);

            // --- 6. DETACHABLE ACKNOWLEDGEMENT SLIP ---
            const pageHeight = doc.internal.pageSize.height;
            const slipY = pageHeight - 120; // Position near bottom
            
            doc.setLineDash([3, 3], 0); // Dotted line
            doc.line(margin, slipY, pageWidth - margin, slipY);
            doc.setLineDash([], 0); // Reset

            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("DETACHABLE ACKNOWLEDGEMENT SLIP", pageWidth / 2, slipY + 20, { align: "center" });
            
            const slipContentY = slipY + 40;
            doc.setFont("helvetica", "normal");
            doc.text(`Debit Note No: ${dnHeader.debit_note_number}`, margin, slipContentY);
            doc.text(`Date: ${moment(dnHeader.debit_note_date).format("DD/MM/YYYY")}`, margin + 180, slipContentY);
            doc.text(`Amount: ${Number(grandTotal).toFixed(2)}`, margin + 350, slipContentY);
            
            doc.text(`Vendor: ${dnHeader.vendor_name}`, margin, slipContentY + 15);
            doc.text(`Receiver's Signature: ___________________________`, margin + 310, slipContentY + 40);

            const base64String = doc.output('dataurlstring');
            storeValue('currentPDF', base64String);
            storeValue('currentPDFName', (dnHeader.debit_note_number || "DN") + ".pdf");
            showModal('modalPDFPreview');

        } catch (error) {
            showAlert("PDF Layout Error: " + error.message, "error");
        }
    },

    getDNTaxSummary: (lines) => {
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
                acc.Pcs     += curr.Pcs;
                acc.Gross   += curr.Gross;
                acc.Sch     += curr.Sch;
                acc.Disc    += curr.Disc;
                acc.Taxable += curr.Taxable;
                acc.Tax     += curr.Tax;
                acc.Net     += curr.Net;
                return acc;
            }, { PARTICULARS: 'Total', Pcs: 0, Gross: 0, Sch: 0, Disc: 0, Taxable: 0, Tax: 0, Net: 0 });
            resultRows.push(totalRow);
        }
        return resultRows;
    },

    _drawSimpleBox: (doc, x, y, width, height, rows) => {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.rect(x, y, width, height);
        let rowY = y + 11;
        rows.forEach(r => {
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            const label = String(r[0]) + ":";
            doc.text(label, x + 5, rowY);
            doc.setFont("helvetica", "normal");
            const val = String(r[1] || "-");
            const splitVal = doc.splitTextToSize(val, width - 62); 
            doc.text(splitVal, x + 58, rowY);
            rowY += (splitVal.length * 9) + 1.5; 
        });
    }
}
