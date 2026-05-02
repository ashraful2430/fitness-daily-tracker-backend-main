# Lending Feature - Database Schema & Setup

## MongoDB Collections

### 1. Users Collection (Updated)

```javascript
db.users.insertOne({
  _id: ObjectId("..."),
  name: "John Doe",
  email: "john@example.com",
  password: "hashed_password",
  role: "user",
  personalBalance: 5000, // NEW: tracks personal funds available for lending
  lastLoginDate: ISODate("2024-05-02T10:30:00Z"),
  loginStreak: 5,
  longestLoginStreak: 10,
  createdAt: ISODate("2024-01-01T00:00:00Z"),
  updatedAt: ISODate("2024-05-02T10:30:00Z"),
});
```

**Schema Definition:**

```typescript
interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
  lastLoginDate?: Date | null;
  loginStreak: number;
  longestLoginStreak: number;
  personalBalance: number; // NEW
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 2. Loans Collection (New)

```javascript
db.loans.insertOne({
  _id: ObjectId("66a1b2c3d4e5f6g7h8i9j0k1"),
  lenderUserId: "user123",
  borrowerName: "Alice Johnson",
  borrowerId: null,
  amount: 1000,
  sourceType: "PERSONAL", // PERSONAL | BORROWED
  borrowedFromName: null,
  externalDebtId: null,
  status: "PARTIALLY_PAID", // ACTIVE | PARTIALLY_PAID | CLOSED
  createdAt: ISODate("2024-05-02T10:30:00Z"),
  updatedAt: ISODate("2024-05-02T12:45:00Z"),
});
```

**Schema Definition:**

```typescript
interface ILoan {
  lenderUserId: string; // FK to User
  borrowerName?: string;
  borrowerId?: string; // FK to User (if internal borrower)
  amount: number; // Original loan amount
  sourceType: "PERSONAL" | "BORROWED";
  borrowedFromName?: string; // Creditor name if BORROWED
  externalDebtId?: string; // FK to ExternalDebt if BORROWED
  status: "ACTIVE" | "PARTIALLY_PAID" | "CLOSED";
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**

```javascript
db.loans.createIndex({ lenderUserId: 1, createdAt: -1 });
db.loans.createIndex({ lenderUserId: 1, status: 1 });
```

---

### 3. LoanLedgers Collection (New)

```javascript
db.loanlodgers.insertMany([
  {
    _id: ObjectId("ledger123"),
    loanId: "66a1b2c3d4e5f6g7h8i9j0k1",
    type: "DISBURSEMENT", // DISBURSEMENT | REPAYMENT
    amount: 1000,
    createdAt: ISODate("2024-05-02T10:30:00Z"),
    updatedAt: ISODate("2024-05-02T10:30:00Z"),
  },
  {
    _id: ObjectId("ledger124"),
    loanId: "66a1b2c3d4e5f6g7h8i9j0k1",
    type: "REPAYMENT",
    amount: 300,
    createdAt: ISODate("2024-05-02T12:00:00Z"),
    updatedAt: ISODate("2024-05-02T12:00:00Z"),
  },
  {
    _id: ObjectId("ledger125"),
    loanId: "66a1b2c3d4e5f6g7h8i9j0k1",
    type: "REPAYMENT",
    amount: 700,
    createdAt: ISODate("2024-05-02T13:00:00Z"),
    updatedAt: ISODate("2024-05-02T13:00:00Z"),
  },
]);
```

**Schema Definition:**

```typescript
interface ILoanLedger {
  loanId: string; // FK to Loan
  type: "DISBURSEMENT" | "REPAYMENT";
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**

```javascript
db.loanlodgers.createIndex({ loanId: 1, createdAt: -1 });
```

**Purpose:** Creates immutable audit trail of all loan transactions.

---

### 4. ExternalDebts Collection (New)

```javascript
db.externaldbts.insertOne({
  _id: ObjectId("debt123"),
  userId: "user123",
  creditorName: "Bank X",
  totalAmount: 2000, // Total borrowed from this creditor
  remainingAmount: 1500, // Still owed
  isCleared: false,
  createdAt: ISODate("2024-05-02T11:00:00Z"),
  updatedAt: ISODate("2024-05-02T13:30:00Z"),
});
```

**Schema Definition:**

```typescript
interface IExternalDebt {
  userId: string; // FK to User
  creditorName: string; // E.g., "Bank X", "Mom", "Uncle Joe"
  totalAmount: number; // Total borrowed
  remainingAmount: number; // Still owed
  isCleared: boolean; // True when fully repaid
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**

```javascript
db.externaldbts.createIndex({ userId: 1, creditorName: 1 });
db.externaldbts.createIndex({ userId: 1, isCleared: 1 });
```

**Purpose:** Tracks external liabilities (debts to creditors).

---

## Queries & Aggregations

### Query 1: Get All Loans for User with Details

```javascript
db.loans.aggregate([
  { $match: { lenderUserId: "user123" } },
  {
    $lookup: {
      from: "loanlodgers",
      localField: "_id",
      foreignField: "loanId",
      as: "ledger",
    },
  },
  {
    $addFields: {
      totalDisbursed: {
        $sum: {
          $cond: [
            { $eq: ["$ledger.type", "DISBURSEMENT"] },
            "$ledger.amount",
            0,
          ],
        },
      },
      totalRepaid: {
        $sum: {
          $cond: [{ $eq: ["$ledger.type", "REPAYMENT"] }, "$ledger.amount", 0],
        },
      },
    },
  },
  {
    $addFields: {
      remainingAmount: { $subtract: ["$totalDisbursed", "$totalRepaid"] },
    },
  },
  { $sort: { createdAt: -1 } },
]);
```

### Query 2: Get User's Active Loans

```javascript
db.loans
  .find({
    lenderUserId: "user123",
    status: { $in: ["ACTIVE", "PARTIALLY_PAID"] },
  })
  .sort({ createdAt: -1 });
```

### Query 3: Get All Transactions for a Loan

```javascript
db.loanlodgers
  .find({ loanId: "66a1b2c3d4e5f6g7h8i9j0k1" })
  .sort({ createdAt: 1 });
```

### Query 4: Get User's Active External Debts

```javascript
db.externaldbts
  .find({
    userId: "user123",
    isCleared: false,
  })
  .sort({ createdAt: -1 });
```

### Query 5: Calculate Financial Summary

```javascript
// In service code, use multiple queries:

// 1. Get user balance
const user = db.users.findOne({ _id: userId });
const personalBalance = user.personalBalance;

// 2. Get total lent from personal balance
const personalLoans = db.loans.find({
  lenderUserId: userId,
  sourceType: "PERSONAL",
});

// 3. Get all active debts
const activeDebts = db.externaldbts.find({
  userId: userId,
  isCleared: false,
});
const totalBorrowedLiability = activeDebts.reduce(
  (sum, debt) => sum + debt.remainingAmount,
  0,
);

// 4. Calculate net position
const netPosition = personalBalance - totalBorrowedLiability;
```

---

## Backups & Recovery

### Backup Collections

```bash
# Backup all lending collections
mongodump --uri "mongodb://localhost:27017" \
  --db fitness-tracker \
  --collection loans \
  --out ./backups

mongodump --uri "mongodb://localhost:27017" \
  --db fitness-tracker \
  --collection loanlodgers \
  --out ./backups

mongodump --uri "mongodb://localhost:27017" \
  --db fitness-tracker \
  --collection externaldbts \
  --out ./backups
```

### Restore from Backup

```bash
# Restore collections
mongorestore --uri "mongodb://localhost:27017" \
  --db fitness-tracker \
  ./backups/fitness-tracker
```

---

## Data Consistency Rules

### Invariants to Maintain

1. **Balance Invariant:**

