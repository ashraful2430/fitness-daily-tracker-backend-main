export function normalizeCategoryName(name: string) {
  return name.trim().toLowerCase();
}

export function formatCategoryLabel(name: string) {
  const normalized = name.trim().replace(/[-_]+/g, " ");
  return normalized
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
