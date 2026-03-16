export default {
    previewPayload: async () => {
        const payload = {
            scheme_name: inputSchemeName.text,
            description: inputDescription.text || "",
            start_date: dateStart.selectedDate,
            end_date: checkboxNoExpiry.isChecked ? null : dateEnd.selectedDate,
            is_active: true,
            rules: (appsmith.store.varSlabsData || []).map(r => {
                // Base fields for all schemes
                let rule = {
                    scheme_type: r.scheme_type, // 'BUY_GET_FREE', 'COMBO', or 'PRICE_SLAB'
                    trigger_type: r.trigger_type,
                    trigger_id: r.trigger_id,
                    min_qty: Number(r.min_qty),
                    reward_product_id: r.reward_product_id,
                    reward_qty: Number(r.reward_qty),
                    tier_level: r.tier_level || 1,
                    channel_tier: r.channel_tier,
                    is_recursive: r.is_recursive !== false
                };

                // Type-specific fields
                if (r.scheme_type === 'PRICE_SLAB') {
                    rule.special_price = r.special_price ? Number(r.special_price) : null;
                }

                if (r.scheme_type === 'COMBO') {
                    rule.combo_products = r.combo_products || [];
                }

                return rule;
            })
        };

        // This allows you to see it in the Appsmith "Response" tab
        console.log("Payload Preview:", payload);
        return payload; 
    }
}
