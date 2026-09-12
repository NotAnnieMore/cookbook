export const MEASUREMENT_RULE_VERSION = "metric-v2";

export type SourceMeasurementSystem = "us" | "imperial" | "unknown";
export type ConversionConfidence =
  | "exact"
  | "reference"
  | "suggested"
  | "ambiguous";

export type IngredientCupReference = {
  ingredientKey: string;
  gramsPerCup: number;
  source: string;
};

export const CUP_REFERENCE_SOURCE =
  "https://www.kingarthurbaking.com/learn/ingredient-weight-chart";

const ingredientCupReferences: Array<
  IngredientCupReference & { aliases: string[] }
> = [
  {
    ingredientKey: "farinha de amêndoa",
    gramsPerCup: 96,
    source: CUP_REFERENCE_SOURCE,
    aliases: ["farinha de amendoa", "almond flour"],
  },
  {
    ingredientKey: "farinha integral",
    gramsPerCup: 113,
    source: CUP_REFERENCE_SOURCE,
    aliases: ["farinha integral", "whole wheat flour"],
  },
  {
    ingredientKey: "farinha de trigo",
    gramsPerCup: 120,
    source: CUP_REFERENCE_SOURCE,
    aliases: [
      "farinha de trigo",
      "farinha sem fermento",
      "farinha para pao",
      "all-purpose flour",
      "all purpose flour",
      "plain flour",
      "bread flour",
    ],
  },
  {
    ingredientKey: "açúcar mascavado compactado",
    gramsPerCup: 213,
    source: CUP_REFERENCE_SOURCE,
    aliases: [
      "acucar mascavado",
      "acucar amarelo",
      "brown sugar",
      "light brown sugar",
      "dark brown sugar",
    ],
  },
  {
    ingredientKey: "açúcar em pó",
    gramsPerCup: 113,
    source: CUP_REFERENCE_SOURCE,
    aliases: [
      "acucar em po",
      "icing sugar",
      "powdered sugar",
      "confectioners sugar",
    ],
  },
  {
    ingredientKey: "açúcar branco",
    gramsPerCup: 198,
    source: CUP_REFERENCE_SOURCE,
    aliases: [
      "acucar branco",
      "acucar granulado",
      "granulated sugar",
      "white sugar",
    ],
  },
  {
    ingredientKey: "manteiga",
    gramsPerCup: 226,
    source: CUP_REFERENCE_SOURCE,
    aliases: ["manteiga", "butter"],
  },
  {
    ingredientKey: "cacau em pó",
    gramsPerCup: 84,
    source: CUP_REFERENCE_SOURCE,
    aliases: ["cacau em po", "cocoa powder", "unsweetened cocoa", "cocoa"],
  },
  {
    ingredientKey: "flocos de aveia",
    gramsPerCup: 89,
    source: CUP_REFERENCE_SOURCE,
    aliases: [
      "flocos de aveia",
      "aveia em flocos",
      "rolled oats",
      "old-fashioned oats",
      "quick-cooking oats",
    ],
  },
  {
    ingredientKey: "pepitas de chocolate",
    gramsPerCup: 170,
    source: CUP_REFERENCE_SOURCE,
    aliases: [
      "pepitas de chocolate",
      "gotas de chocolate",
      "chocolate chips",
      "chocolate chunks",
      "chopped chocolate",
    ],
  },
  {
    ingredientKey: "manteiga de amendoim",
    gramsPerCup: 270,
    source: CUP_REFERENCE_SOURCE,
    aliases: ["manteiga de amendoim", "peanut butter"],
  },
  {
    ingredientKey: "amido de milho",
    gramsPerCup: 112,
    source: CUP_REFERENCE_SOURCE,
    aliases: ["amido de milho", "maisena", "cornstarch", "corn starch"],
  },
  {
    ingredientKey: "queijo creme",
    gramsPerCup: 227,
    source: CUP_REFERENCE_SOURCE,
    aliases: ["queijo creme", "cream cheese"],
  },
  {
    ingredientKey: "natas",
    gramsPerCup: 227,
    source: CUP_REFERENCE_SOURCE,
    aliases: ["natas", "heavy cream", "light cream", "whipping cream"],
  },
  {
    ingredientKey: "iogurte",
    gramsPerCup: 227,
    source: CUP_REFERENCE_SOURCE,
    aliases: ["iogurte", "yogurt", "yoghurt"],
  },
  {
    ingredientKey: "nozes picadas",
    gramsPerCup: 113,
    source: CUP_REFERENCE_SOURCE,
    aliases: ["nozes picadas", "chopped walnuts"],
  },
  {
    ingredientKey: "coco ralado adoçado",
    gramsPerCup: 85,
    source: CUP_REFERENCE_SOURCE,
    aliases: ["coco ralado adocado", "sweetened shredded coconut"],
  },
];

