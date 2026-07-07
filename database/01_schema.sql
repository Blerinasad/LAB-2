-- ============================================================
-- Smart Kitchen & Marketplace System
-- Database Schema — MySQL 8.0
-- Version: FINAL — Lab Course 2 + ML, UBT 2025–2026
-- Tabela: 29 (10 të detyrueshme + 19 domain)
-- Siguria: 3NF, FK, INDEX, audit fields
-- Ekzekuto: MySQL Workbench → File → Open SQL Script → Execute All
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO';
SET NAMES utf8mb4;

DROP DATABASE IF EXISTS smart_kitchen;
CREATE DATABASE smart_kitchen
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smart_kitchen;

-- ============================================================
-- BLLOKU A — 10 TABELAT E DETYRUESHME
-- ============================================================

-- 1. Users
CREATE TABLE Users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt hash, kurrë plaintext',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT UNSIGNED NULL,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_email (email),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Roles
CREATE TABLE Roles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. UserRoles
CREATE TABLE UserRoles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  role_id INT UNSIGNED NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_role (user_id, role_id),
  CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES Roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Permissions
CREATE TABLE Permissions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. RolePermissions
CREATE TABLE RolePermissions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_id INT UNSIGNED NOT NULL,
  permission_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rp (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES Roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES Permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. RefreshTokens
CREATE TABLE RefreshTokens (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL COMMENT 'Ruhet tokeni i plotë si fingerprint unik',
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_token (token_hash(191)),
  INDEX idx_expires (expires_at),
  INDEX idx_user (user_id),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. AuditLogs
CREATE TABLE AuditLogs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL COMMENT 'LOGIN, CREATE, UPDATE, DELETE, ORDER_STATUS',
  entity VARCHAR(100) NOT NULL COMMENT 'Tabelën e prekur: Users, Orders, etj.',
  entity_id INT UNSIGNED NULL,
  old_value JSON NULL,
  new_value JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_entity (entity, entity_id),
  INDEX idx_user (user_id),
  INDEX idx_created (created_at),
  CONSTRAINT fk_al_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Notifications
CREATE TABLE Notifications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  type VARCHAR(50) NOT NULL COMMENT 'expiry_alert, order, system, recommendation',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user_read (user_id, is_read),
  INDEX idx_created (created_at),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Settings
CREATE TABLE Settings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(100) NOT NULL,
  value TEXT NOT NULL,
  description VARCHAR(255) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Files
CREATE TABLE Files (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  entity VARCHAR(100) NOT NULL COMMENT 'Users, Recipes, Ingredients — tabela e lidhur',
  entity_id INT UNSIGNED NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT UNSIGNED NOT NULL DEFAULT 0,
  mime_type VARCHAR(100) NULL,
  uploaded_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_entity (entity, entity_id),
  CONSTRAINT fk_file_user FOREIGN KEY (uploaded_by) REFERENCES Users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- BLLOKU B — TABELA DOMAIN (19 tabela)
-- ============================================================

-- 11. Categories
CREATE TABLE Categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  color_hex VARCHAR(7) NULL,
  created_by INT UNSIGNED NULL,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Ingredients
CREATE TABLE Ingredients (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id INT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  unit VARCHAR(20) NOT NULL COMMENT 'piece, g, kg, ml, l, pack, box, bottle, can, slice',
  calories_per_100 DECIMAL(8,2) NULL,
  shelf_life_days INT UNSIGNED NULL COMMENT 'Jetëgjatësia standarde në ditë',
  created_by INT UNSIGNED NULL,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_name (name),
  INDEX idx_category (category_id),
  FULLTEXT KEY ft_name (name),
  CONSTRAINT fk_ingr_cat FOREIGN KEY (category_id) REFERENCES Categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. NutritionInfo
CREATE TABLE NutritionInfo (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ingredient_id INT UNSIGNED NOT NULL,
  protein_g DECIMAL(8,2) NULL,
  carbs_g DECIMAL(8,2) NULL,
  fat_g DECIMAL(8,2) NULL,
  fiber_g DECIMAL(8,2) NULL,
  sugar_g DECIMAL(8,2) NULL,
  sodium_mg DECIMAL(8,2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ingredient (ingredient_id),
  CONSTRAINT fk_ni_ingr FOREIGN KEY (ingredient_id) REFERENCES Ingredients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. InventoryItems
CREATE TABLE InventoryItems (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  ingredient_id INT UNSIGNED NOT NULL,
  quantity DECIMAL(10,2) NOT NULL CHECK (quantity >= 0),
  unit VARCHAR(20) NULL COMMENT 'Njësia e blerjes; nëse NULL përdoret unit i Ingredients',
  purchase_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  location VARCHAR(50) NULL COMMENT 'Frigorifer, Ngrirës, Qilar',
  notes TEXT NULL,
  created_by INT UNSIGNED NULL,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user_expiry (user_id, expiry_date),
  INDEX idx_expiry (expiry_date),
  CONSTRAINT fk_inv_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_ingr FOREIGN KEY (ingredient_id) REFERENCES Ingredients(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. ExpiryAlerts
CREATE TABLE ExpiryAlerts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  inventory_item_id INT UNSIGNED NOT NULL,
  days_until_expiry INT NOT NULL,
  is_sent TINYINT(1) NOT NULL DEFAULT 0,
  sent_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_alert (user_id, is_sent),
  CONSTRAINT fk_ea_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ea_inv FOREIGN KEY (inventory_item_id) REFERENCES InventoryItems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Recipes
CREATE TABLE Recipes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  instructions TEXT NOT NULL,
  prep_time_min INT UNSIGNED NULL,
  cook_time_min INT UNSIGNED NULL,
  servings INT UNSIGNED NULL,
  meal_type ENUM('breakfast','lunch','dinner','snack') NULL,
  difficulty ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  is_public TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT UNSIGNED NULL,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FULLTEXT KEY ft_title (title),
  INDEX idx_difficulty (difficulty),
  INDEX idx_public (is_public),
  CONSTRAINT fk_rec_user FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. RecipeIngredients
CREATE TABLE RecipeIngredients (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  recipe_id INT UNSIGNED NOT NULL,
  ingredient_id INT UNSIGNED NOT NULL,
  quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(20) NOT NULL,
  is_optional TINYINT(1) NOT NULL DEFAULT 0,
  created_by INT UNSIGNED NULL,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_recipe_ingr (recipe_id, ingredient_id),
  CONSTRAINT fk_ri_recipe FOREIGN KEY (recipe_id) REFERENCES Recipes(id) ON DELETE CASCADE,
  CONSTRAINT fk_ri_ingr FOREIGN KEY (ingredient_id) REFERENCES Ingredients(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. UserPreferences
CREATE TABLE UserPreferences (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  is_vegetarian TINYINT(1) NOT NULL DEFAULT 0,
  is_vegan TINYINT(1) NOT NULL DEFAULT 0,
  is_gluten_free TINYINT(1) NOT NULL DEFAULT 0,
  is_lactose_free TINYINT(1) NOT NULL DEFAULT 0,
  allergies JSON NULL COMMENT '["nuts","shellfish"]',
  calorie_goal INT UNSIGNED NULL COMMENT 'kcal per ditë',
  created_by INT UNSIGNED NULL,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user (user_id),
  CONSTRAINT fk_up_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. ConsumptionLog (ML training data)
CREATE TABLE ConsumptionLog (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  ingredient_id INT UNSIGNED NOT NULL,
  recipe_id INT UNSIGNED NULL,
  quantity_used DECIMAL(10,2) NOT NULL CHECK (quantity_used > 0),
  consumed_at DATE NOT NULL,
  created_by INT UNSIGNED NULL,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user_date (user_id, consumed_at),
  INDEX idx_ingredient (ingredient_id),
  CONSTRAINT fk_cl_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cl_ingr FOREIGN KEY (ingredient_id) REFERENCES Ingredients(id) ON DELETE RESTRICT,
  CONSTRAINT fk_cl_recipe FOREIGN KEY (recipe_id) REFERENCES Recipes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. WasteLog (ML training data)
CREATE TABLE WasteLog (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  ingredient_id INT UNSIGNED NOT NULL,
  quantity_wasted DECIMAL(10,2) NOT NULL CHECK (quantity_wasted > 0),
  reason ENUM('expired','spoiled','overcooked','other') NOT NULL DEFAULT 'expired',
  wasted_at DATE NOT NULL,
  created_by INT UNSIGNED NULL,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user_date (user_id, wasted_at),
  INDEX idx_ingredient (ingredient_id),
  CONSTRAINT fk_wl_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  CONSTRAINT fk_wl_ingr FOREIGN KEY (ingredient_id) REFERENCES Ingredients(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. MealPlans
CREATE TABLE MealPlans (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  status ENUM('draft','active','completed') NOT NULL DEFAULT 'draft',
  created_by INT UNSIGNED NULL,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user_week (user_id, week_start),
  CONSTRAINT fk_mp_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. MealPlanDays
CREATE TABLE MealPlanDays (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  meal_plan_id INT UNSIGNED NOT NULL,
  recipe_id INT UNSIGNED NOT NULL,
  day_of_week TINYINT NOT NULL COMMENT '1=E Hënë, 7=E Diel',
  meal_type ENUM('breakfast','lunch','dinner','snack') NOT NULL,
  servings INT UNSIGNED NOT NULL DEFAULT 1,
  created_by INT UNSIGNED NULL,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_plan_day (meal_plan_id, day_of_week),
  CONSTRAINT fk_mpd_plan FOREIGN KEY (meal_plan_id) REFERENCES MealPlans(id) ON DELETE CASCADE,
  CONSTRAINT fk_mpd_recipe FOREIGN KEY (recipe_id) REFERENCES Recipes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. ShoppingLists
CREATE TABLE ShoppingLists (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  status ENUM('active','completed','archived') NOT NULL DEFAULT 'active',
  created_by INT UNSIGNED NULL,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user_status (user_id, status),
  CONSTRAINT fk_sl_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. ShoppingListItems
CREATE TABLE ShoppingListItems (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  shopping_list_id INT UNSIGNED NOT NULL,
  ingredient_id INT UNSIGNED NOT NULL,
  quantity_needed DECIMAL(10,2) NOT NULL CHECK (quantity_needed > 0),
  quantity_bought DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit VARCHAR(20) NOT NULL,
  is_purchased TINYINT(1) NOT NULL DEFAULT 0,
  created_by INT UNSIGNED NULL,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_list (shopping_list_id),
  UNIQUE KEY uq_shopping_list_ingredient (shopping_list_id, ingredient_id),
  CONSTRAINT fk_sli_list FOREIGN KEY (shopping_list_id) REFERENCES ShoppingLists(id) ON DELETE CASCADE,
  CONSTRAINT fk_sli_ingr FOREIGN KEY (ingredient_id) REFERENCES Ingredients(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. Stores (Marketplace)
CREATE TABLE Stores (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(255) NULL,
  phone VARCHAR(30) NULL,
  email VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  manager_id INT UNSIGNED NULL,
  created_by INT UNSIGNED NULL,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_active (is_active),
  CONSTRAINT fk_store_mgr FOREIGN KEY (manager_id) REFERENCES Users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. RecipeRatings (shtesë për ML training)
CREATE TABLE RecipeRatings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  recipe_id INT UNSIGNED NOT NULL,
  rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_recipe (user_id, recipe_id),
  INDEX idx_recipe (recipe_id),
  CONSTRAINT fk_rr_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  CONSTRAINT fk_rr_recipe FOREIGN KEY (recipe_id) REFERENCES Recipes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Marketplace orders table (nga migrimi, i integruar)
CREATE TABLE StoreOrders (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  store_id INT UNSIGNED NOT NULL,
  shopping_list_id INT UNSIGNED NULL,
  status ENUM('pending','accepted','rejected','preparing','out_for_delivery','delivered','cancelled')
                                 NOT NULL DEFAULT 'pending',
  delivery_address VARCHAR(255) NULL,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  notes TEXT NULL,
  courier_id INT UNSIGNED NULL,
  created_by INT UNSIGNED NULL,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user (user_id),
  INDEX idx_store (store_id),
  INDEX idx_status (status),
  INDEX idx_courier (courier_id),
  CONSTRAINT fk_so_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_so_store FOREIGN KEY (store_id) REFERENCES Stores(id) ON DELETE RESTRICT,
  CONSTRAINT fk_so_courier FOREIGN KEY (courier_id) REFERENCES Users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE StoreOrderItems (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id INT UNSIGNED NOT NULL,
  ingredient_id INT UNSIGNED NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_order (order_id),
  CONSTRAINT fk_soi_order FOREIGN KEY (order_id) REFERENCES StoreOrders(id) ON DELETE CASCADE,
  CONSTRAINT fk_soi_ingr FOREIGN KEY (ingredient_id) REFERENCES Ingredients(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE StoreProductPrices (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id INT UNSIGNED NOT NULL,
  ingredient_id INT UNSIGNED NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  unit VARCHAR(20) NOT NULL,
  is_available TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_store_ingr (store_id, ingredient_id),
  CONSTRAINT fk_spp_store FOREIGN KEY (store_id) REFERENCES Stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_spp_ingr FOREIGN KEY (ingredient_id) REFERENCES Ingredients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- TABELA COUNT: 29 tabela (10 detyrueshme + 19 domain)
-- Plotëson minimumi 24 të kursit
-- ============================================================

SELECT 'TABELA' AS tip, TABLE_NAME AS emri,
       TABLE_ROWS AS rreshtat
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'smart_kitchen'
ORDER BY TABLE_NAME;
