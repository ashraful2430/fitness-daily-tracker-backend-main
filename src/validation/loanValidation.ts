import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

/**
 * Validation middleware for creating a loan
 */
export const validateCreateLoan = [
  body("borrowerName")
    .trim()
    .notEmpty()
    .withMessage("Borrower name is required")
    .isLength({ min: 2 })
    .withMessage("Borrower name must be at least 2 characters"),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than zero"),
  body("sourceType")
    .isIn(["PERSONAL", "BORROWED"])
    .withMessage("sourceType must be PERSONAL or BORROWED"),
  body("borrowedFromName")
    .if(() => {
      // This will be checked in the handler
      return false;
    })
    .trim()
    .notEmpty()
    .withMessage("Borrowed from name is required for BORROWED source type"),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

/**
 * Validation middleware for loan repayment
 */
export const validateRepayLoan = [
  body("repaymentAmount")
    .isFloat({ min: 0.01 })
    .withMessage("Repayment amount must be greater than zero"),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
