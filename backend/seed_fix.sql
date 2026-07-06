-- ============================================================
--  SEED FIX — Smart Kitchen
--  Ekzekuto këtë nëse login nuk punon
--  mysql -u root -p smart_kitchen < seed_fix.sql
-- ============================================================

USE smart_kitchen;

-- Pastro të dhënat e vjetra
DELETE FROM UserRoles;
DELETE FROM RefreshTokens;
DELETE FROM Users;

-- ============================================================
--  USERS me hash të saktë
--  Password123! => $2b$12$v70vlK3csn02U0cakek9qeESv6.W7V8VmT8prHQ4Nlgoqz./MpRtW
-- ============================================================

INSERT INTO Users (id, first_name, last_name, email, password_hash, is_active) VALUES
(1, 'Admin',  'System',   'admin@smartkitchen.com',  '$2b$12$v70vlK3csn02U0cakek9qeESv6.W7V8VmT8prHQ4Nlgoqz./MpRtW', 1),
(2, 'Artan',  'Berisha',  'artan@smartkitchen.com',  '$2b$12$v70vlK3csn02U0cakek9qeESv6.W7V8VmT8prHQ4Nlgoqz./MpRtW', 1),
(3, 'Blerta', 'Krasniqi', 'blerta@smartkitchen.com', '$2b$12$v70vlK3csn02U0cakek9qeESv6.W7V8VmT8prHQ4Nlgoqz./MpRtW', 1),
(4, 'Driton', 'Hoxha',    'driton@smartkitchen.com', '$2b$12$v70vlK3csn02U0cakek9qeESv6.W7V8VmT8prHQ4Nlgoqz./MpRtW', 1),
(5, 'Fjolla', 'Gashi',    'fjolla@smartkitchen.com', '$2b$12$v70vlK3csn02U0cakek9qeESv6.W7V8VmT8prHQ4Nlgoqz./MpRtW', 1),
(6, 'Korrier','Demo',     'courier@smartkitchen.com', '$2b$12$v70vlK3csn02U0cakek9qeESv6.W7V8VmT8prHQ4Nlgoqz./MpRtW', 1);

-- ============================================================
--  ROLES (sigurohu që ekzistojnë)
-- ============================================================

INSERT IGNORE INTO Roles (id, name, description) VALUES
(1, 'Admin',   'Aksesi i plotë'),
(2, 'Manager', 'Menaxhon receta dhe përdorues'),
(3, 'User',    'Përdorues standard'),
(4, 'Courier', 'Korrieri menaxhon marrjen dhe dorëzimin e porosive');

-- ============================================================
--  USER ROLES
-- ============================================================

INSERT INTO UserRoles (user_id, role_id) VALUES
(1, 1),  -- Admin   → Admin
(2, 2),  -- Artan   → Manager
(3, 3),  -- Blerta  → User
(4, 3),  -- Driton  → User
(5, 3),  -- Fjolla  → User
(6, 4);  -- Korrier → Courier

-- ============================================================
--  VERIFIKIM
-- ============================================================

SELECT
  u.id,
  u.first_name,
  u.last_name,
  u.email,
  u.is_active,
  GROUP_CONCAT(r.name) AS roles
FROM Users u
LEFT JOIN UserRoles ur ON ur.user_id = u.id
LEFT JOIN Roles r      ON r.id = ur.role_id
GROUP BY u.id;
