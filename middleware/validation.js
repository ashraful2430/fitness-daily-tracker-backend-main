const { body, validationResult, param, query } = require('express-validator');
const { AppError } = require('./errorHandler');

/**
 * Validation middleware to check for errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.param,
      message: err.msg,
    }));
    throw new AppError(
      `Validation failed: ${formattedErrors.map((e) => e.message).join(', ')}`,
      400
    );
  }
  next();
};

/**
 * Auth Validation Rules
 */
const authValidation = {
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and numbers'),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
  ],

  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],

  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    body('age')
      .optional()
      .isInt({ min: 13, max: 120 })
      .withMessage('Age must be between 13 and 120'),
    body('weight')
      .optional()
      .isFloat({ min: 20, max: 500 })
      .withMessage('Weight must be between 20 and 500 kg'),
    body('height')
      .optional()
      .isFloat({ min: 100, max: 250 })
      .withMessage('Height must be between 100 and 250 cm'),
  ],
};

/**
 * Workout Validation Rules
 */
const workoutValidation = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Workout name is required')
      .isLength({ max: 100 })
      .withMessage('Workout name must not exceed 100 characters'),
    body('duration')
      .isInt({ min: 1, max: 1440 })
      .withMessage('Duration must be between 1 and 1440 minutes'),
    body('calories')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Calories must be a positive number'),
    body('intensity')
      .isIn(['low', 'medium', 'high'])
      .withMessage('Intensity must be low, medium, or high'),
    body('date')
      .isISO8601()
      .withMessage('Invalid date format'),
  ],

  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Workout name must not exceed 100 characters'),
    body('duration')
      .optional()
      .isInt({ min: 1, max: 1440 })
      .withMessage('Duration must be between 1 and 1440 minutes'),
    body('calories')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Calories must be a positive number'),
    body('intensity')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Intensity must be low, medium, or high'),
  ],
};

/**
 * Meal Validation Rules
 */
const mealValidation = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Meal name is required')
      .isLength({ max: 100 })
      .withMessage('Meal name must not exceed 100 characters'),
    body('calories')
      .isInt({ min: 0, max: 10000 })
      .withMessage('Calories must be between 0 and 10000'),
    body('protein')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Protein must be a positive number'),
    body('carbs')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Carbs must be a positive number'),
    body('fat')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Fat must be a positive number'),
    body('mealType')
      .isIn(['breakfast', 'lunch', 'dinner', 'snack'])
      .withMessage('Invalid meal type'),
    body('date')
      .isISO8601()
      .withMessage('Invalid date format'),
  ],

  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Meal name must not exceed 100 characters'),
    body('calories')
      .optional()
      .isInt({ min: 0, max: 10000 })
      .withMessage('Calories must be between 0 and 10000'),
    body('protein')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Protein must be a positive number'),
    body('carbs')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Carbs must be a positive number'),
    body('fat')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Fat must be a positive number'),
    body('mealType')
      .optional()
      .isIn(['breakfast', 'lunch', 'dinner', 'snack'])
      .withMessage('Invalid meal type'),
  ],
};

/**
 * ID Validation
 */
const idValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
];

module.exports = {
  validate,
  authValidation,
  workoutValidation,
  mealValidation,
  idValidation,
};
