-- ============================================================
--  Smart Kitchen — Seed Data
--  Ekzekuto PAS 01_schema.sql
-- ============================================================

USE smart_kitchen;

-- ── Roles ──────────────────────────────────────────────────
INSERT INTO Roles (id, name, description) VALUES
(1, 'Admin',   'Aksesi i plotë i sistemit'),
(2, 'Manager', 'Menaxhon dyqanin dhe porositë'),
(3, 'User',    'Përdorues standard'),
(4, 'Courier', 'Dorëzon porositë');

-- ── Permissions ────────────────────────────────────────────
INSERT INTO Permissions (id, name, description) VALUES
(1,  'inventory:read',   'Shiko inventarin'),
(2,  'inventory:write',  'Modifiko inventarin'),
(3,  'recipe:read',      'Shiko recetat'),
(4,  'recipe:write',     'Krijo/modifiko receta'),
(5,  'mealplan:read',    'Shiko planet vaktesh'),
(6,  'mealplan:write',   'Krijo/modifiko plane'),
(7,  'shopping:read',    'Shiko listat blerje'),
(8,  'shopping:write',   'Modifiko listat blerje'),
(9,  'orders:read',      'Shiko porositë'),
(10, 'orders:write',     'Krijo/modifiko porosi'),
(11, 'reports:read',     'Shiko raportet'),
(12, 'admin:users',      'Menaxho përdoruesit'),
(13, 'admin:settings',   'Menaxho cilësimet'),
(14, 'courier:deliver',  'Merr dhe dorëzo porosi');

-- ── RolePermissions ────────────────────────────────────────
-- Admin: të gjitha
INSERT INTO RolePermissions (role_id, permission_id)
SELECT 1, id FROM Permissions;

-- Manager: gjithçka veç admin
INSERT INTO RolePermissions (role_id, permission_id) VALUES
(2,1),(2,2),(2,3),(2,4),(2,5),(2,6),(2,7),(2,8),(2,9),(2,10),(2,11);

-- User: bazike
INSERT INTO RolePermissions (role_id, permission_id) VALUES
(3,1),(3,2),(3,3),(3,5),(3,6),(3,7),(3,8),(3,9),(3,10),(3,11);

-- Courier: vetëm dorëzim
INSERT INTO RolePermissions (role_id, permission_id) VALUES
(4,9),(4,14);

-- ── Settings ───────────────────────────────────────────────
INSERT INTO Settings (`key`, value, description) VALUES
('expiry_alert_days',   '3',     'Ditë para skadimit për njoftim'),
('default_language',    'sq',    'Gjuha e paracaktuar'),
('max_meal_plan_weeks', '4',     'Java maksimale e planit vakti'),
('waste_report_enabled','true',  'Aktivizo raportet humbje'),
('ml_service_url',      'http://localhost:8000', 'URL e ML Service'),
('delivery_fee_base',   '1.50',  'Tarifa bazë e dorëzimit (€)'),
('app_theme',           'dark',  'Tema e paracaktuar: dark ose light');

-- ── Users (password: Admin@123 dhe Password123!) ──────────
-- Hashët gjenerjohen nga seed.js me bcrypt LIVE
-- Këto janë placeholder — ekzekuto: node seed.js
INSERT INTO Users (id, first_name, last_name, email, password_hash, is_active) VALUES
(1, 'Admin',   'System',   'admin@smartkitchen.com',   '$2b$12$PLACEHOLDER_RUN_NODE_SEED_JS', 1),
(2, 'Artan',   'Berisha',  'artan@smartkitchen.com',   '$2b$12$PLACEHOLDER_RUN_NODE_SEED_JS', 1),
(3, 'Blerta',  'Krasniqi', 'blerta@smartkitchen.com',  '$2b$12$PLACEHOLDER_RUN_NODE_SEED_JS', 1),
(4, 'Driton',  'Hoxha',    'driton@smartkitchen.com',  '$2b$12$PLACEHOLDER_RUN_NODE_SEED_JS', 1),
(5, 'Fjolla',  'Gashi',    'fjolla@smartkitchen.com',  '$2b$12$PLACEHOLDER_RUN_NODE_SEED_JS', 1),
(6, 'Korrier', 'Demo',     'courier@smartkitchen.com', '$2b$12$PLACEHOLDER_RUN_NODE_SEED_JS', 1);

