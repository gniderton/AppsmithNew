export default {
    getGroupedBrands: () => {
        // Safely access Products API data. Appsmith allows optional chaining (?.)
        const all = Products.data?.data || Products.data || []; 
        
        // Group By Brand, with a fallback for any items missing a brand name
        const grouped = _.groupBy(all, p => p.brand_name || 'Unbranded');
        
        // Map over the grouped keys and return the transformed array
        const result = Object.keys(grouped).map((brandName, index) => {
            const products = grouped[brandName];
            
            // Grab the brand_id from the first product
            const brandId = products[0]?.brand_id || index; 
            
            // 1. Taxable Stock Value (Current Value of Goods on Hand - Taxable)
            const valStockTaxable = _.sumBy(products, p => Number(p.stock_value_cost || 0));
            
            // 2. Total Bought Value (Historical Value of All Goods Purchased - Taxable)
            const valTotalBought = _.sumBy(products, p => Number(p.stock_value_total_bought || 0));
            
            return {
                id: brandId,
                brand_name: brandName,
                product_count: products.length,
                val_stock_taxable: valStockTaxable.toFixed(2),
                val_total_bought: valTotalBought.toFixed(2),
                // Sort the nested products array safely
                products: products.sort((a,b) => 
                    (a.product_name || '').localeCompare(b.product_name || '')
                )
            };
        });

        // Finally, sort the outer array alphabetically by brand_name
        return result.sort((a,b) => a.brand_name.localeCompare(b.brand_name));
    }
}
