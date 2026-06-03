export const products = [
  {
    id: 'chem-nacl-001',
    name: 'Sodium Chloride',
    sku: 'CHEM-NACL-001',
    description: 'Analytical reagent grade salt for buffer and sample preparation.',
    category: 'Salts',
    baseUnit: 'g',
    price: 0.85,
    stock: 25000,
    status: 'In stock'
  },
  {
    id: 'chem-kmno4-002',
    name: 'Potassium Permanganate',
    sku: 'CHEM-KMNO4-002',
    description: 'Controlled oxidizing agent for analytical workflows.',
    category: 'Oxidizers',
    baseUnit: 'g',
    price: 4.75,
    stock: 5000,
    status: 'Limited'
  },
  {
    id: 'chem-etoh-003',
    name: 'Ethanol 99.9%',
    sku: 'CHEM-ETOH-003',
    description: 'High-purity solvent for extraction and cleaning procedures.',
    category: 'Solvents',
    baseUnit: 'L',
    price: 780,
    stock: 120,
    status: 'In stock'
  },
  {
    id: 'chem-hcl-004',
    name: 'Hydrochloric Acid 37%',
    sku: 'CHEM-HCL-004',
    description: 'Concentrated acid solution for laboratory applications.',
    category: 'Acids',
    baseUnit: 'L',
    price: 620,
    stock: 75.5,
    status: 'Watch'
  },
  {
    id: 'lab-vial-008',
    name: 'Glass Vials 10 mL',
    sku: 'LAB-VIAL-008',
    description: 'Clear borosilicate glass vials for sample storage.',
    category: 'Labware',
    baseUnit: 'items',
    price: 18,
    stock: 600,
    status: 'In stock'
  },
  {
    id: 'lab-phstrip-006',
    name: 'pH Indicator Strips',
    sku: 'LAB-PHSTRIP-006',
    description: 'Universal pH paper strips tracked as countable inventory.',
    category: 'Consumables',
    baseUnit: 'items',
    price: 2.25,
    stock: 1500,
    status: 'In stock'
  }
];

export const quotationItems = [
  {
    id: 'cart-1',
    name: 'Ethanol 99.9%',
    quantity: 500,
    unit: 'mL',
    total: 390
  },
  {
    id: 'cart-2',
    name: 'Sodium Chloride',
    quantity: 250,
    unit: 'g',
    total: 212.5
  }
];

export const incomingOrders = [
  {
    id: 'QTN-1042',
    buyer: 'Riya Sharma',
    date: '2026-06-03',
    item: 'Hydrochloric Acid 37%',
    requested: '750 mL',
    converted: '0.75000000 L',
    amount: 465,
    status: 'Pending'
  },
  {
    id: 'QTN-1041',
    buyer: 'Aman Verma',
    date: '2026-06-03',
    item: 'Potassium Permanganate',
    requested: '1.5 kg',
    converted: '1500.00000000 g',
    amount: 7125,
    status: 'Pending'
  },
  {
    id: 'QTN-1040',
    buyer: 'Neha Iyer',
    date: '2026-06-02',
    item: 'Glass Vials 10 mL',
    requested: '80 items',
    converted: '80.00000000 items',
    amount: 1440,
    status: 'Approved'
  }
];
