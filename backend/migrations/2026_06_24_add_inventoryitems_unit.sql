-- ============================================================
--  Migration: shto kolonën e munguar InventoryItems.unit
--  Problemi: Inventory.service.js dhe seed_demo_data.js përdorin
--  prej kohësh ii.unit, por 01_schema.sql nuk e kishte këtë kolonë
--  (mospërputhje skeme që bënte 'npm run seed' dhe disa endpoints
--  të Inventory-t të dështonin).
-- ============================================================
ALTER TABLE InventoryItems
  ADD COLUMN unit VARCHAR(20) NULL COMMENT 'Njësia e blerjes; nëse NULL përdoret unit i Ingredients'
  AFTER quantity;
