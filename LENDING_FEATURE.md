# Lending Feature Documentation

## Overview

The lending feature tracks loans given by a user with two funding sources (personal balance or borrowed from external creditors). It maintains correct balance and liability accounting with atomic transactions to ensure data consistency.

## Data Models

### 1. User (Updated)

```
- id: ObjectId
- name: string
- email: string
- password: string
- role: "user" | "admin"
- personalBalance: number (default: 0)
- lastLoginDate?: Date
- loginStreak: number
- longestLoginStreak: number
- timestamps: { createdAt, updatedAt }
```

### 2. Loan

```
- _id: ObjectId
- lenderUserId: string (reference to User)
- borrowerName: string
- borrowerId?: string (optional, for internal borrowers)
- amount: number (the original loan amount)
- sourceType: "PERSONAL" | "BORROWED"
- borrowedFromName?: string (creditor name if sourceType is BORROWED)
- externalDebtId?: string (reference to ExternalDebt if BORROWED)
- status: "ACTIVE" | "PARTIALLY_PAID" | "CLOSED"
- timestamps: { createdAt, updatedAt }

Indexes:
- { lenderUserId: 1, createdAt: -1 }
- { lenderUserId: 1, status: 1 }
```

### 3. LoanLedger (Transaction History)

```
- _id: ObjectId
- loanId: string (reference to Loan)
- type: "DISBURSEMENT" | "REPAYMENT"
- amount: number
- timestamps: { createdAt, updatedAt }

Indexes:
- { loanId: 1, createdAt: -1 }
```

### 4. ExternalDebt (Used only for BORROWED source)

```
- _id: ObjectId
- userId: string (reference to User)
- creditorName: string
- totalAmount: number (total borrowed from this creditor)
- remainingAmount: number (amount still owed to this creditor)
- isCleared: boolean (marks if debt is fully repaid)
- timestamps: { createdAt, updatedAt }

Indexes:
- { userId: 1, creditorName: 1 }
- { userId: 1, isCleared: 1 }
```

## Business Logic

### 1. Create Loan

**Endpoint:** `POST /api/loans`

**Request Body:**

```json
{
  "borrowerName": "John Doe",
  "amount": 1000,
  "sourceType": "PERSONAL",
  "borrowedFromName": null
}
```

**Process:**

1. **Validation:**
   - Amount must be > 0
   - sourceType must be PERSONAL or BORROWED
   - If sourceType is BORROWED, borrowedFromName is required

2. **If sourceType = PERSONAL:**
   - Check `user.personalBalance >= amount`
   - If insufficient: throw "Insufficient balance"
   - Deduct amount from user.personalBalance

3. **If sourceType = BORROWED:**
   - Create or update ExternalDebt record
   - Increase totalAmount and remainingAmount
   - Do NOT modify personalBalance

4. **Create Loan record** with status = "ACTIVE"

5. **Create LoanLedger entry** with type = "DISBURSEMENT"

6. **All operations wrapped in MongoDB transaction** for atomicity

**Response:**

```json
{
  "message": "Loan created successfully",
  "loan": { ... },
  "ledger": { ... }
}
```

---

### 2. Repay Loan

**Endpoint:** `POST /api/loans/:id/repay`

**Request Body:**

```json
{
  "repaymentAmount": 500
}
```

**Process:**

1. **Validation:**
   - repaymentAmount must be > 0
   - repaymentAmount must be <= remaining loan balance
   - Loan must exist

2. **Calculate remaining loan amount:**
   - Sum all DISBURSEMENT entries
   - Sum all REPAYMENT entries
   - remaining = disbursements - repayments

3. **Validate no overpayment:**
   - If repaymentAmount > remaining: throw error

4. **If sourceType = PERSONAL:**
   - Add repaymentAmount to user.personalBalance

5. **If sourceType = BORROWED:**
   - Reduce ExternalDebt.remainingAmount
   - If remainingAmount = 0: mark ExternalDebt.isCleared = true

6. **Create LoanLedger entry** with type = "REPAYMENT"

7. **Update Loan status:**
   - If new remaining = 0 → status = "CLOSED"
   - If 0 < new remaining < original amount → status = "PARTIALLY_PAID"
   - Otherwise remain "ACTIVE"

8. **All operations wrapped in MongoDB transaction**

**Response:**

```json
{
  "message": "Repayment processed successfully",
  "loan": { ... },
  "ledger": { ... },
  "remainingLoanAmount": 500
}
```

---

### 3. Get All Loans

**Endpoint:** `GET /api/loans`

**Process:**

- Fetch all loans for authenticated user
- Enrich with transaction details:
  - totalDisbursed: sum of all disbursements
  - totalRepaid: sum of all repayments
  - remainingAmount: totalDisbursed - totalRepaid
- Return sorted by createdAt descending

**Response:**

