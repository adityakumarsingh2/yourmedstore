const supportedRequestedUnits = new Set(['g', 'kg', 'L', 'mL', 'items']);
const supportedBaseUnits = new Set(['g', 'L', 'items']);

const unitDimensions = {
  g: 'mass',
  kg: 'mass',
  L: 'volume',
  mL: 'volume',
  items: 'count'
};

const baseUnitByDimension = {
  mass: 'g',
  volume: 'L',
  count: 'items'
};

const conversionFactorsToBase = {
  g: 1,
  kg: 1000,
  L: 1,
  mL: 0.001,
  items: 1
};

function assertPositiveNumber(value, label) {
  const numericValue = new Decimal(value);

  if (!numericValue.isFinite() || numericValue.lte(0)) {
    throw new Error(`${label} must be a positive number.`);
  }

  return numericValue;
}

function assertNonNegativeNumber(value, label) {
  const numericValue = new Decimal(value);

  if (!numericValue.isFinite() || numericValue.lt(0)) {
    throw new Error(`${label} must be a non-negative number.`);
  }

  return numericValue;
}

function toFixedDecimal(value) {
  return new Decimal(value).toFixed(8);
}

function getBaseUnitForRequestedUnit(requestedUnit) {
  if (!supportedRequestedUnits.has(requestedUnit)) {
    throw new Error(`Unsupported requested unit: ${requestedUnit}.`);
  }

  return baseUnitByDimension[unitDimensions[requestedUnit]];
}

function assertCompatibleUnits(requestedUnit, baseUnit) {
  if (!supportedRequestedUnits.has(requestedUnit)) {
    throw new Error(`Unsupported requested unit: ${requestedUnit}.`);
  }

  if (!supportedBaseUnits.has(baseUnit)) {
    throw new Error(`Unsupported base unit: ${baseUnit}.`);
  }

  const expectedBaseUnit = getBaseUnitForRequestedUnit(requestedUnit);

  if (expectedBaseUnit !== baseUnit) {
    throw new Error(`Requested unit ${requestedUnit} is not compatible with base unit ${baseUnit}.`);
  }
}

function convertToBaseQuantity(quantity, requestedUnit, baseUnit) {
  assertCompatibleUnits(requestedUnit, baseUnit);

  const numericQuantity = assertPositiveNumber(quantity, 'Quantity');
  return numericQuantity.mul(conversionFactorsToBase[requestedUnit]).toFixed(8);
}

function calculateLineTotal({ quantity, requestedUnit, baseUnit, basePricePerUnit }) {
  const convertedQuantity = convertToBaseQuantity(quantity, requestedUnit, baseUnit);
  const numericPrice = assertNonNegativeNumber(basePricePerUnit, 'Base price per unit');

  return {
    requestedQuantity: toFixedDecimal(assertPositiveNumber(quantity, 'Quantity')),
    requestedUnit,
    baseUnit,
    convertedQuantity,
    basePricePerUnit: toFixedDecimal(numericPrice),
    lineTotal: new Decimal(convertedQuantity).mul(numericPrice).toFixed(8)
  };
}

module.exports = {
  assertCompatibleUnits,
  calculateLineTotal,
  convertToBaseQuantity,
  getBaseUnitForRequestedUnit,
  supportedBaseUnits,
  supportedRequestedUnits
};
const Decimal = require('decimal.js');
