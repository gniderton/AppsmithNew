export default {
  downloadPortalJson: async () => {
    const myGstin = "32AALCG2360H1ZT";
    const period = moment(datePicker.selectedDate).format('MMYYYY');
    
    await getGstr1.run();
    await getHsnSummary.run();
    
    const sales = getGstr1.data || [];
    const hsnData = getHsnSummary.data || [];

    const uqcMap = {
        "Pcs": "PCS-PIECES", "Nos": "NOS-NUMBERS", "Kg": "KGS-KILOGRAMS",
        "Box": "PAC-PACKS", "Boxs": "PAC-PACKS", "Set": "SET-SETS"
    };

    const b2bMap = {};
    const b2csMap = {};
    const cdnrMap = {};

    sales.forEach(r => {
        const date = moment(r.document_date).format('DD-MM-YYYY');
        const rate = Number(r.tax_rate || r.tax_percent || 0);
        const txval = Number(r.taxable_value || 0);
        const tax = Number(r.total_tax || r.gst_amount || 0);
        const cgst = Number((tax / 2).toFixed(2));
        const sgst = cgst;
        const totalVal = Number(r.total_value || 0);

        if (r.type === 'Sales' || r.type === 'Invoice' || r.type === 'Asset Sale') {
            if (r.party_gstin && r.party_gstin.length === 15) {
                if (!b2bMap[r.party_gstin]) {
                    b2bMap[r.party_gstin] = { ctin: r.party_gstin, inv: [] };
                }
                b2bMap[r.party_gstin].inv.push({
                    inum: r.document_no,
                    idt: date,
                    val: Number(totalVal.toFixed(2)),
                    pos: "32",
                    rchrg: "N",
                    sply_ty: "INTRA", // MANDATORY FOR PHASE 3
                    inv_typ: "R",
                    itms: [{
                        num: 1,
                        itm_det: { rt: rate, txval: Number(txval.toFixed(2)), camt: cgst, samt: sgst }
                    }]
                });
            } else {
                const key = `32_${rate}`;
                if (!b2csMap[key]) {
                    b2csMap[key] = { pos: "32", rt: rate, txval: 0, camt: 0, samt: 0, sply_ty: "INTRA", typ: "OE" };
                }
                b2csMap[key].txval += txval;
                b2csMap[key].camt += cgst;
                b2csMap[key].samt += sgst;
            }
        } else if (r.type === 'Credit Note' || r.type === 'Return') {
            if (r.party_gstin && r.party_gstin.length === 15) {
                if (!cdnrMap[r.party_gstin]) {
                    cdnrMap[r.party_gstin] = { ctin: r.party_gstin, nt: [] };
                }
                cdnrMap[r.party_gstin].nt.push({
                    ntty: "C",
                    nt_num: r.document_no,
                    nt_dt: date,
                    p_gst: "N",
                    val: Number(Math.abs(totalVal).toFixed(2)),
                    itms: [{
                        num: 1,
                        itm_det: { rt: rate, txval: Number(Math.abs(txval).toFixed(2)), camt: Math.abs(cgst), samt: Math.abs(sgst) }
                    }]
                });
            }
        }
    });

    // 4. Format HSN (Phase 3 Keys: hsn_code, taxable_val, cgst, sgst)
    const transformHsn = (data) => data
        .filter(h => Number(h.txval) > 0)
        .map((h, index) => ({
            num: index + 1,
            hsn_code: h.hsn_cd || h.hsn_sc, // NEW KEY NAME
            description: (h.desc || "GOODS").substring(0, 30), // NEW KEY NAME
            uqc: uqcMap[h.uqc] || "OTH-OTHERS",
            qty: Number(Number(h.qty || 0).toFixed(2)),
            val: Number(Number(h.val || 0).toFixed(2)),
            taxable_val: Number(Number(h.txval || 0).toFixed(2)), // NEW KEY NAME
            cgst: Number(Number(h.camt || 0).toFixed(2)), // NEW KEY NAME
            sgst: Number(Number(h.samt || 0).toFixed(2)), // NEW KEY NAME
            igst: 0.00,
            csamt: 0.00,
            rt: Number(h.rt || 0)
        }));

    const hsn_b2b = transformHsn(hsnData.filter(h => h.ctype === 'B2B'));
    const hsn_b2c = transformHsn(hsnData.filter(h => h.ctype === 'B2C'));

    // 5. Document Issue
    const invNumbers = sales.filter(s => s.type === 'Sales' || s.type === 'Invoice').map(s => s.document_no).filter(n => !!n).sort();
    const retNumbers = sales.filter(s => s.type === 'Credit Note' || s.type === 'Return').map(s => s.document_no).filter(n => !!n).sort();

    const doc_det = [];
    if (invNumbers.length > 0) {
        doc_det.push({
            doc_num: 1,
            docs: [{
                num: 1, from: invNumbers[0], to: invNumbers[invNumbers.length - 1],
                totnum: invNumbers.length, cancel: 0, net_issue: invNumbers.length
            }]
        });
    }
    if (retNumbers.length > 0) {
        doc_det.push({
            doc_num: 5,
            docs: [{
                num: 1, from: retNumbers[0], to: retNumbers[retNumbers.length - 1],
                totnum: retNumbers.length, cancel: 0, net_issue: retNumbers.length
            }]
        });
    }

    // 6. Final Payload (v4.1 / Phase 3 Certified)
    const payload = {
        gstin: myGstin,
        fp: period,
        version: "v4.1", // USE v4.1 WITH 'v'
        gt: 0.00,
        cur_gt: 0.00,
        b2b: Object.values(b2bMap),
        b2cs: Object.values(b2csMap).map(b => ({
            ...b,
            txval: Number(b.txval.toFixed(2)),
            camt: Number(b.camt.toFixed(2)),
            samt: Number(b.samt.toFixed(2))
        })),
        cdnr: Object.values(cdnrMap),
        hsn: {
            hsn_b2b: hsn_b2b,
            hsn_b2c: hsn_b2c
        },
        exp: [], nil: { inv: [] }, at: [], atadj: [], txpd: [], // MANDATORY TOP LEVEL
        doc_issue: { doc_det: doc_det }
    };

    download(JSON.stringify(payload), `GSTR1_PHASE3_FINAL_${period}.json`, "application/json");
  }
}