```json
{
  "loans": [
    {
      "_id": "...",
      "lenderUserId": "...",
      "borrowerName": "John",
      "amount": 1000,
      "sourceType": "PERSONAL",
      "status": "PARTIALLY_PAID",
      "totalDisbursed": 1000,
      "totalRepaid": 500,
      "remainingAmount": 500,
      "createdAt": "..."
    }
  ]
}
```

---

### 4. Get Loan Details with History

**Endpoint:** `GET /api/loans/:id`

**Response:**

```json
{
  "loan": { ... },
  "ledger": [
    { "type": "DISBURSEMENT", "amount": 1000, "createdAt": "..." },
    { "type": "REPAYMENT", "amount": 500, "createdAt": "..." }
  ],
  "totalDisbursed": 1000,
  "totalRepaid": 500,
  "remainingAmount": 500
}
```

---

### 5. Get User's External Debts

**Endpoint:** `GET /api/debts`

**Response:**

```json
{
  "debts": [
    {
      "_id": "...",
      "creditorName": "Bank X",
      "totalAmount": 2000,
      "remainingAmount": 1500,
      "isCleared": false,
      "createdAt": "..."
    }
  ]
}
```

---

### 6. Get Financial Summary

**Endpoint:** `GET /api/financial-summary`

**Calculations:**

- `personalBalance`: user's current balance
- `totalLent`: sum of all PERSONAL source loans
- `totalOutstandingLoans`: sum of remaining amounts for all personal loans
- `totalBorrowedLiability`: sum of remainingAmount for all active external debts
- `netPosition`: personalBalance - totalBorrowedLiability
- `activeDebts`: list of all non-cleared external debts

**Response:**

```json
{
  "personalBalance": 5000,
  "totalLent": 2000,
  "totalOutstandingLoans": 1000,
  "totalBorrowedLiability": 1500,
  "netPosition": 3500,
  "activeDebts": [ ... ]
}
```

---

### 7. Get Lending Statistics

**Endpoint:** `GET /api/lending-stats`

**Calculations:**

- `totalActiveLoans`: count of loans with status = ACTIVE
- `totalPartiallyPaidLoans`: count of loans with status = PARTIALLY_PAID
- `totalClosedLoans`: count of loans with status = CLOSED
- `totalMoneyLent`: sum of all loan amounts
- `averageLoanAmount`: totalMoneyLent / number of loans
- `totalMoneyReceived`: sum of all REPAYMENT ledger entries

**Response:**

```json
{
  "totalActiveLoans": 5,
  "totalPartiallyPaidLoans": 2,
  "totalClosedLoans": 1,
  "totalMoneyLent": 5000,
  "averageLoanAmount": 833.33,
  "totalMoneyReceived": 2000
}
```

---

### 8. Get Loan Transaction History

**Endpoint:** `GET /api/loans/:id/transactions`

**Response:**

```json
{
  "loan": { ... },
  "transactions": [
    { "type": "DISBURSEMENT", "amount": 1000, "createdAt": "..." },
    { "type": "REPAYMENT", "amount": 300, "createdAt": "..." },
    { "type": "REPAYMENT", "amount": 200, "createdAt": "..." }
  ]
}
```

---

## Validation Rules

1. **No negative or zero amounts:**
   - Loan amount must be > 0
   - Repayment amount must be > 0

2. **Borrowed source requires creditor:**
   - If sourceType = BORROWED, borrowedFromName is mandatory

3. **No overpayment:**
   - Repayment amount cannot exceed remaining loan balance

4. **Sufficient balance for PERSONAL:**
   - User must have enough personalBalance to create PERSONAL loan

5. **Loan must exist:**
   - Cannot repay or fetch non-existent loans

6. **Authentication required:**
   - All endpoints require valid JWT token

---

## Error Handling

### Common Error Codes

| Status | Error                                                | Cause                                                  |
| ------ | ---------------------------------------------------- | ------------------------------------------------------ |
| 400    | "Insufficient balance"                               | User's personalBalance < loan amount (PERSONAL source) |
| 400    | "Loan amount must be greater than zero"              | Amount <= 0                                            |
| 400    | "Creditor name is required for BORROWED source type" | BORROWED source without borrowedFromName               |
| 400    | "Repayment amount exceeds remaining loan amount"     | Overpayment attempted                                  |
| 404    | "Loan not found"                                     | Loan ID doesn't exist                                  |
| 404    | "User not found"                                     | User ID doesn't exist                                  |
| 500    | "Failed to create loan"                              | Database or system error                               |
| 500    | "Failed to process repayment"                        | Database or system error                               |

---

## Transaction Safety

All critical operations (create loan, repay loan) are wrapped in MongoDB transactions:

```typescript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // All database operations use: { session }
  await User.findByIdAndUpdate(..., { session });
  await Loan.create(..., { session });
  // ...
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  await session.endSession();
}
```

This ensures:

- Atomicity: All operations succeed or all fail
- Consistency: Balance and debt remain consistent
- Isolation: Concurrent requests don't interfere
- Durability: Committed transactions persist

---

## Example Scenarios

### Scenario 1: Loan from Personal Balance

