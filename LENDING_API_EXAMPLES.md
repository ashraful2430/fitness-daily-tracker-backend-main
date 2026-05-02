# Lending Feature - API Examples & Testing Guide

## Setup

Before testing, ensure:

1. MongoDB is running
2. Server is running on `http://localhost:5000`
3. You have a valid JWT token from authentication

## Getting a Token

First, register and login to get a JWT token:

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

The response will include a JWT token. Extract it and use in the examples below.

```bash
export TOKEN="your_jwt_token_here"
```

---

## Example 1: Create a Loan from Personal Balance

**Scenario:** User has 5000 in personal balance and wants to lend 1000 to a friend.

### Request

```bash
curl -X POST http://localhost:5000/api/loans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "borrowerName": "Alice Johnson",
    "amount": 1000,
    "sourceType": "PERSONAL"
  }'
```

### Response (201 Created)

```json
{
  "message": "Loan created successfully",
  "loan": {
    "_id": "66a1b2c3d4e5f6g7h8i9j0k1",
    "lenderUserId": "user123",
    "borrowerName": "Alice Johnson",
    "amount": 1000,
    "sourceType": "PERSONAL",
    "status": "ACTIVE",
    "createdAt": "2024-05-02T10:30:00Z",
    "updatedAt": "2024-05-02T10:30:00Z"
  },
  "ledger": {
    "_id": "ledger123",
    "loanId": "66a1b2c3d4e5f6g7h8i9j0k1",
    "type": "DISBURSEMENT",
    "amount": 1000,
    "createdAt": "2024-05-02T10:30:00Z"
  }
}
```

### Result

- User's personalBalance: 5000 → 4000
- Loan created with status: ACTIVE
- LoanLedger shows DISBURSEMENT of 1000

---

## Example 2: Create a Loan from Borrowed Source

**Scenario:** User borrows 2000 from Bank X and lends it to Bob.

### Request

```bash
curl -X POST http://localhost:5000/api/loans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "borrowerName": "Bob Smith",
    "amount": 2000,
    "sourceType": "BORROWED",
    "borrowedFromName": "Bank X"
  }'
```

### Response (201 Created)

```json
{
  "message": "Loan created successfully",
  "loan": {
    "_id": "66a1b2c3d4e5f6g7h8i9j0k2",
    "lenderUserId": "user123",
    "borrowerName": "Bob Smith",
    "amount": 2000,
    "sourceType": "BORROWED",
    "borrowedFromName": "Bank X",
    "externalDebtId": "debt123",
    "status": "ACTIVE",
    "createdAt": "2024-05-02T11:00:00Z"
  },
  "ledger": {
    "_id": "ledger124",
    "loanId": "66a1b2c3d4e5f6g7h8i9j0k2",
    "type": "DISBURSEMENT",
    "amount": 2000
  }
}
```

### Result

- User's personalBalance: unchanged (still 4000)
- ExternalDebt created: totalAmount=2000, remainingAmount=2000
- Loan created referencing the external debt

---

## Example 3: Error - Insufficient Balance

**Scenario:** User tries to lend 10000 but only has 4000 balance.

### Request

```bash
curl -X POST http://localhost:5000/api/loans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "borrowerName": "Charlie Brown",
    "amount": 10000,
    "sourceType": "PERSONAL"
  }'
```

### Response (400 Bad Request)

```json
{
  "message": "Insufficient balance"
}
```

---

## Example 4: Error - Missing Creditor Name

**Scenario:** User tries to create BORROWED loan without creditor name.

### Request

```bash
curl -X POST http://localhost:5000/api/loans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "borrowerName": "Diana Prince",
    "amount": 1500,
    "sourceType": "BORROWED"
  }'
```

### Response (400 Bad Request)

```json
{
  "message": "Creditor name is required for BORROWED source type"
}
```

---

## Example 5: Process Partial Repayment

**Scenario:** Alice repays 300 of the 1000 loan.

### Request

```bash
curl -X POST http://localhost:5000/api/loans/66a1b2c3d4e5f6g7h8i9j0k1/repay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "repaymentAmount": 300
  }'
```

### Response (200 OK)

```json
{
  "message": "Repayment processed successfully",
  "loan": {
    "_id": "66a1b2c3d4e5f6g7h8i9j0k1",
    "status": "PARTIALLY_PAID",
    "amount": 1000
  },
  "ledger": {
    "_id": "ledger125",
    "loanId": "66a1b2c3d4e5f6g7h8i9j0k1",
    "type": "REPAYMENT",
    "amount": 300
  },
  "remainingLoanAmount": 700
}
```

### Result

- Loan status: ACTIVE → PARTIALLY_PAID
- User's personalBalance: 4000 → 4300
- LoanLedger now shows: DISBURSEMENT(1000) + REPAYMENT(300)
- Remaining loan amount: 700

---

## Example 6: Process Full Repayment

