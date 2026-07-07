export const UNIT_OPTIONS = [
  { value: "piece", label: "copë" },
  { value: "g", label: "gram" },
  { value: "kg", label: "kilogram" },
  { value: "ml", label: "mililitër" },
  { value: "l", label: "litër" },
  { value: "pack", label: "pako" },
  { value: "box", label: "kuti" },
  { value: "bottle", label: "shishe" },
  { value: "can", label: "kanaçe" },
  { value: "slice", label: "fetë" },
];

export function normalizeUnit(unit) {
  if (unit === "cope") return "piece";
  return UNIT_OPTIONS.some((option) => option.value === unit) ? unit : "piece";
}

export function getDefaultUnitForIngredient(ingredient = {}) {
  const explicit = ingredient.default_unit || ingredient.unit || ingredient.product_unit;
  if (explicit) return normalizeUnit(explicit);

  const name = String(ingredient.name || ingredient.ingredient_name || "").toLowerCase();
  const category = String(ingredient.category_name || ingredient.category || "").toLowerCase();

  if (name.includes("qum") || name.includes("milk") || name.includes("vaj") || name.includes("oil")) return "l";
  if (name.includes("vez") || name.includes("egg") || name.includes("buk") || name.includes("bread")) return "piece";
  if (name.includes("djath") || name.includes("cheese")) return "kg";
  if (name.includes("pul") || name.includes("chicken") || name.includes("oriz") || name.includes("rice")) return "kg";
  if (category.includes("bulmet")) return "kg";
  if (category.includes("mish") || category.includes("perime") || category.includes("drith")) return "kg";

  return "piece";
}
