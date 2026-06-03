function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    description: row.description,
    baseUnit: row.base_unit,
    basePricePerUnit: row.base_price_per_unit,
    currentStock: row.current_stock,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  mapProduct
};