-- SHËNIM: Pas këtij script ekzekuto "node seed.js" nga backend/
-- që të gjenerohen hashët e sakta me bcrypt!

INSERT INTO UserRoles (user_id, role_id) VALUES
(1,1),(2,2),(3,3),(4,3),(5,3),(6,4);

-- ── UserPreferences ────────────────────────────────────────
INSERT INTO UserPreferences (user_id, is_vegetarian, is_vegan, is_gluten_free, calorie_goal) VALUES
(2, 0, 0, 0, 2200),
(3, 1, 0, 0, 1800),
(4, 0, 0, 0, 2500),
(5, 0, 0, 1, 1600);

-- ── Categories ─────────────────────────────────────────────
INSERT INTO Categories (id, name, description, color_hex, created_by, updated_by) VALUES
(1, 'Perime',    'Perime të freskëta',        '#6f8f4e', 1, 1),
(2, 'Fruta',     'Fruta sezonale',             '#d4a843', 1, 1),
(3, 'Mish',      'Mish dhe proteina',          '#c4622d', 1, 1),
(4, 'Bulmet',    'Qumësht, djathë, kos',       '#e6d7b8', 1, 1),
(5, 'Drithëra',  'Oriz, pasta, bukë',          '#b08a52', 1, 1),
(6, 'Erëza',     'Erëza dhe salca',            '#8b5e34', 1, 1);

-- ── Ingredients ────────────────────────────────────────────
INSERT INTO Ingredients (category_id, name, unit, calories_per_100, shelf_life_days, created_by, updated_by) VALUES
(1,'Domate',          'kg',  18,  7,  1,1),
(1,'Qepë',            'kg',  40,  30, 1,1),
(1,'Speca',           'kg',  31,  10, 1,1),
(1,'Patate',          'kg',  77,  45, 1,1),
(1,'Karrota',         'kg',  41,  30, 1,1),
(1,'Spinaq',          'kg',  23,  5,  1,1),
(1,'Hudhër',          'kg',  149, 60, 1,1),
(1,'Kastravec',       'kg',  16,  7,  1,1),
(2,'Mollë',           'kg',  52,  21, 1,1),
(2,'Banane',          'kg',  89,  6,  1,1),
(2,'Limon',           'kg',  29,  21, 1,1),
(3,'Mish pule',       'kg',  165, 3,  1,1),
(3,'Mish viçi',       'kg',  250, 4,  1,1),
(3,'Vezë',            'cope',155, 21, 1,1),
(4,'Qumësht',         'l',   42,  5,  1,1),
(4,'Djathë i bardhë', 'kg',  264, 14, 1,1),
(4,'Kos',             'l',   61,  7,  1,1),
(4,'Gjalpë',          'kg',  717, 30, 1,1),
(5,'Oriz',            'kg',  130, 365,1,1),
(5,'Pasta',           'kg',  131, 365,1,1),
(5,'Bukë',            'cope',265, 3,  1,1),
(5,'Tërshërë',        'kg',  389, 180,1,1),
(6,'Vaj ulliri',      'l',   884, 365,1,1),
(6,'Kripë',           'kg',  0,   1000,1,1),
(6,'Piper i zi',      'kg',  251, 1000,1,1),
(6,'Majdanoz',        'kg',  36,  5,  1,1);

