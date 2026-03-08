export default {
  groupByBrand: () => {
    const all = Products.data.data || Products.data || [];
    const grouped = _.groupBy(all, 'brand_name');
    return Object.keys(grouped).map((brandName, index) => {
      const products = grouped[brandName];
      return {
        id: products[0]?.brand_id || index,
        brand_name: brandName,
        product_count: products.length,
        val_stock_taxable: _.sumBy(products, p => Number(p.stock_value_cost || 0)).toFixed(2),
        val_total_bought:  _.sumBy(products, p => Number(p.stock_value_total_bought || 0)).toFixed(2),
        products: products.sort((a, b) => a.product_name.localeCompare(b.product_name))
      };
    }).sort((a, b) => a.brand_name.localeCompare(b.brand_name));
  }
}