```
User has personalBalance = 5000
Creates loan: amount=1000, sourceType=PERSONAL

Result:
- personalBalance becomes 4000
- Loan created with status=ACTIVE
- LoanLedger entry: DISBURSEMENT for 1000
```

### Scenario 2: Loan from Borrowed Source

```
User creates loan: amount=2000, sourceType=BORROWED, borrowedFromName="Bank X"

Result:
- personalBalance unchanged
- ExternalDebt created: totalAmount=2000, remainingAmount=2000
- Loan created with status=ACTIVE, externalDebtId reference
```

### Scenario 3: Partial Repayment

```
Loan has 1000 disbursed, 0 repaid
User repays: repaymentAmount=600

Result:
- Loan status changes to PARTIALLY_PAID
- LoanLedger entry: REPAYMENT for 600
- personalBalance increases by 600 (if PERSONAL source)
- OR ExternalDebt.remainingAmount decreases by 600 (if BORROWED source)
```

### Scenario 4: Full Repayment

```
Loan has 1000 disbursed, 400 repaid (remaining=600)
User repays: repaymentAmount=600

Result:
- Loan status changes to CLOSED
- LoanLedger entry: REPAYMENT for 600
- All balance updates applied
```

---

## Advanced Features (Future Enhancements)

1. **Interest Calculation:**
   - Add interestRate field to Loan
   - Calculate compound interest per period
   - Track interest separately in ledger

2. **Due Dates & Overdue Tracking:**
   - Add dueDate to Loan
   - Add overdueDays calculation
   - Send notifications for overdue loans

3. **Partial Disbursement:**
   - Allow multiple DISBURSEMENT entries
   - Track schedule for installments
   - Support scheduled disbursements

4. **Audit Logs:**
   - Create AuditLog model
   - Log all state changes
   - Include user, timestamp, before/after

5. **Soft Delete:**
   - Add isDeleted, deletedAt fields
   - Archive closed loans
   - Maintain historical record

6. **Currency Support:**
   - Add currency field to Loan, ExternalDebt
   - Support multi-currency conversions
   - Track exchange rates

7. **Notifications:**
   - Email/SMS for repayment reminders
   - Alert for overdue loans
   - Summary reports

8. **Approval Workflow:**
   - Add approvalStatus field
   - Required approval for large loans
   - Audit trail for approvals

---

## Testing Checklist

- [ ] Create loan from personal balance with sufficient funds
- [ ] Reject loan creation with insufficient funds
- [ ] Create loan from borrowed source
- [ ] Reject loan with missing creditor name (BORROWED)
- [ ] Process partial repayment
- [ ] Process full repayment
- [ ] Verify loan status changes
- [ ] Verify balance updates
- [ ] Verify debt tracking
- [ ] Test concurrent repayments
- [ ] Verify financial summary accuracy
- [ ] Verify transaction rollback on error
- [ ] Test authentication on all endpoints
- [ ] Test input validation

---

## API Reference

| Method | Endpoint                    | Description             | Auth |
| ------ | --------------------------- | ----------------------- | ---- |
| POST   | /api/loans                  | Create new loan         | ✓    |
| POST   | /api/loans/:id/repay        | Process repayment       | ✓    |
| GET    | /api/loans                  | Get all user loans      | ✓    |
| GET    | /api/loans/:id              | Get loan details        | ✓    |
| GET    | /api/loans/:id/transactions | Get transaction history | ✓    |
| GET    | /api/debts                  | Get external debts      | ✓    |
| GET    | /api/financial-summary      | Get financial summary   | ✓    |
| GET    | /api/lending-stats          | Get lending statistics  | ✓    |

---

## Database Indexes

Optimized for common queries:

```javascript
// Loan indexes
db.loans.createIndex({ lenderUserId: 1, createdAt: -1 });
db.loans.createIndex({ lenderUserId: 1, status: 1 });

// LoanLedger indexes
db.loanlodgers.createIndex({ loanId: 1, createdAt: -1 });

// ExternalDebt indexes
db.externaldbts.createIndex({ userId: 1, creditorName: 1 });
db.externaldbts.createIndex({ userId: 1, isCleared: 1 });
```

---

## Installation

1. **Dependencies already included:** mongoose, express, jsonwebtoken

2. **Models created:**
   - src/models/Loan.ts
   - src/models/LoanLedger.ts
   - src/models/ExternalDebt.ts

3. **Service created:**
   - src/services/loanService.ts

4. **Controller created:**
   - src/controllers/loanController.ts

5. **Routes created:**
   - src/routes/loanRoutes.ts

6. **Validation created:**
   - src/validation/loanValidation.ts

7. **Server updated:**
   - src/server.ts (import and register routes)

8. **User model updated:**
   - Added personalBalance field

---

## Support & Maintenance

For issues or enhancements:

1. Check error messages for specific validation failures
2. Review transaction logs for data consistency
3. Verify indexes are created for performance
4. Monitor database connections for transaction overhead
