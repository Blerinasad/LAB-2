# Smart Kitchen — Database

## Ekzekuto në rend

1. `01_schema.sql` — Krijon 26 tabelat
2. `02_seed.sql` — Seed data (roles, users, ingredients, recipes...)
3. `node seed.js` (nga backend/) — Gjeneron hash bcrypt reale

## Tabela (26 total)

### 10 të detyrueshme
Users, Roles, UserRoles, Permissions, RolePermissions, RefreshTokens,
AuditLogs, Notifications, Settings, Files

### 16 domain
Categories, Ingredients, NutritionInfo, InventoryItems, ExpiryAlerts,
Recipes, RecipeIngredients, UserPreferences, ConsumptionLog, WasteLog,
MealPlans, MealPlanDays, ShoppingLists, ShoppingListItems,
Stores, RecipeRatings + StoreOrders, StoreOrderItems, StoreProductPrices (migration)

## MySQL Workbench

File → Open SQL Script → [zgjedh file] → Execute All (⚡)

## Ngarkimi me CLI (mysql)

Skedarët janë në UTF-8 (emrat e ingredientëve kanë shkronja shqipe ë/ç).
Nëse i ngarkon me `mysql` CLI, specifiko domosdoshmërisht charset-in e klientit,
përndryshe tekstet me ë/ç do të dëmtohen (double-encoding):

```bash
mysql --default-character-set=utf8mb4 -u root -p smart_kitchen < 01_schema.sql
mysql --default-character-set=utf8mb4 -u root -p smart_kitchen < 02_seed.sql
```

MySQL Workbench e bën këtë automatikisht, prandaj ky problem shfaqet vetëm me CLI.

## ERD Diagram

Database → Reverse Engineer → smart_kitchen → Eksporto PNG
