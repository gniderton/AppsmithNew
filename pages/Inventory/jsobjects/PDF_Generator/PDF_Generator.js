export default {
    previewPO: async (apiResponse) => {
        try {
            if (!apiResponse || !apiResponse.header) throw new Error("No PO data found.");
            
            const poHeader = apiResponse.header;
            const poLines = apiResponse.lines || [];
            
            // Safe fallback brand check
            const brand = (typeof Global_Assets !== 'undefined' && Global_Assets.branding) ? Global_Assets.branding : {
                regt_name: "Gniderton Private Limited",
                address: "-",
                pin: "-",
                gst: "-",
                logo: "",
								contact_no: "-",
								email: "-",
								District: "-"
            };

            const { jsPDF } = jspdf;
            const doc = new jsPDF('l', 'pt', 'a4'); // Landscape A4 for wide table
            const margin = 20;
            const pageWidth = doc.internal.pageSize.width;

            // --- 1. HEADER SECTION ---
            try {
                if (brand.logo && brand.logo.startsWith("data:image/")) {
                    doc.addImage(brand.logo, 'PNG', margin, margin, 120, 45);
                } else {
                    throw new Error("No valid logo");
                }
            } catch(e) {
                doc.setDrawColor(0);
                doc.setLineWidth(0.5);
                doc.rect(margin, margin, 120, 45); 
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                // Safely coercing brand.regt_name to String
                doc.text(String(brand.regt_name || "Gniderton"), margin + 60, margin + 25, { align: "center" });
                doc.setFontSize(6);
                doc.text("BRIDGING BUSINESSES", margin + 60, margin + 35, { align: "center" });
            }
            
            // Title & PO Subtitle
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.text("PURCHASE ORDER", pageWidth / 2, margin + 15, { align: "center" });
            doc.setFontSize(8);
            doc.text(String(poHeader.po_number || "-"), pageWidth / 2, margin + 30, { align: "center" });

            // Metadata Box (Right Side)
            const metaWidth = 125, metaX = pageWidth - margin - metaWidth;
            doc.setDrawColor(0);
            doc.rect(metaX, margin, metaWidth, 45);
            doc.setFontSize(7);
            doc.text("PO NUMBER", metaX + 5, margin + 18);
            doc.text("DATE", metaX + 5, margin + 33);
            doc.setFont("helvetica", "normal");
            doc.text(String(poHeader.po_number || "-"), metaX + 65, margin + 18);
            doc.text(String(moment(poHeader.po_date).format("DD/MM/YYYY")), metaX + 65, margin + 33);

            // --- 2. REGISTRATION & VENDOR BLOCKS ---
            const gridY = margin + 55, colWidth = (pageWidth - (margin * 2)) / 2;

            this._drawDetailedBox(doc, margin, gridY, colWidth, [
                ["REGT NAME", String(brand.regt_name || "-")],
                ["ADD", String(brand.address || "-")],
								["District", String(brand.District)],
                ["PIN", String(brand.pin || "-")],
                ["GST", String(brand.gst || "-")],
								["Contact No",String("919567987408")],
								["email", String("office@gniderton.com")]
            ]);

            this._drawDetailedBox(doc, margin + colWidth, gridY, colWidth, [
                ["Vendor", String(poHeader.vendor_name || "-")],
								["Code", String(poHeader.vendor_code || "-")],
								["ADD", String(poHeader.vendor_address || "-")],
								["Pin Code", String(poHeader.vendor_pin_code || "-")],
                ["GST", String(poHeader.vendor_gst || "-")],
								["Contact No", String(poHeader.contact_no || "-")],
								["Remarks", String(poHeader.remarks || "_")]
                
            ]);

            // --- 3. SUMMARY BAR (GREEN) ---
            const summaryY = gridY + 85;
            doc.setFillColor(34, 139, 34);
            doc.rect(margin, summaryY, pageWidth - (margin * 2), 20, 'F');
            doc.setTextColor(255);
            doc.setFontSize(9);
            doc.text(String(poLines.length), margin + 10, summaryY + 14);
            doc.text(`${Number(poHeader.total_qty || 0).toLocaleString()} EA`, pageWidth / 2, summaryY + 14, { align: "center" });
            doc.text(`${Number(poHeader.total_net || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - margin - 10, summaryY + 14, { align: "right" });

            // --- 4. THE DATA TABLE WITH ALL DERIVED CALCULATIONS ---
            doc.autoTable({
                startY: summaryY + 25,
                margin: { left: margin, right: margin },
                head: [["S.No", "EAN CODE", "PROD CODE", "ITEM NAME", "MRP", "QTY", "PRICE", "GROSS $", "SCH $", "DISC %", "DISC $", "TAXABLE $", "GST %", "GST $", "NET $"]],
                body: poLines.map((row, index) => {
                    const qty = Number(row.ordered_qty || 0);
                    const rate = Number(row.rate || 0);
                    const schemeAmt = Number(row.scheme_amount || 0);
                    const discPct = Number(row.discount_percent || 0);
                    
                    const gross = qty * rate;
                    const valForDisc = Math.max(0, gross - schemeAmt);
                    const derivedDiscAmt = valForDisc * (discPct / 100);
                    const derivedTaxable = Math.max(0, gross - schemeAmt - derivedDiscAmt);

                    return [
                        index + 1,
                        row.ean_code || "-",
                        row.product_code || "-",
                        row.product_name || "Item",
                        Number(row.product_mrp || row.mrp || 0).toFixed(2),
                        qty.toFixed(0),
                        rate.toFixed(2),
                        gross.toFixed(2),
                        schemeAmt.toFixed(2),
                        discPct + "%",
                        derivedDiscAmt.toFixed(2),
                        derivedTaxable.toFixed(2),
                        row.tax_percent + "%",
                        Number(row.tax_amount || 0).toFixed(2),
                        Number(row.amount || 0).toFixed(2)
                    ];
                }),
                theme: 'grid',
                styles: { fontSize: 6, cellPadding: 2, lineWidth: 0.1 },
                headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
                columnStyles: { 
                    0: { cellWidth: 20 }, 1: { cellWidth: 40 }, 2: { cellWidth: 50 }, 3: { cellWidth: 'auto' }, 
                    4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 
                    7: { halign: 'right' }, 8: { halign: 'right' }, 9: { halign: 'right' }, 
                    10: { halign: 'right' }, 11: { halign: 'right' }, 12: { halign: 'center' }, 
                    13: { halign: 'right' }, 14: { halign: 'right' }
                }
            });

            // --- 5. PREVIEW TRIGGER ---
            const base64String = doc.output('dataurlstring');
            storeValue('currentPDF', base64String);
            storeValue('currentPDFName', String(poHeader.po_number || "PO") + ".pdf");
            showModal('modalPDFPreview');

        } catch (error) {
            showAlert("PDF Logic Error: " + error.message, "error");
        }
    },

    _drawDetailedBox: (doc, x, y, width, rows) => {
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.rect(x, y, width, 80);
        let rowY = y + 12;
        rows.forEach(r => {
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.5);
            doc.text(String(r[0]) + ": ", x + 5, rowY);
            doc.setFont("helvetica", "normal");
            // Safer slicing implementation
            let val = String(r[1] || "-");
            if (val.length > 45) val = val.substring(0, 42) + "...";
            doc.text(val, x + 60, rowY);
            rowY += 11;
        });
    }
}