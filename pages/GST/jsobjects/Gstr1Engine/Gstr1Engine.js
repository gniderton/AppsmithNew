export default {
  downloadPortalJson: () => {
    const myGstin = "32AALCG2360H1ZT";
    const period = moment(datePicker.selectedDate).format('MMYYYY');
    const sales = getGstr1.data || [];

    // 1. Group B2B
    const b2bMap = {};
    sales.filter(r => r.party_gstin && r.type === 'Sales').forEach(r => {
        if (!b2bMap[r.party_gstin]) b2bMap[r.party_gstin] = { ctin: r.party_gstin, inv: [] };
        
        // Find if this invoice already exists for this customer
        let inv = b2bMap[r.party_gstin].inv.find(i => i.inum === r.document_no);
        if (!inv) {
            inv = {
                inum: r.document_no,
                idt: moment(r.document_date).format('DD-MM-YYYY'),
                val: Number(r.total_value), // Note: total_value here is per rate slice, grouping will happen at portal
                pos: "32", rchrg: "N", inv_typ: "R", itms: []
            };
            b2bMap[r.party_gstin].inv.push(inv);
        }
        
        inv.itms.push({
            num: inv.itms.length + 1,
            itm_det: {
                rt: Number(r.tax_rate),
                txval: Number(r.taxable_value),
                camt: Number(r.total_tax)/2,
                samt: Number(r.total_tax)/2
            }
        });
    });

    // 2. Group B2CS (Summarized by Rate)
    const b2csMap = {};
    sales.filter(r => !r.party_gstin && r.type === 'Sales').forEach(r => {
        const rate = Number(r.tax_rate);
        const key = `32_${rate}`;
        if (!b2csMap[key]) b2csMap[key] = { pos: "32", rt: rate, txval: 0, camt: 0, samt: 0, typ: "OE" };
        b2csMap[key].txval += Number(r.taxable_value);
        b2csMap[key].camt += Number(r.total_tax) / 2;
        b2csMap[key].samt += Number(r.total_tax) / 2;
    });

    // 3. CDNR (Returns - Broken down by Rate)
    const cdnrMap = {};
    sales.filter(r => r.party_gstin && r.type === 'Credit Note').forEach(r => {
        if (!cdnrMap[r.party_gstin]) cdnrMap[r.party_gstin] = { ctin: r.party_gstin, nt: [] };
        
        let nt = cdnrMap[r.party_gstin].nt.find(n => n.nt_num === r.document_no);
        if (!nt) {
            nt = {
                ntty: "C", nt_num: r.document_no, nt_dt: moment(r.document_date).format('DD-MM-YYYY'),
                p_gst: "N", val: Math.abs(Number(r.total_value)), itms: []
            };
            cdnrMap[r.party_gstin].nt.push(nt);
        }
        
        nt.itms.push({
            num: nt.itms.length + 1,
            itm_det: {
                rt: Number(r.tax_rate),
                txval: Math.abs(Number(r.taxable_value)),
                camt: Math.abs(Number(r.total_tax))/2,
                samt: Math.abs(Number(r.total_tax))/2
            }
        });
    });

    const payload = {
        gstin: myGstin, fp: period, gt: 0, cur_gt: 0,
        b2b: Object.values(b2bMap),
        b2cs: Object.values(b2csMap),
        cdnr: Object.values(cdnrMap)
    };

    download(JSON.stringify(payload), `GSTR1_FINAL_${period}.json`, "application/json");
  }
}
