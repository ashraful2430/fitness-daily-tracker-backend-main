"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCategoryName = normalizeCategoryName;
exports.formatCategoryLabel = formatCategoryLabel;
function normalizeCategoryName(name) {
    return name.trim().toLowerCase();
}
function formatCategoryLabel(name) {
    const normalized = name.trim().replace(/[-_]+/g, " ");
    return normalized
        .split(" ")
        .filter(Boolean)
        .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}
