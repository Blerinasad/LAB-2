INSERT IGNORE INTO UserRoles (user_id, role_id)
SELECT u.id, r.id
FROM Users u
JOIN Roles r ON r.name = 'User'
LEFT JOIN UserRoles ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL;
