-- Smart Kitchen Marketplace Extension
-- The same schema is integrated in database/01_schema.sql.
-- Use this file only when adding marketplace tables to an older installation.

USE smart_kitchen;

CREATE TABLE IF NOT EXISTS Stores (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(150) NOT NULL,
  address      VARCHAR(255) NULL,
  phone        VARCHAR(30) NULL,
  email        VARCHAR(255) NULL,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  manager_id   INT UNSIGNED NULL,
  created_by   INT UNSIGNED NULL,
  updated_by   INT UNSIGNED NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_active (is_active),
  CONSTRAINT fk_store_mgr FOREIGN KEY (manager_id) REFERENCES Users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS StoreOrders (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          INT UNSIGNED NOT NULL,
  store_id         INT UNSIGNED NOT NULL,
  shopping_list_id INT UNSIGNED NULL,
  status           ENUM('pending','approved','rejected','ready_for_pickup','picked_up','delivered','cancelled') NOT NULL DEFAULT 'pending',
  delivery_address VARCHAR(255) NULL,
  delivery_fee     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  notes            TEXT NULL,
  courier_id       INT UNSIGNED NULL,
  created_by       INT UNSIGNED NULL,
  updated_by       INT UNSIGNED NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user (user_id),
  INDEX idx_store (store_id),
  INDEX idx_status (status),
  INDEX idx_courier (courier_id),
  CONSTRAINT fk_so_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_so_store FOREIGN KEY (store_id) REFERENCES Stores(id) ON DELETE RESTRICT,
  CONSTRAINT fk_so_courier FOREIGN KEY (courier_id) REFERENCES Users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS StoreOrderItems (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id      INT UNSIGNED NOT NULL,
  ingredient_id INT UNSIGNED NOT NULL,
  quantity      DECIMAL(10,2) NOT NULL,
  unit          VARCHAR(20) NOT NULL,
  unit_price    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_price   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_order (order_id),
  CONSTRAINT fk_soi_order FOREIGN KEY (order_id) REFERENCES StoreOrders(id) ON DELETE CASCADE,
  CONSTRAINT fk_soi_ingr FOREIGN KEY (ingredient_id) REFERENCES Ingredients(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS StoreProductPrices (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id      INT UNSIGNED NOT NULL,
  ingredient_id INT UNSIGNED NOT NULL,
  price         DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  unit          VARCHAR(20) NOT NULL,
  is_available  TINYINT(1) NOT NULL DEFAULT 1,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_store_ingr (store_id, ingredient_id),
  CONSTRAINT fk_spp_store FOREIGN KEY (store_id) REFERENCES Stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_spp_ingr FOREIGN KEY (ingredient_id) REFERENCES Ingredients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