-- ── NutritionInfo ──────────────────────────────────────────
INSERT INTO NutritionInfo (ingredient_id, protein_g, carbs_g, fat_g, fiber_g) VALUES
(1,  0.9,  3.9, 0.2, 1.2),  -- Domate
(4,  2.0,  17.0,0.1, 2.2),  -- Patate
(5,  0.9,  9.6, 0.2, 2.8),  -- Karrota
(6,  2.9,  3.6, 0.4, 2.2),  -- Spinaq
(12, 31.0, 0.0, 3.6, 0.0),  -- Mish pule
(13, 26.0, 0.0,17.0, 0.0),  -- Mish viçi
(14, 13.0, 1.1,11.0, 0.0),  -- Vezë
(15, 3.4,  4.8, 3.6, 0.0),  -- Qumësht
(19, 2.7,  28.0,0.3, 0.4),  -- Oriz
(20, 5.0,  25.0,1.1, 1.8);  -- Pasta

-- ── Recipes ────────────────────────────────────────────────
INSERT INTO Recipes (id, title, description, instructions, prep_time_min, cook_time_min, servings, difficulty, is_public, created_by, updated_by) VALUES
(1,'Pasta me domate dhe hudhër','Klasike italiane e shpejtë','Ziej pastën. Skuq hudhrin në vaj ulliri. Shto domatet e grira. Sezono dhe hidh pastën.', 10, 15, 2, 'easy',   1, 1, 1),
(2,'Oriz me mish pule',         'I shëndetshëm dhe i thjeshtë','Skuq pulën. Shto qepën dhe karrota. Shto orizin dhe ujin. Ziej 25 min.',                 15, 30, 3, 'medium', 1, 2, 2),
(3,'Sallatë greke',             'E freskët dhe nutritive',  'Prit domaten, kastravecin. Shto djathë dhe ullinj. Vaj ulliri dhe limon.',               12, 0,  2, 'easy',   1, 2, 2),
(4,'Omletë me spinaq',          'Mëngjes i shpejtë',        'Rrih vezët. Skuq spinaqin. Hidh vezët mbi spinaq dhe piq deri sa të forcohet.',           5,  8,  1, 'easy',   1, 3, 3),
(5,'Supë me perime',            'E ngrohtë dhe komode',     'Prit të gjitha perimet. Ziej me ujë dhe erëza 25 min. Shto majdanoz në fund.',            15, 25, 4, 'easy',   1, 3, 3),
(6,'Mish viçi me patate',       'Tradicionale shqiptare',   'Skuq mishin. Shto qepën dhe patatën. Ziej ose piq 50 min deri sa të zbutet.',            20, 50, 4, 'hard',   1, 1, 1),
(7,'Smoothie me banane',        'Mëngjes shëndetësor',      'Blej bananën me qumësht, kos dhe tërshërë deri kremoz.',                                  5,  0,  1, 'easy',   1, 2, 2),
(8,'Brusketa me domate',        'Antipasto i shpejtë',      'Thek bukën. Prit domaten me hudhër dhe majdanoz. Vaj ulliri sipër.',                      10, 5,  2, 'easy',   1, 3, 3),
(9,'Pasta me djathë të bardhë', 'Kuzhinë shqiptare',        'Ziej pastën, shto djathë të thërrmuar, gjalpë dhe piper.',                               8,  12, 2, 'easy',   1, 1, 1),
(10,'Sallatë me mollë-karrota', 'Ideale për fëmijë',        'Grij mollën dhe karrotën. Shto limon dhe kos për salcë të lehtë.',                       10, 0,  2, 'easy',   1, 2, 2);

