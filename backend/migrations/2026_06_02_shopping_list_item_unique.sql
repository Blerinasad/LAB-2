-- Prevent duplicate ingredient rows inside the same shopping list.
-- Existing duplicate rows must be merged before running this migration.
ALTER TABLE ShoppingListItems
  ADD UNIQUE KEY uq_shopping_list_ingredient (shopping_list_id, ingredient_id);