function searchableIngredient(value: string) {
  return ` ${value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-PT")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

export function findCupReference(ingredientName: string) {
  const searchable = searchableIngredient(ingredientName);
  const reference = ingredientCupReferences
    .flatMap((candidate) =>
      candidate.aliases.map((alias) => ({ candidate, alias })),
    )
    .filter(({ alias }) => searchable.includes(searchableIngredient(alias)))
    .sort((a, b) => b.alias.length - a.alias.length)[0]?.candidate;

  if (!reference) return null;
  const { aliases: _aliases, ...publicReference } = reference;
  void _aliases;
  return publicReference;
}

export type NormalizedMeasurement = {
  original: {
    quantity: number;
    quantityMax: number | null;
    unit: string;
  };
  normalized: {
    quantity: number;
    quantityMax: number | null;
    unit: string;
  };
  confidence: ConversionConfidence;
  source: string;
  ruleVersion: typeof MEASUREMENT_RULE_VERSION;
  note: string | null;
};

const unicodeFractions: Record<string, number> = {
  "¼": 1 / 4,
  "½": 1 / 2,
  "¾": 3 / 4,
  "⅐": 1 / 7,
  "⅑": 1 / 9,
  "⅒": 1 / 10,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅕": 1 / 5,
  "⅖": 2 / 5,
  "⅗": 3 / 5,
  "⅘": 4 / 5,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 1 / 8,
  "⅜": 3 / 8,
  "⅝": 5 / 8,
  "⅞": 7 / 8,
};

const unitAliases: Record<string, string> = {
  dente: "unid.",
  dentes: "unid.",
  clove: "unid.",
  cloves: "unid.",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  cup: "cup",
  cups: "cup",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  "fl oz": "fl oz",
  "fluid ounce": "fl oz",
  "fluid ounces": "fl oz",
  inch: "in",
  inches: "in",
  in: "in",
  fahrenheit: "°f",
  "°f": "°f",
  f: "°f",
  cl: "cl",
  centilitro: "cl",
  centilitros: "cl",
  dl: "dl",
  decilitro: "dl",
  decilitros: "dl",
  pacote: "pacote",
  pacotes: "pacote",
  packet: "pacote",
  packets: "pacote",
  package: "pacote",
  packages: "pacote",
  pack: "pacote",
  packs: "pacote",
  embalagem: "pacote",
  embalagens: "pacote",
  saqueta: "pacote",
  saquetas: "pacote",
  sachet: "pacote",
  sachets: "pacote",
};

function rounded(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function parseQuantityValue(raw: string) {
  const value = raw.trim().replace(",", ".");
  if (!value) return null;

  const unicodeMatch = value.match(/^([0-9]+(?:\.[0-9]+)?)?\s*([¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])$/);
  if (unicodeMatch) {
    const whole = unicodeMatch[1] ? Number(unicodeMatch[1]) : 0;
    return whole + unicodeFractions[unicodeMatch[2]];
  }

  const mixedFraction = value.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedFraction) {
    const denominator = Number(mixedFraction[3]);
    if (denominator === 0) return null;
    return Number(mixedFraction[1]) + Number(mixedFraction[2]) / denominator;
  }

  const fraction = value.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator === 0) return null;
    return Number(fraction[1]) / denominator;
  }

  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function parseImportedQuantity(raw: string) {
  const value = raw.trim();
  if (!value) return null;

  const range = value.match(/^(.+?)\s*(?:–|—|-|\bto\b|\ba\b)\s*(.+)$/i);
  if (range) {
    const quantity = parseQuantityValue(range[1]);
    const quantityMax = parseQuantityValue(range[2]);
    if (
      quantity === null ||
      quantityMax === null ||
      quantityMax < quantity
    ) {
      return null;
    }
    return { quantity, quantityMax };
  }

  const quantity = parseQuantityValue(value);
  return quantity === null ? null : { quantity, quantityMax: null };
}

export function comparableQuantityRange(
  quantity: number | null,
  quantityMax: number | null,
) {
  if (
    quantity !== null &&
    quantityMax !== null &&
    quantityMax < quantity
  ) {
    return { quantity: null, quantityMax: null };
  }

  return { quantity, quantityMax };
}

function metricMagnitude(quantity: number, quantityMax: number | null, unit: "g" | "ml") {
  const comparison = quantityMax ?? quantity;
  if (comparison < 1000) {
    return { quantity: rounded(quantity), quantityMax: quantityMax === null ? null : rounded(quantityMax), unit };
  }

  return {
    quantity: rounded(quantity / 1000),
    quantityMax: quantityMax === null ? null : rounded(quantityMax / 1000),
    unit: unit === "g" ? "kg" : "l",
  };
}

export function canonicalIngredientUnit(unit: string | null | undefined) {
  if (!unit) return "";
  const compact = unit.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
  return unitAliases[compact] ?? compact;
}

export function normalizeImportedMeasurement({
  quantity,
  quantityMax = null,
  unit,
  sourceSystem = "unknown",
  cupReference,
}: {
  quantity: number;
  quantityMax?: number | null;
  unit: string;
  sourceSystem?: SourceMeasurementSystem;
  cupReference?: IngredientCupReference | null;
}): NormalizedMeasurement {
  const original = { quantity, quantityMax, unit };
  const canonicalUnit = canonicalIngredientUnit(unit);
  const result = (
    normalized: NormalizedMeasurement["normalized"],
    confidence: ConversionConfidence,
    source: string,
    note: string | null = null,
  ): NormalizedMeasurement => ({
    original,
    normalized,
    confidence,
    source,
    ruleVersion: MEASUREMENT_RULE_VERSION,
    note,
  });
  const convert = (factor: number, metricUnit: "g" | "ml") =>
    metricMagnitude(
      quantity * factor,
      quantityMax === null ? null : quantityMax * factor,
      metricUnit,
    );

  if (canonicalUnit === "oz") {
    return result(convert(28.349523125, "g"), "exact", "international-avoirdupois");
  }
  if (canonicalUnit === "lb") {
    return result(convert(453.59237, "g"), "exact", "international-avoirdupois");
  }
  if (canonicalUnit === "cup" && cupReference) {
    return result(
      convert(cupReference.gramsPerCup, "g"),
      "reference",
      cupReference.source,
      `Conversão específica para ${cupReference.ingredientKey}.`,
    );
  }
  if (canonicalUnit === "cup") {
    return result(
      convert(sourceSystem === "imperial" ? 284.131 : 240, "ml"),
      sourceSystem === "unknown" ? "suggested" : "reference",
      sourceSystem === "imperial" ? "imperial-cup" : "us-cup-rounded",
      sourceSystem === "unknown"
        ? "O tamanho da cup varia com a origem; confirmar no preview."
        : null,
    );
  }
  if (canonicalUnit === "tbsp") {
    return result(convert(15, "ml"), "reference", "culinary-metric-spoon");
  }
  if (canonicalUnit === "cl") {
    return result(convert(10, "ml"), "exact", "metric-centilitre");
  }
  if (canonicalUnit === "dl") {
    return result(convert(100, "ml"), "exact", "metric-decilitre");
  }
  if (canonicalUnit === "tsp") {
    return result(convert(5, "ml"), "reference", "culinary-metric-spoon");
  }
  if (canonicalUnit === "fl oz") {
    if (sourceSystem === "unknown") {
      return result(
        { quantity, quantityMax, unit },
        "ambiguous",
        "original",
        "Uma fluid ounce americana e uma imperial têm volumes diferentes.",
      );
    }
    return result(
      convert(sourceSystem === "us" ? 29.5735295625 : 28.4130625, "ml"),
      "exact",
      sourceSystem === "us" ? "us-fluid-ounce" : "imperial-fluid-ounce",
    );
  }

  return result(
    { quantity, quantityMax, unit },
    "exact",
    "already-metric-or-discrete",
  );
}

export function normalizeImportedIngredientMeasurement({
  ingredientName,
  ...measurement
}: {
  ingredientName: string;
  quantity: number;
  quantityMax?: number | null;
  unit: string;
  sourceSystem?: SourceMeasurementSystem;
}) {
  const canonicalUnit = canonicalIngredientUnit(measurement.unit);
  const ingredient = searchableIngredient(ingredientName);
  if (canonicalUnit === "pacote" && ingredient.includes(" natas ")) {
    return {
      original: {
        quantity: measurement.quantity,
        quantityMax: measurement.quantityMax ?? null,
        unit: measurement.unit,
      },
      normalized: metricMagnitude(
        measurement.quantity * 200,
        measurement.quantityMax === null || measurement.quantityMax === undefined
          ? null
          : measurement.quantityMax * 200,
        "ml",
      ),
      confidence: "reference" as const,
      source: "cookbook-pt-package-reference",
      ruleVersion: MEASUREMENT_RULE_VERSION,
      note: "Conversão usada: 1 pacote de natas = 200 ml.",
    };
  }

  return normalizeImportedMeasurement({
    ...measurement,
    cupReference: findCupReference(ingredientName),
  });
}

export function fahrenheitToCelsius(fahrenheit: number) {
  const exact = (fahrenheit - 32) * (5 / 9);
  return Math.round(exact / 5) * 5;
}

export function inchesToCentimetres(inches: number) {
  return rounded(inches * 2.54, 1);
}