-- ── RecipeIngredients ──────────────────────────────────────
INSERT INTO RecipeIngredients (recipe_id, ingredient_id, quantity, unit, is_optional, created_by, updated_by) VALUES
-- Pasta me domate (1)
(1,20,0.25,'kg',0,1,1),(1,1,0.4,'kg',0,1,1),(1,7,0.02,'kg',0,1,1),(1,23,0.03,'l',0,1,1),
-- Oriz me pule (2)
(2,19,0.35,'kg',0,2,2),(2,12,0.45,'kg',0,2,2),(2,5,0.2,'kg',0,2,2),(2,2,0.15,'kg',0,2,2),
-- Sallatë greke (3)
(3,1,0.35,'kg',0,2,2),(3,8,0.25,'kg',0,2,2),(3,16,0.15,'kg',0,2,2),(3,23,0.03,'l',0,2,2),
-- Omletë (4)
(4,14,3,'cope',0,3,3),(4,6,0.1,'kg',0,3,3),(4,18,0.02,'kg',0,3,3),
-- Supë perime (5)
(5,4,0.4,'kg',0,3,3),(5,5,0.25,'kg',0,3,3),(5,2,0.1,'kg',0,3,3),(5,1,0.25,'kg',0,3,3),
-- Mish viçi (6)
(6,13,0.6,'kg',0,1,1),(6,4,0.8,'kg',0,1,1),(6,2,0.2,'kg',0,1,1),(6,23,0.04,'l',0,1,1),
-- Smoothie (7)
(7,10,1,'cope',0,2,2),(7,22,0.05,'kg',0,2,2),(7,15,0.25,'l',0,2,2),
-- Brusketa (8)
(8,21,2,'cope',0,3,3),(8,1,0.25,'kg',0,3,3),(8,7,0.01,'kg',0,3,3),(8,23,0.02,'l',0,3,3),
-- Pasta djathë (9)
(9,20,0.25,'kg',0,1,1),(9,16,0.12,'kg',0,1,1),(9,18,0.02,'kg',0,1,1),
-- Sallatë mollë (10)
(10,9,0.25,'kg',0,2,2),(10,5,0.2,'kg',0,2,2),(10,11,0.03,'kg',0,2,2);

-- ── Stores ─────────────────────────────────────────────────
INSERT INTO Stores (id, name, address, phone, email, is_active, manager_id, created_by, updated_by) VALUES
(1, 'Fresh Market Prishtinë', 'Rr. UÇK 45, Prishtinë',    '+383 44 111 222', 'fresh@market.com', 1, 2, 1, 1),
(2, 'Bio Shqip',              'Rr. Fehmi Agani 12, Prizren','+383 44 333 444', 'bio@shqip.com',    1, 2, 1, 1),
(3, 'Mega Store',             'Bul. Bill Clinton 8, Gjilan','+383 44 555 666', 'mega@store.com',   1, 2, 1, 1);

-- ── StoreProductPrices ─────────────────────────────────────
INSERT INTO StoreProductPrices (store_id, ingredient_id, price, unit, is_available) VALUES
-- Fresh Market
(1,1,0.80,'kg',1),(1,2,0.60,'kg',1),(1,3,1.20,'kg',1),(1,4,0.50,'kg',1),
(1,5,0.70,'kg',1),(1,6,1.50,'kg',1),(1,7,2.00,'kg',1),(1,8,0.90,'kg',1),
(1,12,3.50,'kg',1),(1,13,5.00,'kg',1),(1,14,0.20,'cope',1),
(1,15,0.60,'l',1),(1,16,2.50,'kg',1),(1,17,0.80,'l',1),
(1,19,1.00,'kg',1),(1,20,1.20,'kg',1),(1,21,0.30,'cope',1),
(1,23,4.50,'l',1),(1,24,0.30,'kg',1),
-- Bio Shqip
(2,1,1.00,'kg',1),(2,6,2.00,'kg',1),(2,12,4.00,'kg',1),(2,16,3.00,'kg',1),
(2,23,5.50,'l',1),(2,14,0.25,'cope',1),(2,17,1.00,'l',1),
-- Mega Store
(3,1,0.75,'kg',1),(3,4,0.45,'kg',1),(3,5,0.65,'kg',1),(3,12,3.20,'kg',1),
(3,19,0.90,'kg',1),(3,20,1.10,'kg',1),(3,23,4.20,'l',1),(3,24,0.28,'kg',1);

