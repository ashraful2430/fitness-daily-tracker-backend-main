# Quick Reference Guide

## API Endpoints Summary

### Create & Repay

```
POST   /api/loans                Create new loan
POST   /api/loans/:id/repay      Process repayment
```

### View Loans

```
GET    /api/loans                Get all loans (with details)
GET    /api/loans/:id            Get loan details + history
GET    /api/loans/:id/transactions  Get transactions
```

### View Debts & Summary

```
GET    /api/debts                Get external debts
GET    /api/financial-summary    Get balance/liability overview
GET    /api/lending-stats        Get lending statistics
```

---

## Quick cURL Examples

### Create Personal Loan

```bash
curl -X POST http://localhost:5000/api/loans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "borrowerName": "Alice",
    "amount": 1000,
    "sourceType": "PERSONAL"
  }'
```

### Create Borrowed Loan

```bash
curl -X POST http://localhost:5000/api/loans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "borrowerName": "Bob",
    "amount": 2000,
    "sourceType": "BORROWED",
    "borrowedFromName": "Bank X"
  }'
```

### Process Repayment

```bash
curl -X POST http://localhost:5000/api/loans/LOAN_ID/repay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"repaymentAmount": 500}'
```

### Get All Loans

```bash
curl -X GET http://localhost:5000/api/loans \
  -H "Authorization: Bearer $TOKEN"
```

### Get Financial Summary

```bash
curl -X GET http://localhost:5000/api/financial-summary \
  -H "Authorization: Bearer $TOKEN"
```

---

## Response Formats

### Success Response (Create Loan)

```json
{
  "message": "Loan created successfully",
  "loan": {
    "_id": "...",
    "lenderUserId": "...",
    "borrowerName": "Alice",
    "amount": 1000,
    "sourceType": "PERSONAL",
    "status": "ACTIVE",
    "createdAt": "2024-05-02T10:30:00Z"
  },
  "ledger": {
    "_id": "...",
    "loanId": "...",
    "type": "DISBURSEMENT",
    "amount": 1000
  }
}
```

### Success Response (Get Summary)

```json
{
  "personalBalance": 5000,
  "totalLent": 1000,
  "totalOutstandingLoans": 500,
  "totalBorrowedLiability": 2000,
  "netPosition": 3000,
  "activeDebts": [...]
}
```

### Error Response

```json
{
  "message": "Insufficient balance"
}
```

---

## Key Concepts

| Term                | Meaning                            |
| ------------------- | ---------------------------------- |
| **personalBalance** | User's available funds for lending |
| **PERSONAL**        | Loan funded from personal balance  |
| **BORROWED**        | Loan funded from external creditor |
| **ACTIVE**          | Loan just created, unpaid          |
| **PARTIALLY_PAID**  | Loan has some repayments           |
| **CLOSED**          | Loan fully repaid                  |
| **DISBURSEMENT**    | Money lent out (ledger entry)      |
| **REPAYMENT**       | Money repaid (ledger entry)        |
| **ExternalDebt**    | Money owed to a creditor           |
| **netPosition**     | personalBalance - totalBorrowed    |

---

## Business Rules

1. **Amount must be > 0**
   - No zero or negative loans

2. **PERSONAL loans need sufficient balance**
   - Check: user.personalBalance >= amount

3. **BORROWED loans need creditor name**
   - "borrowedFromName" is required

4. **No overpayment**
   - Repayment ≤ (disbursed - repaid)

5. **BORROWED doesn't affect balance**
   - Only PERSONAL loans reduce balance

6. **All operations are atomic**
   - Either all succeed or all fail

---

## File Locations

```
src/models/
  ├── Loan.ts
  ├── LoanLedger.ts
  └── ExternalDebt.ts

src/services/
  └── loanService.ts

src/controllers/
  └── loanController.ts

src/routes/
  └── loanRoutes.ts

src/validation/
  └── loanValidation.ts
```

---

## Documentation Files

| File                       | Purpose                |
| -------------------------- | ---------------------- |
| IMPLEMENTATION_SUMMARY.md  | Project overview       |
| LENDING_FEATURE.md         | Complete specification |
| LENDING_API_EXAMPLES.md    | API usage examples     |
| LENDING_DATABASE_SCHEMA.md | Database details       |
| FILE_STRUCTURE.md          | File organization      |
| QUICK_REFERENCE.md         | This file              |

---

## Status Transitions

### Personal Loan

```
ACTIVE (200, 300 repaid)
  ↓ (repay 200)
PARTIALLY_PAID (remaining 500)
  ↓ (repay 500)
CLOSED (remaining 0)
```

---

## Common Errors & Solutions

| Error                    | Cause                     | Solution               |
| ------------------------ | ------------------------- | ---------------------- |
| "Insufficient balance"   | Balance < loan amount     | Add more balance first |
| "Creditor name required" | BORROWED without creditor | Add borrowedFromName   |
| "Overpayment"            | Repay > remaining         | Check remaining amount |
| "Loan not found"         | Invalid ID                | Verify loan exists     |
| 401 Unauthorized         | Missing token             | Include JWT token      |

---

## Testing Quick Steps

```bash
# 1. Get token
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -d '{"email":"test@example.com","password":"pass"}' \
  | jq -r '.token')

# 2. Create loan
LOAN=$(curl -X POST http://localhost:5000/api/loans \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"borrowerName":"Test","amount":500,"sourceType":"PERSONAL"}' \
  | jq -r '.loan._id')

# 3. Check summary
curl -X GET http://localhost:5000/api/financial-summary \
  -H "Authorization: Bearer $TOKEN"

# 4. Repay
curl -X POST http://localhost:5000/api/loans/$LOAN/repay \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"repaymentAmount":250}'

# 5. Check status
curl -X GET http://localhost:5000/api/loans/$LOAN \
  -H "Authorization: Bearer $TOKEN"
```

---

## Key Service Methods

```typescript
// Create loan
await loanService.createLoan(
  userId, borrowerName, amount, sourceType, borrowedFromName?
)

// Process repayment
await loanService.repayLoan(loanId, repaymentAmount)

// Get all loans
await loanService.getUserLoans(userId)

// Get loan with history
await loanService.getLoanDetails(loanId)

// Get external debts
await loanService.getUserDebts(userId)

// Get complete financial overview
await loanService.getFinancialSummary(userId)

// Get lending statistics
await loanService.getLendingStats(userId)
```

---

## Database Indexes

```javascript
// Loan queries optimized
db.loans.createIndex({ lenderUserId: 1, createdAt: -1 });
db.loans.createIndex({ lenderUserId: 1, status: 1 });

// Transaction history
db.loanlodgers.createIndex({ loanId: 1, createdAt: -1 });

// Debt queries
db.externaldbts.createIndex({ userId: 1, creditorName: 1 });
db.externaldbts.createIndex({ userId: 1, isCleared: 1 });
```

---

## Response Status Codes

| Code | Meaning                        |
| ---- | ------------------------------ |
| 201  | Created                        |
| 200  | OK                             |
| 400  | Bad request / validation error |
| 401  | Unauthorized (no token)        |
| 404  | Not found                      |
| 500  | Server error                   |

---

## Next Steps

1. **Read** LENDING_FEATURE.md (understand the feature)
2. **Review** LENDING_API_EXAMPLES.md (see all examples)
3. **Test** using provided cURL commands
4. **Integrate** into your frontend
5. **Monitor** using provided queries

---

Refer to the detailed documentation for complete information!