**Scenario:** Alice repays the remaining 700.

### Request

```bash
curl -X POST http://localhost:5000/api/loans/66a1b2c3d4e5f6g7h8i9j0k1/repay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "repaymentAmount": 700
  }'
```

### Response (200 OK)

```json
{
  "message": "Repayment processed successfully",
  "loan": {
    "_id": "66a1b2c3d4e5f6g7h8i9j0k1",
    "status": "CLOSED",
    "amount": 1000
  },
  "ledger": {
    "_id": "ledger126",
    "type": "REPAYMENT",
    "amount": 700
  },
  "remainingLoanAmount": 0
}
```

### Result

- Loan status: PARTIALLY_PAID → CLOSED
- User's personalBalance: 4300 → 5000 (back to original)
- Loan is now fully repaid

---

## Example 7: Get All Loans

**Scenario:** Retrieve all loans for the user.

### Request

```bash
curl -X GET http://localhost:5000/api/loans \
  -H "Authorization: Bearer $TOKEN"
```

### Response (200 OK)

```json
{
  "loans": [
    {
      "_id": "66a1b2c3d4e5f6g7h8i9j0k1",
      "lenderUserId": "user123",
      "borrowerName": "Alice Johnson",
      "amount": 1000,
      "sourceType": "PERSONAL",
      "status": "CLOSED",
      "totalDisbursed": 1000,
      "totalRepaid": 1000,
      "remainingAmount": 0,
      "createdAt": "2024-05-02T10:30:00Z"
    },
    {
      "_id": "66a1b2c3d4e5f6g7h8i9j0k2",
      "lenderUserId": "user123",
      "borrowerName": "Bob Smith",
      "amount": 2000,
      "sourceType": "BORROWED",
      "borrowedFromName": "Bank X",
      "status": "ACTIVE",
      "totalDisbursed": 2000,
      "totalRepaid": 0,
      "remainingAmount": 2000,
      "createdAt": "2024-05-02T11:00:00Z"
    }
  ]
}
```

---

## Example 8: Get Loan Details with History

**Scenario:** Get detailed transaction history for a specific loan.

### Request

```bash
curl -X GET http://localhost:5000/api/loans/66a1b2c3d4e5f6g7h8i9j0k1 \
  -H "Authorization: Bearer $TOKEN"
```

### Response (200 OK)

```json
{
  "loan": {
    "_id": "66a1b2c3d4e5f6g7h8i9j0k1",
    "borrowerName": "Alice Johnson",
    "amount": 1000,
    "status": "CLOSED"
  },
  "ledger": [
    {
      "_id": "ledger123",
      "type": "DISBURSEMENT",
      "amount": 1000,
      "createdAt": "2024-05-02T10:30:00Z"
    },
    {
      "_id": "ledger125",
      "type": "REPAYMENT",
      "amount": 300,
      "createdAt": "2024-05-02T12:00:00Z"
    },
    {
      "_id": "ledger126",
      "type": "REPAYMENT",
      "amount": 700,
      "createdAt": "2024-05-02T13:00:00Z"
    }
  ],
  "totalDisbursed": 1000,
  "totalRepaid": 1000,
  "remainingAmount": 0
}
```

---

## Example 9: Get User's External Debts

**Scenario:** List all debts (money borrowed from creditors).

### Request

```bash
curl -X GET http://localhost:5000/api/debts \
  -H "Authorization: Bearer $TOKEN"
```

### Response (200 OK)

```json
{
  "debts": [
    {
      "_id": "debt123",
      "creditorName": "Bank X",
      "totalAmount": 2000,
      "remainingAmount": 2000,
      "isCleared": false,
      "createdAt": "2024-05-02T11:00:00Z"
    }
  ]
}
```

---

## Example 10: Get Financial Summary

**Scenario:** Get complete financial overview.

### Request

```bash
curl -X GET http://localhost:5000/api/financial-summary \
  -H "Authorization: Bearer $TOKEN"
```

### Response (200 OK)

```json
{
  "personalBalance": 5000,
  "totalLent": 1000,
  "totalOutstandingLoans": 0,
  "totalBorrowedLiability": 2000,
  "netPosition": 3000,
  "activeDebts": [
    {
      "_id": "debt123",
      "creditorName": "Bank X",
      "totalAmount": 2000,
      "remainingAmount": 2000,
      "isCleared": false
    }
  ]
}
```

### Interpretation

- Personal balance: 5000
- Total money lent: 1000
- Money still owed to user: 0 (all loans repaid)
- Money user owes creditors: 2000
- Net position (assets - liabilities): 3000

---

## Example 11: Get Lending Statistics

**Scenario:** Get lending performance metrics.

### Request

```bash
curl -X GET http://localhost:5000/api/lending-stats \
  -H "Authorization: Bearer $TOKEN"
```

### Response (200 OK)

