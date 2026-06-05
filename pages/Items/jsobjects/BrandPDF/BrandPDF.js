export default {

  /* ── Entry point ── */
  async generate() {
    try {
      /* 1. Guard: library */
      if (typeof jspdf === "undefined") throw new Error("jsPDF library not loaded. Add it in App Settings → External Libraries.");
      const jsPDFConstructor = jspdf.jsPDF || jspdf;
      const doc = new jsPDFConstructor("p", "pt", "a4");

      /* 2. Guard: data */
      const raw = Brand_History.data;
      if (!raw || !raw.brand) throw new Error("Brand_History.data is empty or missing.");

      const brand   = raw.brand;
      const sv      = raw.stock_valuation || {};
      const summary = raw.summary || {};
      const gross   = summary.gross || {};
      const net     = summary.net   || {};
      const margins = summary.margins || {};
      const monthly = (raw.monthly_trends || []).filter(m => m.sales > 0 || m.purchase > 0);
      const txs     = raw.transactions || [];

      /* ── Layout constants ── */
      const PW   = doc.internal.pageSize.width;   // 595
      const PH   = doc.internal.pageSize.height;  // 842
      const ML   = 28;   // margin left
      const MR   = 28;   // margin right
      const CW   = PW - ML - MR;  // content width
      const HEADER_H = 115;  // reserved height for recurring header

      /* ── Colour palette ── */
      const C = {
        black:      [0,   0,   0  ],
        white:      [255, 255, 255],
        darkBg:     [20,  30,  48 ],   // deep navy  — header bar
        accentGreen:[22,  163, 74 ],   // green       — net sales
        accentBlue: [37,  99,  235],   // blue        — purchases
        accentAmber:[217, 119, 6  ],   // amber       — margin
        accentRed:  [220, 38,  38 ],   // red         — returns
        lightGray:  [245, 247, 250],   // row fill
        midGray:    [100, 116, 139],   // sub-text
        borderGray: [203, 213, 225],   // table borders
        kpiGreen:   [220, 252, 231],   // KPI green bg
        kpiBlue:    [219, 234, 254],   // KPI blue bg
        kpiAmber:   [254, 243, 199],   // KPI amber bg
        kpiRed:     [254, 226, 226],   // KPI red bg
        kpiGray:    [241, 245, 249],   // KPI neutral bg
      };

      /* ── Helpers ── */
      const setFont = (style, size, color) => {
        doc.setFont("helvetica", style);
        doc.setFontSize(size);
        if (color) doc.setTextColor(...color);
      };
      const setFill  = (rgb) => doc.setFillColor(...rgb);
      const setDraw  = (rgb) => doc.setDrawColor(...rgb);
      const fmt  = v => "Rs." + Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const fmtN = v => Number(v).toLocaleString("en-IN");
      const pct  = v => String(v);

      /* ================================================================
         RECURRING PAGE HEADER
         ================================================================ */
      const drawPageHeader = (pageNum, totalPages) => {
        /* Dark navy bar */
        setFill(C.darkBg);
        doc.rect(0, 0, PW, 52, "F");

        /* Brand name */
        setFont("bold", 20, C.white);
        doc.text(brand.name.toUpperCase() + " — BRAND HISTORY REPORT", ML, 33);

        /* Code badge */
        setFill([37, 99, 235]);
        doc.roundedRect(PW - MR - 60, 12, 55, 22, 4, 4, "F");
        setFont("bold", 10, C.white);
        doc.text(brand.code.trim(), PW - MR - 32, 27, { align: "center" });

        /* Sub bar */
        setFill([30, 41, 59]);
        doc.rect(0, 52, PW, 22, "F");
        setFont("normal", 8, [148, 163, 184]);
        doc.text("Generated: " + new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), ML, 66);
        doc.text("Status: " + (brand.is_active ? "ACTIVE" : "INACTIVE"), ML + 140, 66);
        doc.text(`Page ${pageNum} of ${totalPages}`, PW - MR, 66, { align: "right" });

        return 82; // Y after header
      };

      /* ================================================================
         PAGE 1 — KPI CARDS + SUMMARY TABLE + MONTHLY TRENDS
         ================================================================ */
      let Y = drawPageHeader(1, 1); // totalPages placeholder, will fix later

      /* ── Section label ── */
      const drawSectionLabel = (y, label) => {
        setFont("bold", 9, C.midGray);
        doc.text(label.toUpperCase(), ML, y);
        setDraw(C.borderGray);
        doc.setLineWidth(0.5);
        doc.line(ML + doc.getTextWidth(label.toUpperCase()) + 6, y - 3, PW - MR, y - 3);
        return y + 10;
      };

      Y = drawSectionLabel(Y + 8, "Key Performance Indicators");

      /* ── KPI Cards (2 rows × 3 cards) ── */
      const kpis = [
        { label: "Net Sales",       val: fmt(net.sales?.amount   || 0), sub: fmtN(net.sales?.qty   || 0) + " units",      bg: C.kpiGreen,  accent: C.accentGreen },
        { label: "Net Purchases",   val: fmt(net.purchases?.amount || 0), sub: fmtN(net.purchases?.qty || 0) + " units",  bg: C.kpiBlue,   accent: C.accentBlue  },
        { label: "Gross Margin",    val: pct(margins.gross_margin_pct || "0%"), sub: "Net: " + pct(margins.net_realized_margin_pct || "0%"), bg: C.kpiAmber, accent: C.accentAmber },
        { label: "Sales Returns",   val: fmt(gross.sales_returns?.amount || 0), sub: fmtN(gross.sales_returns?.qty || 0) + " units",  bg: C.kpiRed,    accent: C.accentRed   },
        { label: "Stock Value",     val: fmt(sv.valuation || 0),         sub: fmtN(sv.qty || 0) + " units on hand",       bg: C.kpiGray,   accent: C.midGray     },
        { label: "Return Rate",     val: (((gross.sales_returns?.qty || 0) / (gross.sales?.qty || 1)) * 100).toFixed(2) + "%", sub: "of gross sales qty", bg: C.kpiRed, accent: C.accentRed },
      ];

      const CARD_COLS = 3;
      const CARD_W = (CW - 10 * (CARD_COLS - 1)) / CARD_COLS;
      const CARD_H  = 52;
      const CARD_GAP = 10;

      kpis.forEach((k, i) => {
        const col = i % CARD_COLS;
        const row = Math.floor(i / CARD_COLS);
        const cx  = ML + col * (CARD_W + CARD_GAP);
        const cy  = Y + row * (CARD_H + CARD_GAP);

        // Card bg
        setFill(k.bg);
        setDraw(C.borderGray);
        doc.setLineWidth(0.5);
        doc.roundedRect(cx, cy, CARD_W, CARD_H, 5, 5, "FD");

        // Left accent strip
        setFill(k.accent);
        doc.roundedRect(cx, cy, 4, CARD_H, 2, 2, "F");

        // Label
        setFont("normal", 7.5, C.midGray);
        doc.text(k.label.toUpperCase(), cx + 10, cy + 14);

        // Value
        setFont("bold", 13, k.accent);
        doc.text(k.val, cx + 10, cy + 32);

        // Sub
        setFont("normal", 7, C.midGray);
        doc.text(k.sub, cx + 10, cy + 45);
      });

      Y = Y + 2 * (CARD_H + CARD_GAP) + 14;

      /* ── Summary breakdown table ── */
      Y = drawSectionLabel(Y, "Sales & Purchase Summary");

      doc.autoTable({
        startY: Y,
        margin: { left: ML, right: MR },
        head: [["METRIC", "GROSS SALES", "GROSS PURCHASES", "SALES RETURNS", "PURCH. RETURNS", "NET SALES", "NET PURCHASES"]],
        body: [
          [
            "QUANTITY",
            fmtN(gross.sales?.qty || 0),
            fmtN(gross.purchases?.qty || 0),
            fmtN(gross.sales_returns?.qty || 0),
            fmtN(gross.purchase_returns?.qty || 0),
            fmtN(net.sales?.qty || 0),
            fmtN(net.purchases?.qty || 0),
          ],
          [
            "TAXABLE (Rs.)",
            fmtN((gross.sales?.taxable || 0).toFixed(2)),
            fmtN((gross.purchases?.taxable || 0).toFixed(2)),
            fmtN((gross.sales_returns?.taxable || 0).toFixed(2)),
            "—",
            fmtN((net.sales?.taxable || 0).toFixed(2)),
            "—",
          ],
          [
            "TAX (Rs.)",
            fmtN((gross.sales?.tax || 0).toFixed(2)),
            fmtN((gross.purchases?.tax || 0).toFixed(2)),
            fmtN((gross.sales_returns?.tax || 0).toFixed(2)),
            "—",
            "—",
            "—",
          ],
          [
            "AMOUNT (Rs.)",
            fmtN((gross.sales?.amount || 0).toFixed(2)),
            fmtN((gross.purchases?.amount || 0).toFixed(2)),
            fmtN((gross.sales_returns?.amount || 0).toFixed(2)),
            fmtN((gross.purchase_returns?.amount || 0).toFixed(2)),
            fmtN((net.sales?.amount || 0).toFixed(2)),
            fmtN((net.purchases?.amount || 0).toFixed(2)),
          ],
        ],
        theme: "grid",
        styles: { fontSize: 7.5, cellPadding: 4, lineColor: C.borderGray, lineWidth: 0.4, textColor: C.black, valign: "middle" },
        headStyles: { fillColor: C.darkBg, textColor: C.white, fontStyle: "bold", fontSize: 7, halign: "center" },
        columnStyles: {
          0: { fontStyle: "bold", fillColor: C.lightGray, cellWidth: 70 },
          1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" },
          4: { halign: "right" }, 5: { halign: "right", fontStyle: "bold" }, 6: { halign: "right", fontStyle: "bold" }
        },
        alternateRowStyles: { fillColor: C.white },
      });

      Y = doc.lastAutoTable.finalY + 16;

      /* ── Margin highlights row ── */
      Y = drawSectionLabel(Y, "Margin Analysis");

      const marginItems = [
        { label: "Avg. Sales Rate",    val: "Rs." + margins.average_sales_rate,    color: C.accentBlue  },
        { label: "Avg. Purchase Rate", val: "Rs." + margins.average_purchase_rate, color: C.accentAmber },
        { label: "Gross Margin %",     val: pct(margins.gross_margin_pct),          color: C.accentGreen },
        { label: "Net Margin %",       val: pct(margins.net_realized_margin_pct),   color: C.accentGreen },
      ];

      const MI_W = (CW - 3 * 8) / 4;
      marginItems.forEach((m, i) => {
        const mx = ML + i * (MI_W + 8);
        setFill(C.lightGray);
        setDraw(C.borderGray);
        doc.setLineWidth(0.4);
        doc.roundedRect(mx, Y, MI_W, 36, 4, 4, "FD");
        setFont("normal", 7, C.midGray);
        doc.text(m.label, mx + MI_W / 2, Y + 13, { align: "center" });
        setFont("bold", 12, m.color);
        doc.text(m.val, mx + MI_W / 2, Y + 28, { align: "center" });
      });

      Y += 50;

      /* ── Monthly Trends table ── */
      Y = drawSectionLabel(Y, "Monthly Trends (Active Months)");

      if (monthly.length > 0) {
        doc.autoTable({
          startY: Y,
          margin: { left: ML, right: MR },
          head: [["MONTH", "SALES (Rs.)", "PURCHASES (Rs.)", "SALES RET. (Rs.)", "PURCH. RET. (Rs.)", "NET MOVEMENT (Rs.)"]],
          body: monthly.map(m => [
            m.month,
            fmtN(m.sales.toFixed(2)),
            fmtN(m.purchase.toFixed(2)),
            fmtN(m.sales_return.toFixed(2)),
            fmtN(m.purchase_return.toFixed(2)),
            { content: fmtN(m.net_movement.toFixed(2)), styles: { textColor: m.net_movement >= 0 ? C.accentGreen : C.accentRed, fontStyle: "bold" } }
          ]),
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 4, lineColor: C.borderGray, lineWidth: 0.4, textColor: C.black },
          headStyles: { fillColor: C.darkBg, textColor: C.white, fontStyle: "bold", fontSize: 7.5, halign: "center" },
          columnStyles: {
            0: { fontStyle: "bold" },
            1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right", textColor: C.accentRed },
            4: { halign: "right", textColor: C.accentAmber }, 5: { halign: "right" },
          },
          alternateRowStyles: { fillColor: C.lightGray },
          foot: [[
            { content: "TOTAL", styles: { fontStyle: "bold" } },
            { content: fmtN(monthly.reduce((a, m) => a + m.sales, 0).toFixed(2)), styles: { halign: "right", fontStyle: "bold" } },
            { content: fmtN(monthly.reduce((a, m) => a + m.purchase, 0).toFixed(2)), styles: { halign: "right", fontStyle: "bold" } },
            { content: fmtN(monthly.reduce((a, m) => a + m.sales_return, 0).toFixed(2)), styles: { halign: "right", fontStyle: "bold", textColor: C.accentRed } },
            { content: fmtN(monthly.reduce((a, m) => a + m.purchase_return, 0).toFixed(2)), styles: { halign: "right", fontStyle: "bold", textColor: C.accentAmber } },
            { content: fmtN(monthly.reduce((a, m) => a + m.net_movement, 0).toFixed(2)), styles: { halign: "right", fontStyle: "bold", textColor: C.accentGreen } },
          ]],
          footStyles: { fillColor: [20, 30, 48], textColor: C.white, fontSize: 8 },
        });
        Y = doc.lastAutoTable.finalY + 16;
      }

      /* ================================================================
         PAGE 2+ — TRANSACTION LEDGER
         ================================================================ */
      doc.addPage();
      let headerY2 = drawPageHeader(2, 2);
      Y = headerY2;

      Y = drawSectionLabel(Y + 4, "Transaction Ledger (" + txs.length + " records)");

      /* Group totals for footer */
      const salesTxs    = txs.filter(t => t.trans_type === "Sale");
      const purchTxs    = txs.filter(t => t.trans_type === "Purchase");
      const srTxs       = txs.filter(t => t.trans_type === "Sales Return");
      const prTxs       = txs.filter(t => t.trans_type === "Purchase Return");
      const sumAmt      = arr => arr.reduce((a, t) => a + Number(t.total_amount || 0), 0);
      const sumQty      = arr => arr.reduce((a, t) => a + Number(t.qty || 0), 0);

      /* Transaction type color coding */
      const txColor = (type) => {
        if (type === "Sale")            return C.accentGreen;
        if (type === "Purchase")        return C.accentBlue;
        if (type === "Sales Return")    return C.accentRed;
        if (type === "Purchase Return") return C.accentAmber;
        return C.black;
      };
      const txShort = (type) => {
        if (type === "Sales Return")    return "SR";
        if (type === "Purchase Return") return "PR";
        return type;
      };

      doc.autoTable({
        startY: Y,
        margin: { left: ML, right: MR, top: HEADER_H + 20, bottom: 30 },
        head: [["DATE", "TYPE", "DOCUMENT", "PRODUCT", "PARTY", "QTY", "RATE (Rs.)", "TAX (Rs.)", "AMOUNT (Rs.)"]],
        body: txs.map(t => [
          t.trans_date ? t.trans_date.slice(5) : "-",
          { content: txShort(t.trans_type), styles: { textColor: txColor(t.trans_type), fontStyle: "bold" } },
          t.document_number || "-",
          (t.product_name || "").replace("TH ", "").replace("RG ", "").replace(" SYRUP", "").replace(" OIL", ""),
          t.party_name || "-",
          { content: fmtN(t.qty), styles: { halign: "right" } },
          { content: Number(t.rate || 0).toFixed(2), styles: { halign: "right" } },
          { content: Number(t.tax  || 0).toFixed(2), styles: { halign: "right" } },
          { content: Number(t.total_amount || 0).toFixed(2), styles: { halign: "right", fontStyle: "bold" } },
        ]),
        didDrawPage: (data) => {
          // Re-draw header on every new page the table creates
          if (data.pageNumber > 1) {
            drawPageHeader(data.pageNumber + 1, data.pageNumber + 1);
          }
        },
        theme: "grid",
        styles: { fontSize: 7.5, cellPadding: 3.5, lineColor: C.borderGray, lineWidth: 0.4, textColor: C.black, overflow: "linebreak" },
        headStyles: { fillColor: C.darkBg, textColor: C.white, fontStyle: "bold", fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 38 },
          1: { cellWidth: 32 },
          2: { cellWidth: 68 },
          3: { cellWidth: "auto", minCellWidth: 80 },
          4: { cellWidth: "auto", minCellWidth: 80 },
          5: { cellWidth: 28, halign: "right" },
          6: { cellWidth: 42, halign: "right" },
          7: { cellWidth: 42, halign: "right" },
          8: { cellWidth: 50, halign: "right" },
        },
        alternateRowStyles: { fillColor: C.lightGray },
        foot: [
          [
            { content: "TOTALS", colSpan: 5, styles: { fontStyle: "bold", halign: "right" } },
            { content: fmtN(sumQty(txs)), styles: { halign: "right", fontStyle: "bold" } },
            { content: "—", styles: { halign: "right" } },
            { content: fmtN(txs.reduce((a, t) => a + Number(t.tax || 0), 0).toFixed(2)), styles: { halign: "right", fontStyle: "bold" } },
            { content: fmtN(sumAmt(txs).toFixed(2)), styles: { halign: "right", fontStyle: "bold" } },
          ]
        ],
        footStyles: { fillColor: C.darkBg, textColor: C.white, fontSize: 8 },
      });

      /* ================================================================
         PAGE — ANALYTICS SUMMARY (Product & Party breakdown)
         ================================================================ */
      doc.addPage();
      drawPageHeader(doc.internal.getNumberOfPages(), doc.internal.getNumberOfPages());
      Y = 90;

      /* Top products by sales qty */
      const salesOnly = txs.filter(t => t.trans_type === "Sale");
      const prodQty = {};
      const prodAmt = {};
      salesOnly.forEach(t => {
        prodQty[t.product_name] = (prodQty[t.product_name] || 0) + Number(t.qty);
        prodAmt[t.product_name] = (prodAmt[t.product_name] || 0) + Number(t.total_amount || 0);
      });
      const topProds = Object.entries(prodQty)
        .sort((a, b) => b[1] - a[1])
        .map(([name, qty]) => [
          name.replace("TH ", "").replace("RG ", "").replace(" SYRUP", "").replace(" OIL", ""),
          fmtN(qty),
          fmtN((prodAmt[name] || 0).toFixed(2)),
          { content: ((qty / sumQty(salesOnly)) * 100).toFixed(1) + "%", styles: { halign: "center" } }
        ]);

      Y = drawSectionLabel(Y, "Product Sales Analysis");
      doc.autoTable({
        startY: Y,
        margin: { left: ML, right: MR },
        head: [["PRODUCT NAME", "TOTAL QTY SOLD", "TOTAL AMOUNT (Rs.)", "QTY SHARE %"]],
        body: topProds,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 4, lineColor: C.borderGray, lineWidth: 0.4, textColor: C.black },
        headStyles: { fillColor: C.darkBg, textColor: C.white, fontStyle: "bold", fontSize: 7.5 },
        columnStyles: {
          0: { fontStyle: "bold" },
          1: { halign: "right" },
          2: { halign: "right" },
          3: { halign: "center" }
        },
        alternateRowStyles: { fillColor: C.lightGray },
        foot: [[
          { content: "TOTAL SALES", styles: { fontStyle: "bold", halign: "right" } },
          { content: fmtN(sumQty(salesOnly)), styles: { fontStyle: "bold", halign: "right" } },
          { content: fmtN(sumAmt(salesOnly).toFixed(2)), styles: { fontStyle: "bold", halign: "right" } },
          { content: "100%", styles: { fontStyle: "bold", halign: "center" } }
        ]],
        footStyles: { fillColor: C.darkBg, textColor: C.white, fontSize: 8 },
      });
      Y = doc.lastAutoTable.finalY + 18;

      /* Top customers */
      const custAmt = {};
      const custQty = {};
      salesOnly.forEach(t => {
        custAmt[t.party_name] = (custAmt[t.party_name] || 0) + Number(t.total_amount || 0);
        custQty[t.party_name] = (custQty[t.party_name] || 0) + Number(t.qty);
      });
      const topCust = Object.entries(custAmt)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([name, amt], i) => [
          i + 1,
          name,
          fmtN(custQty[name] || 0),
          fmtN(amt.toFixed(2)),
          { content: ((amt / sumAmt(salesOnly)) * 100).toFixed(1) + "%", styles: { halign: "center" } }
        ]);

      Y = drawSectionLabel(Y, "Top 20 Customers by Sales Amount");
      doc.autoTable({
        startY: Y,
        margin: { left: ML, right: MR },
        head: [["RANK", "PARTY NAME", "TOTAL QTY", "TOTAL AMOUNT (Rs.)", "AMT SHARE %"]],
        body: topCust,
        theme: "grid",
        styles: { fontSize: 7.5, cellPadding: 3.5, lineColor: C.borderGray, lineWidth: 0.4, textColor: C.black },
        headStyles: { fillColor: C.darkBg, textColor: C.white, fontStyle: "bold", fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 30, halign: "center", fontStyle: "bold" },
          1: { fontStyle: "bold" },
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "center" }
        },
        alternateRowStyles: { fillColor: C.lightGray },
      });
      Y = doc.lastAutoTable.finalY + 18;

      /* Return analysis */
      if (srTxs.length > 0) {
        const retProdQty = {};
        srTxs.forEach(t => { retProdQty[t.product_name] = (retProdQty[t.product_name] || 0) + Number(t.qty); });
        const retTable = Object.entries(retProdQty).sort((a, b) => b[1] - a[1]).map(([name, qty]) => [
          name.replace("TH ", "").replace("RG ", "").replace(" SYRUP", "").replace(" OIL", ""),
          fmtN(qty),
          fmtN((prodQty[name] || 0)),
          { content: (((qty) / (prodQty[name] || 1)) * 100).toFixed(1) + "%", styles: { textColor: C.accentRed, fontStyle: "bold", halign: "center" } }
        ]);

        // Check if we need a new page
        if (Y + retTable.length * 18 + 60 > PH - 40) {
          doc.addPage();
          drawPageHeader(doc.internal.getNumberOfPages(), doc.internal.getNumberOfPages());
          Y = 90;
        }

        Y = drawSectionLabel(Y, "Sales Return Rate by Product");
        doc.autoTable({
          startY: Y,
          margin: { left: ML, right: MR },
          head: [["PRODUCT NAME", "RETURNED QTY", "SOLD QTY", "RETURN RATE %"]],
          body: retTable,
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 4, lineColor: C.borderGray, lineWidth: 0.4, textColor: C.black },
          headStyles: { fillColor: [127, 29, 29], textColor: C.white, fontStyle: "bold", fontSize: 7.5 },
          columnStyles: {
            0: { fontStyle: "bold" },
            1: { halign: "right" },
            2: { halign: "right" },
            3: { halign: "center" }
          },
          alternateRowStyles: { fillColor: [255, 241, 241] },
        });
        Y = doc.lastAutoTable.finalY + 18;
      }

      /* ================================================================
         FOOTER on every page — brand watermark text
         ================================================================ */
      const totalPagesNow = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPagesNow; i++) {
        doc.setPage(i);
        setFont("normal", 7, C.midGray);
        doc.text(`${brand.name} — Confidential Brand Report  |  Page ${i} of ${totalPagesNow}`, PW / 2, PH - 12, { align: "center" });
        setDraw(C.borderGray);
        doc.setLineWidth(0.4);
        doc.line(ML, PH - 20, PW - MR, PH - 20);

        // Fix page numbers in header (re-write page info)
        setFill(C.darkBg); // cover old text
        doc.rect(PW - MR - 80, 56, 80, 14, "F");
        setFont("normal", 8, [148, 163, 184]);
        doc.text(`Page ${i} of ${totalPagesNow}`, PW - MR, 66, { align: "right" });
      }

      /* ── Download ── */
      const fileName = `${brand.name.replace(/\s+/g, "_")}_Brand_History_${new Date().toISOString().slice(0, 10)}.pdf`;
      download(doc.output("dataurlstring"), fileName, "application/pdf");
      showAlert(`✅ ${brand.name} — Brand History PDF downloaded!`, "success");

    } catch (err) {
      showAlert("PDF Error: " + err.message, "error");
      console.error(err);
    }
  }
};