-- ── Demo Inventory (User 3 — Blerta) ─────────────────────
INSERT INTO InventoryItems (user_id, ingredient_id, quantity, purchase_date, expiry_date, location, created_by, updated_by) VALUES
(3, 1,  0.5,  CURDATE() - INTERVAL 1 DAY, CURDATE() + INTERVAL 2 DAY, 'Frigorifer', 3, 3),
(3, 12, 0.8,  CURDATE() - INTERVAL 1 DAY, CURDATE() + INTERVAL 1 DAY, 'Frigorifer', 3, 3),
(3, 20, 1.0,  CURDATE() - INTERVAL 5 DAY, CURDATE() + INTERVAL 360 DAY,'Qilar',     3, 3),
(3, 15, 1.0,  CURDATE() - INTERVAL 2 DAY, CURDATE() + INTERVAL 3 DAY, 'Frigorifer', 3, 3),
(3, 7,  0.1,  CURDATE() - INTERVAL 10 DAY,CURDATE() + INTERVAL 50 DAY,'Qilar',      3, 3),
(3, 23, 0.5,  CURDATE() - INTERVAL 30 DAY,CURDATE() + INTERVAL 330 DAY,'Qilar',     3, 3),
(3, 19, 2.0,  CURDATE() - INTERVAL 7 DAY, CURDATE() + INTERVAL 358 DAY,'Qilar',     3, 3),
(3, 14, 6.0,  CURDATE() - INTERVAL 2 DAY, CURDATE() + INTERVAL 18 DAY,'Frigorifer', 3, 3);

-- Demo inventory (User 4 — Driton)
INSERT INTO InventoryItems (user_id, ingredient_id, quantity, purchase_date, expiry_date, location, created_by, updated_by) VALUES
(4, 12, 1.0,  CURDATE() - INTERVAL 1 DAY, CURDATE() + INTERVAL 2 DAY, 'Frigorifer', 4, 4),
(4, 4,  1.5,  CURDATE() - INTERVAL 5 DAY, CURDATE() + INTERVAL 40 DAY,'Qilar',      4, 4),
(4, 5,  0.5,  CURDATE() - INTERVAL 3 DAY, CURDATE() + INTERVAL 27 DAY,'Frigorifer', 4, 4),
(4, 13, 0.5,  CURDATE() - INTERVAL 1 DAY, CURDATE() + INTERVAL 3 DAY, 'Frigorifer', 4, 4);

-- Backfill InventoryItems.unit (kolonë e shtuar) nga njësia e Ingredients
UPDATE InventoryItems ii
JOIN Ingredients i ON i.id = ii.ingredient_id
SET ii.unit = i.unit
WHERE ii.unit IS NULL;

-- ── ConsumptionLog (ML training data) ─────────────────────
INSERT INTO ConsumptionLog (user_id, ingredient_id, recipe_id, quantity_used, consumed_at, created_by, updated_by) VALUES
(3, 12, 2, 0.45, CURDATE() - INTERVAL 5 DAY, 3, 3),
(3, 20, 1, 0.25, CURDATE() - INTERVAL 4 DAY, 3, 3),
(3, 1,  3, 0.35, CURDATE() - INTERVAL 3 DAY, 3, 3),
(3, 14, 4, 3.00, CURDATE() - INTERVAL 2 DAY, 3, 3),
(3, 12, 5, 0.40, CURDATE() - INTERVAL 1 DAY, 3, 3),
(4, 12, 2, 0.40, CURDATE() - INTERVAL 6 DAY, 4, 4),
(4, 13, 6, 0.60, CURDATE() - INTERVAL 4 DAY, 4, 4),
(4, 4,  5, 0.40, CURDATE() - INTERVAL 2 DAY, 4, 4),
(5, 1,  3, 0.35, CURDATE() - INTERVAL 3 DAY, 5, 5),
(5, 20, 9, 0.25, CURDATE() - INTERVAL 1 DAY, 5, 5);