```json
{
  "totalActiveLoans": 1,
  "totalPartiallyPaidLoans": 0,
  "totalClosedLoans": 1,
  "totalMoneyLent": 3000,
  "averageLoanAmount": 1500,
  "totalMoneyReceived": 1000
}
```

---

## Example 12: Get Loan Transaction History

**Scenario:** Get all transactions for a specific loan.

### Request

```bash
curl -X GET http://localhost:5000/api/loans/66a1b2c3d4e5f6g7h8i9j0k2/transactions \
  -H "Authorization: Bearer $TOKEN"
```

### Response (200 OK)

```json
{
  "loan": {
    "_id": "66a1b2c3d4e5f6g7h8i9j0k2",
    "borrowerName": "Bob Smith",
    "amount": 2000
  },
  "transactions": [
    {
      "_id": "ledger124",
      "type": "DISBURSEMENT",
      "amount": 2000,
      "createdAt": "2024-05-02T11:00:00Z"
    },
    {
      "_id": "ledger127",
      "type": "REPAYMENT",
      "amount": 500,
      "createdAt": "2024-05-02T14:00:00Z"
    }
  ]
}
```

---

## Example 13: Error - Overpayment Attempt

**Scenario:** User tries to repay more than the remaining balance.

### Request

```bash
curl -X POST http://localhost:5000/api/loans/66a1b2c3d4e5f6g7h8i9j0k2/repay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "repaymentAmount": 3000
  }'
```

### Response (400 Bad Request)

```json
{
  "message": "Repayment amount (3000) exceeds remaining loan amount (1500)"
}
```

---

## Testing Workflow

### Workflow 1: Complete Personal Loan Cycle

```bash
# 1. Set token
export TOKEN="your_token"

# 2. Create personal loan
curl -X POST http://localhost:5000/api/loans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"borrowerName":"Alice","amount":500,"sourceType":"PERSONAL"}'

# 3. Check financial summary (balance should decrease)
curl -X GET http://localhost:5000/api/financial-summary \
  -H "Authorization: Bearer $TOKEN"

# 4. Make partial repayment
curl -X POST http://localhost:5000/api/loans/{loan_id}/repay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"repaymentAmount":200}'

# 5. Make final repayment
curl -X POST http://localhost:5000/api/loans/{loan_id}/repay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"repaymentAmount":300}'

# 6. Check final status (balance should be restored)
curl -X GET http://localhost:5000/api/loans/{loan_id} \
  -H "Authorization: Bearer $TOKEN"
```

### Workflow 2: Borrowed Loan with Multiple Disbursements

```bash
# 1. Create first borrowed loan from Bank X
curl -X POST http://localhost:5000/api/loans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"borrowerName":"Charlie","amount":1000,"sourceType":"BORROWED","borrowedFromName":"Bank X"}'

# 2. Create second borrowed loan from same creditor
curl -X POST http://localhost:5000/api/loans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"borrowerName":"Diana","amount":500,"sourceType":"BORROWED","borrowedFromName":"Bank X"}'

# 3. Check external debt (should show 1500 total from Bank X)
curl -X GET http://localhost:5000/api/debts \
  -H "Authorization: Bearer $TOKEN"

# 4. Repay both loans
curl -X POST http://localhost:5000/api/loans/{loan_id_1}/repay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"repaymentAmount":1000}'

curl -X POST http://localhost:5000/api/loans/{loan_id_2}/repay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"repaymentAmount":500}'

# 5. Check debt (should show isCleared=true)
curl -X GET http://localhost:5000/api/debts \
  -H "Authorization: Bearer $TOKEN"
```

---

## Response Status Codes

| Code | Meaning                        |
| ---- | ------------------------------ |
| 200  | Success                        |
| 201  | Created successfully           |
| 400  | Bad request (validation error) |
| 404  | Not found                      |
| 500  | Server error                   |

---

## Environment Variables

Add to `.env`:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fitness-tracker
JWT_SECRET=your_secret_key
NODE_ENV=development
```

---

## Debugging Tips

1. **Check PersonalBalance:** The user must have sufficient balance for PERSONAL loans
2. **Token Expiry:** JWT tokens expire after 24h, login again if needed
3. **Loan ID:** Use the `_id` field from loan creation response
4. **Transaction Consistency:** All operations are atomic, either all succeed or all fail

---

## Performance Considerations

1. **Indexes created:**
   - Loans fetched by userId and createdAt (sorted list)
   - Loans queried by status (active loans)
   - Debts queried by isCleared status

2. **Ledger queries:**
   - Fast lookups by loanId due to index
   - Aggregations on small result sets

3. **Financial summary:**
   - Computes on-demand, can be cached if performance needed

---

## Security Notes

1. **All endpoints require authentication** (JWT token)
2. **Users can only access their own loans and debts**
3. **Transaction validation prevents race conditions**
4. **Input validation prevents injection attacks**