   ```
   user.personalBalance >= 0
   ```

2. **Loan Ledger Invariant:**

   ```
   Sum(REPAYMENT) <= Sum(DISBURSEMENT) for any loan
   ```

3. **Debt Invariant:**

   ```
   0 <= externalDebt.remainingAmount <= externalDebt.totalAmount
   ```

4. **Loan Status Invariant:**

   ```
   If remaining == original amount: status = "ACTIVE"
   If 0 < remaining < original: status = "PARTIALLY_PAID"
   If remaining == 0: status = "CLOSED"
   ```

5. **ExternalDebt Invariant:**
   ```
   If remainingAmount == 0: isCleared = true
   If remainingAmount > 0: isCleared = false
   ```

---

## Transactions & ACID Compliance

### Transaction for Create Loan

```javascript
session = db.getMongo().startSession();
session.startTransaction();

try {
  // 1. Update user balance (if PERSONAL)
  db.users.updateOne(
    { _id: userId },
    { $inc: { personalBalance: -amount } },
    { session: session },
  );

  // 2. Create or update external debt (if BORROWED)
  db.externaldbts.updateOne(
    { userId: userId, creditorName: borrowedFromName },
    {
      $inc: {
        totalAmount: amount,
        remainingAmount: amount,
      },
    },
    { upsert: true, session: session },
  );

  // 3. Create loan
  db.loans.insertOne(
    {
      /* loan doc */
    },
    { session: session },
  );

  // 4. Create ledger entry
  db.loanlodgers.insertOne(
    {
      /* ledger doc */
    },
    { session: session },
  );

  session.commitTransaction();
} catch (error) {
  session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

---

## Migration from Existing System

If migrating from an existing money tracking system:

### Step 1: Add personalBalance Field

```javascript
db.users.updateMany(
  {},
  {
    $set: {
      personalBalance: 0, // Or migrate from existing balance field
    },
  },
);
```

### Step 2: Create Indexes

```javascript
// Loans
db.loans.createIndex({ lenderUserId: 1, createdAt: -1 });
db.loans.createIndex({ lenderUserId: 1, status: 1 });

// Ledgers
db.loanlodgers.createIndex({ loanId: 1, createdAt: -1 });

// External Debts
db.externaldbts.createIndex({ userId: 1, creditorName: 1 });
db.externaldbts.createIndex({ userId: 1, isCleared: 1 });
```

### Step 3: Validate Data

```javascript
// Check for orphaned ledger entries
db.loanlodgers.aggregate([
  {
    $lookup: {
      from: "loans",
      localField: "loanId",
      foreignField: "_id",
      as: "loan",
    },
  },
  { $match: { loan: { $size: 0 } } },
]);

// Check for invalid external debts
db.externaldbts.find({ remainingAmount: { $gt: "$totalAmount" } });

// Check for invalid loan statuses
db.loans.find({
  $or: [{ status: { $nin: ["ACTIVE", "PARTIALLY_PAID", "CLOSED"] } }],
});
```

---

## Performance Optimization

### Index Usage

```javascript
// Fast query for user's loans sorted by date
db.loans.find({ lenderUserId: "user123" }).sort({ createdAt: -1 });
// Uses: { lenderUserId: 1, createdAt: -1 }

// Fast query for active loans
db.loans.find({ lenderUserId: "user123", status: "ACTIVE" });
// Uses: { lenderUserId: 1, status: 1 }

// Fast query for ledger entries
db.loanlodgers.find({ loanId: "..." }).sort({ createdAt: 1 });
// Uses: { loanId: 1, createdAt: -1 }
```

### Caching Opportunities

1. **Financial Summary:** Cache for 5 minutes per user
2. **Lending Stats:** Cache for 1 hour per user
3. **Active Debts:** Cache for 5 minutes per user
4. **Loan Ledger:** Cache specific loan for 10 minutes

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Transaction Duration:** Alert if > 1 second
2. **Failed Repayments:** Alert on repeated failures
3. **High Debt Ratio:** Alert if totalBorrowedLiability > 50% of personalBalance
4. **Orphaned Records:** Alert if ledger entries without loans

### Queries for Monitoring

```javascript
// Find users with high debt ratio
db.users.aggregate([
  {
    $lookup: {
      from: "externaldbts",
      localField: "_id",
      foreignField: "userId",
      as: "debts",
    },
  },
  {
    $addFields: {
      totalDebt: { $sum: "$debts.remainingAmount" },
      debtRatio: {
        $divide: [{ $sum: "$debts.remainingAmount" }, "$personalBalance"],
      },
    },
  },
  { $match: { debtRatio: { $gt: 0.5 } } },
]);

// Find overdue loans (if dueDate added)
db.loans.find({
  status: { $in: ["ACTIVE", "PARTIALLY_PAID"] },
  dueDate: { $lt: new Date() },
});
```

---

## Troubleshooting

### Issue: Balance Mismatch

```javascript
// Verify and fix
db.loans.aggregate([
  { $match: { lenderUserId: "user123", sourceType: "PERSONAL" } },
  {
    $lookup: {
      from: "loanlodgers",
      localField: "_id",
      foreignField: "loanId",
      as: "ledger",
    },
  },
  {
    $group: {
      _id: "$lenderUserId",
      totalLent: { $sum: "$amount" },
    },
  },
]);

// Compare with user.personalBalance loss
```

### Issue: Orphaned Ledger Entries

```javascript
// Find
db.loanlodgers.aggregate([
  {
    $lookup: {
      from: "loans",
      localField: "loanId",
      foreignField: "_id",
      as: "loan",
    },
  },
  { $match: { loan: { $size: 0 } } },
]);

// Remove
db.loanlodgers.deleteMany({
  loanId: { $nin: db.loans.distinct("_id") },
});
```

---

## Database Size Estimation

### Document Sizes (Approximate)

- User: 200 bytes
- Loan: 250 bytes
- LoanLedger: 200 bytes
- ExternalDebt: 220 bytes

### Storage for 10,000 Users

- 100,000 loans × 250 = 25 MB
- 500,000 ledger entries × 200 = 100 MB
- 20,000 external debts × 220 = 4.4 MB
- **Total ≈ 130 MB** (without indexes)

### Index Size Estimation

- Loan indexes: ≈ 3 MB
- Ledger indexes: ≈ 5 MB
- ExternalDebt indexes: ≈ 2 MB
- **Total ≈ 10 MB**
