BEGIN;

INSERT INTO users (email, password_hash, role)
VALUES
  ('admin@yourmedstore.local', 'password-hash-will-be-generated-in-step-3', 'Admin'),
  ('user@yourmedstore.local', 'password-hash-will-be-generated-in-step-3', 'User')
ON CONFLICT (email) DO NOTHING;

INSERT INTO products (name, sku, description, base_unit, base_price_per_unit, current_stock)
VALUES
  (
    'Sodium Chloride',
    'CHEM-NACL-001',
    'Analytical reagent grade sodium chloride for laboratory preparations.',
    'g',
    0.85000000,
    25000.00000000
  ),
  (
    'Potassium Permanganate',
    'CHEM-KMNO4-002',
    'Oxidizing agent supplied for controlled analytical and synthesis use.',
    'g',
    4.75000000,
    5000.00000000
  ),
  (
    'Ethanol 99.9%',
    'CHEM-ETOH-003',
    'High-purity ethanol stored and priced internally by liter.',
    'L',
    780.00000000,
    120.00000000
  ),
  (
    'Hydrochloric Acid 37%',
    'CHEM-HCL-004',
    'Concentrated hydrochloric acid solution for laboratory applications.',
    'L',
    620.00000000,
    75.50000000
  ),
  (
    'Acetone',
    'CHEM-ACE-005',
    'Laboratory-grade acetone solvent tracked by liter.',
    'L',
    540.00000000,
    200.00000000
  ),
  (
    'pH Indicator Strips',
    'LAB-PHSTRIP-006',
    'Universal pH paper strips tracked as countable inventory items.',
    'items',
    2.25000000,
    1500.00000000
  ),
  (
    'Magnesium Sulfate',
    'CHEM-MGSO4-007',
    'Anhydrous magnesium sulfate drying agent.',
    'g',
    1.65000000,
    18000.00000000
  ),
  (
    'Glass Vials 10 mL',
    'LAB-VIAL-008',
    'Clear borosilicate glass vials for sample storage.',
    'items',
    18.00000000,
    600.00000000
  )
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  base_unit = EXCLUDED.base_unit,
  base_price_per_unit = EXCLUDED.base_price_per_unit,
  current_stock = EXCLUDED.current_stock,
  updated_at = NOW();

COMMIT;
