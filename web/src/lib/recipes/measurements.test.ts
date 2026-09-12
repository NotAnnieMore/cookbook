import assert from "node:assert/strict";
import test from "node:test";

import {
  comparableQuantityRange,
  fahrenheitToCelsius,
  findCupReference,
  inchesToCentimetres,
  normalizeImportedIngredientMeasurement,
  normalizeImportedMeasurement,
  parseImportedQuantity,
  parseQuantityValue,
} from "./measurements.ts";

test("keeps only original ranges whose endpoints can be compared directly", () => {
  assert.deepEqual(comparableQuantityRange(0.8, 1.6), {
    quantity: 0.8,
    quantityMax: 1.6,
  });
  assert.deepEqual(comparableQuantityRange(800, 1.6), {
    quantity: null,
    quantityMax: null,
  });
});

test("reads decimal commas, fractions and ranges", () => {
  assert.equal(parseQuantityValue("1/2"), 0.5);
  assert.equal(parseQuantityValue("1 1/2"), 1.5);
  assert.equal(parseQuantityValue("¾"), 0.75);
  assert.deepEqual(parseImportedQuantity("1,5"), {
    quantity: 1.5,
    quantityMax: null,
  });
  assert.deepEqual(parseImportedQuantity("1 1/2"), {
    quantity: 1.5,
    quantityMax: null,
  });
  assert.deepEqual(parseImportedQuantity("2–3"), {
    quantity: 2,
    quantityMax: 3,
  });
  assert.deepEqual(parseImportedQuantity("½"), {
    quantity: 0.5,
    quantityMax: null,
  });
});

test("converts imperial weight and keeps the original value", () => {
  const measurement = normalizeImportedMeasurement({
    quantity: 40,
    unit: "oz",
    sourceSystem: "us",
  });

  assert.deepEqual(measurement.original, {
    quantity: 40,
    quantityMax: null,
    unit: "oz",
  });
  assert.deepEqual(measurement.normalized, {
    quantity: 1.13,
    quantityMax: null,
    unit: "kg",
  });
  assert.equal(measurement.confidence, "exact");
});

test("uses millilitres for a cup when no ingredient reference exists", () => {
  const measurement = normalizeImportedMeasurement({
    quantity: 1,
    unit: "cup",
    sourceSystem: "us",
  });

  assert.deepEqual(measurement.normalized, {
    quantity: 240,
    quantityMax: null,
    unit: "ml",
  });
  assert.equal(measurement.confidence, "reference");
});

test("uses a named reference when converting cups to grams", () => {
  const measurement = normalizeImportedMeasurement({
    quantity: 1.5,
    unit: "cups",
    sourceSystem: "us",
    cupReference: {
      ingredientKey: "farinha de trigo",
      gramsPerCup: 120,
      source: "test-reference",
    },
  });

  assert.deepEqual(measurement.normalized, {
    quantity: 180,
    quantityMax: null,
    unit: "g",
  });
  assert.equal(measurement.source, "test-reference");
});

test("does not guess which fluid ounce system was used", () => {
  const measurement = normalizeImportedMeasurement({
    quantity: 2,
    unit: "fl oz",
  });

  assert.equal(measurement.confidence, "ambiguous");
  assert.deepEqual(measurement.normalized, {
    quantity: 2,
    quantityMax: null,
    unit: "fl oz",
  });
});

test("converts common oven temperatures and tin sizes", () => {
  assert.equal(fahrenheitToCelsius(350), 175);
  assert.equal(inchesToCentimetres(9), 22.9);
});

test("matches common ingredient names in Portuguese and English", () => {
  assert.equal(findCupReference("farinha de trigo sem fermento")?.gramsPerCup, 120);
  assert.equal(findCupReference("unsalted butter, melted")?.gramsPerCup, 226);
  assert.equal(findCupReference("manteiga de amendoim")?.gramsPerCup, 270);
  assert.equal(findCupReference("ingrediente desconhecido"), null);
});

test("automatically applies a safe cup reference to an imported ingredient", () => {
  const measurement = normalizeImportedIngredientMeasurement({
    ingredientName: "pepitas de chocolate negro",
    quantity: 1.5,
    unit: "cups",
    sourceSystem: "us",
  });

  assert.deepEqual(measurement.normalized, {
    quantity: 255,
    quantityMax: null,
    unit: "g",
  });
  assert.equal(measurement.confidence, "reference");
  assert.match(measurement.source, /kingarthurbaking\.com/);
});

test("converts Portuguese cream packets to their usual 200 ml size", () => {
  const measurement = normalizeImportedIngredientMeasurement({
    ingredientName: "natas",
    quantity: 2,
    unit: "pacotes",
  });

  assert.deepEqual(measurement.normalized, {
    quantity: 400,
    quantityMax: null,
    unit: "ml",
  });
  assert.equal(measurement.confidence, "reference");
  assert.match(measurement.note ?? "", /1 pacote de natas = 200 ml/);
});
