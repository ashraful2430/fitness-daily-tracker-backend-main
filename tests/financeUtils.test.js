const assert = require("node:assert");
const { describe, it } = require("node:test");
const {
  formatCategoryLabel,
  normalizeCategoryName,
} = require("../dist/utils/financeUtils");

describe("Finance utility helpers", () => {
  it("should normalize category names to lower-case trimmed values", () => {
    assert.strictEqual(
      normalizeCategoryName("  Food & Drinks  "),
      "food & drinks",
    );
    assert.strictEqual(normalizeCategoryName("TRAVEL"), "travel");
  });

  it("should format lower-case categories into friendly title labels", () => {
    assert.strictEqual(formatCategoryLabel("food"), "Food");
    assert.strictEqual(
      formatCategoryLabel("food_and_drinks"),
      "Food And Drinks",
    );
    assert.strictEqual(
      formatCategoryLabel("groceries-and-snacks"),
      "Groceries And Snacks",
    );
  });
});
