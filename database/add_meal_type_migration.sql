-- Run this if your Recipes table doesn't have meal_type column
-- MySQL Workbench: paste and execute
ALTER TABLE Recipes 
ADD COLUMN meal_type ENUM('breakfast','lunch','dinner','snack') NULL 
AFTER difficulty;