-- ── WasteLog (ML training data) ───────────────────────────
INSERT INTO WasteLog (user_id, ingredient_id, quantity_wasted, reason, wasted_at, created_by, updated_by) VALUES
(3, 1,  0.20, 'expired',  CURDATE() - INTERVAL 3 DAY, 3, 3),
(3, 15, 0.30, 'spoiled',  CURDATE() - INTERVAL 1 DAY, 3, 3),
(4, 13, 0.20, 'expired',  CURDATE() - INTERVAL 2 DAY, 4, 4),
(5, 6,  0.15, 'spoiled',  CURDATE() - INTERVAL 4 DAY, 5, 5);

-- ── Notifications demo ─────────────────────────────────────
INSERT INTO Notifications (user_id, type, title, message, is_read) VALUES
(3, 'expiry_alert',  'Mish pule po skadon!', 'Mishi i pulës skadon nesër. Planifiko ta gatuash sot.', 0),
(3, 'system',        'Mirë se erdhe!',        'Llogaria juaj u aktivizua. Fillo duke shtuar inventarin!', 1),
(4, 'expiry_alert',  'Domate skadojnë!',      'Domatet skadojnë pas 2 ditësh. Shfrytëzoji!', 0);

-- ── RecipeRatings ──────────────────────────────────────────
INSERT INTO RecipeRatings (user_id, recipe_id, rating, comment) VALUES
(3, 1, 5, 'Shumë e shijshme dhe e shpejtë!'),
(3, 3, 4, 'E freskët dhe e lehtë.'),
(4, 2, 5, 'Klasike familjare!'),
(4, 6, 3, 'Pak e vështirë por e mirë.'),
(5, 1, 4, 'Perfekte për darkë.'),
(5, 7, 5, 'Smoothie i mrekullueshëm!');

-- ── MealPlans demo ─────────────────────────────────────────
INSERT INTO MealPlans (id, user_id, title, week_start, week_end, status, created_by, updated_by) VALUES
(1, 3, 'Plani i Javës', CURDATE(), CURDATE() + INTERVAL 6 DAY, 'active', 3, 3);

INSERT INTO MealPlanDays (meal_plan_id, recipe_id, day_of_week, meal_type, servings, created_by, updated_by) VALUES
(1, 1, 1, 'lunch',  2, 3, 3),
(1, 3, 1, 'dinner', 2, 3, 3),
(1, 2, 2, 'lunch',  3, 3, 3),
(1, 4, 3, 'breakfast', 1, 3, 3),
(1, 5, 3, 'lunch',  4, 3, 3);

-- ── ShoppingList demo ──────────────────────────────────────
INSERT INTO ShoppingLists (id, user_id, title, status, created_by, updated_by) VALUES
(1, 3, 'Blerjet e Javës', 'active', 3, 3);

INSERT INTO ShoppingListItems (shopping_list_id, ingredient_id, quantity_needed, unit, is_purchased, created_by, updated_by) VALUES
(1, 16, 0.20, 'kg',   0, 3, 3),
(1, 8,  0.30, 'kg',   0, 3, 3),
(1, 23, 0.10, 'l',    1, 3, 3),
(1, 11, 0.05, 'kg',   0, 3, 3);

-- ── AuditLogs demo ─────────────────────────────────────────
INSERT INTO AuditLogs (user_id, action, entity, entity_id, new_value, ip_address) VALUES
(1, 'LOGIN',  'Users', 1, '{"email":"admin@smartkitchen.com"}', '127.0.0.1'),
(3, 'CREATE', 'InventoryItems', 1, '{"ingredient":"Mish pule","quantity":0.8}', '192.168.1.10'),
(3, 'CREATE', 'MealPlans', 1, '{"title":"Plani i Javës"}', '192.168.1.10');

-- ── Verifikim final ────────────────────────────────────────
SELECT '✅ Seed kompletuar!' AS status;

SELECT TABLE_NAME AS tabela,
       TABLE_ROWS AS rreshtat_approx
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'smart_kitchen'
ORDER BY TABLE_NAME;
