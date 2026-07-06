import { body, param, validationResult } from "express-validator";

// Helper — kthen gabimet
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  next();
};

// Auth rules
export const loginRules = [
  body("email").isEmail().normalizeEmail().withMessage("Email i pavlefshëm"),
  body("password").isLength({ min: 6 }).withMessage("Fjalëkalimi duhet të ketë të paktën 6 karaktere"),
];

export const forgotRules = [
  body("email").isEmail().normalizeEmail().withMessage("Email i pavlefshëm"),
];

export const resetRules = [
  body("token").notEmpty().withMessage("Token mungon"),
  body("uid").isInt({ min: 1 }).withMessage("UID i pavlefshëm"),
  body("password").isLength({ min: 8 }).withMessage("Fjalëkalimi duhet të ketë të paktën 8 karaktere"),
];

// Inventory rules
export const inventoryRules = [
  body("ingredient_id").isInt({ min: 1 }).withMessage("Ingredient i pavlefshëm"),
  body("quantity").isFloat({ min: 0.01 }).withMessage("Sasia duhet të jetë pozitive"),
  body("expiry_date").isDate().withMessage("Data e skadimit e pavlefshme"),
];

// Recipe rules
export const recipeRules = [
  body("title").trim().isLength({ min: 3, max: 120 }).withMessage("Titulli duhet 3-120 karaktere"),
  body("instructions").trim().notEmpty().withMessage("Udhëzimet janë të detyrueshme"),
];

// Shopping list rules
export const shoppingListRules = [
  body("title").trim().isLength({ min: 3, max: 120 }).withMessage("Titulli duhet 3-120 karaktere"),
];

export const shoppingItemRules = [
  body("ingredient_id").isInt({ min: 1 }).withMessage("Ingredient i pavlefshëm"),
  body("quantity_needed").isFloat({ min: 0.01 }).withMessage("Sasia duhet të jetë pozitive"),
  body("unit").trim().notEmpty().withMessage("Njësia është e detyrueshme"),
];

// ID param rule
export const idRules = [
  param("id").isInt({ min: 1 }).withMessage("ID e pavlefshme"),
];
