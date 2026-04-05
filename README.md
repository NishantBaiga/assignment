# Finance Data Processing and Access Control Backend

A production-quality backend system built with **Next.js 16 App Router**,
**TypeScript**, **MongoDB (Mongoose)**, and **Zod** — featuring JWT
authentication, role-based access control, financial record management,
and aggregated dashboard analytics.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, Route Handlers) |
| Language | TypeScript |
| Database | MongoDB with Mongoose |
| Validation | Zod v4 |
| Auth | Custom JWT (no external providers, basic  level auth) |
| Password hashing | bcryptjs |
| Deployment | Vercel |

---

## Architecture
```
src/
├── app/api/v1/          # Thin route handlers (API layer)
│   ├── auth/            # register, login, logout, me
│   ├── users/           # user management (admin)
│   ├── records/         # financial records CRUD
│   ├── dashboard/       # aggregation endpoints
│   └── health/          # health check
├── services/            # Business logic layer
├── models/              # Mongoose schemas
├── schemas/             # Zod validation schemas
├── middleware/          # withAuth, withRole
├── lib/                 # DB connection, JWT, password utils
├── utils/               # AppError, routeHandler, validate
└── types/               # Shared TypeScript types
```

**Key principle:** Route handlers are thin — they parse input, call a
service, and return a response. All business logic lives in services.

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account or local MongoDB instance
- npm or yarn

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/yourusername/finance-backend.git
cd finance-backend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# 4. Seed the initial admin user
npm run seed

# 5. Start the development server
npm run dev
```

### Environment Variables

| Variable | Description | Required |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | ✅ |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | ✅ |
| `JWT_EXPIRES_IN` | Token expiry duration (e.g. `7d`) | ✅ |
| `JWT_COOKIE_NAME` | Cookie name for JWT | ✅ |
| `NODE_ENV` | Environment (`development`/`production`) | ✅ |

---

## Seeded Admin Credentials

After running `npm run seed`:
```
Email:    admin@finance.dev
Password: Admin@12345
Role:     admin
```

> Change these immediately in production.

---

## API Reference

### Base URL
```
http://localhost:3000/api/v1
```

### Response Format

Every response follows this consistent shape:
```json
// Success
{
  "success": true,
  "message": "Human readable message",
  "data": { }
}

// Error
{
  "success": false,
  "message": "Human readable message",
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "details": [ ]
  }
}
```

### Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Invalid request input |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `INVALID_TOKEN` | 401 | Malformed JWT |
| `TOKEN_EXPIRED` | 401 | JWT has expired |
| `FORBIDDEN` | 403 | Insufficient role/permissions |
| `ACCOUNT_INACTIVE` | 403 | User account is deactivated |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate resource (e.g. email) |
| `BAD_REQUEST` | 400 | Invalid operation |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Roles & Permissions

| Action | Viewer | Analyst | Admin |
|---|---|---|---|
| View own records | ✅ | ✅ | ✅ |
| View all records | ❌ | ❌ | ✅ |
| Create records | ❌ | ✅ | ✅ |
| Update records | ❌ | ✅ | ✅ |
| Delete records | ❌ | ✅ | ✅ |
| View dashboard summary | ❌ | ✅ | ✅ |
| View category totals | ❌ | ✅ | ✅ |
| View monthly trends | ❌ | ✅ | ✅ |
| View recent transactions | ✅ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Change user roles | ❌ | ❌ | ✅ |

---

## Endpoints

### Auth — `/api/v1/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | ❌ | Create account |
| POST | `/login` | ❌ | Login and receive token |
| POST | `/logout` | ❌ | Clear auth cookie |
| GET | `/me` | ✅ | Get current user |

#### POST /auth/register
```json
// Request
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password1",
  "confirmPassword": "Password1"
}

// Response 201
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "viewer",
      "status": "active"
    },
    "token": "eyJhbGci..."
  }
}
```

#### POST /auth/login
```json
// Request
{
  "email": "john@example.com",
  "password": "Password1"
}

// Response 200
{
  "success": true,
  "message": "Logged in successfully",
  "data": {
    "user": { "id": "...", "role": "viewer" },
    "token": "eyJhbGci..."
  }
}
```

---

### Users — `/api/v1/users` (Admin only)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | List all users (paginated) |
| GET | `/:id` | Get single user |
| PATCH | `/:id/role` | Update user role |
| PATCH | `/:id/status` | Update user status |
| DELETE | `/:id` | Delete user |

#### GET /users — Query Parameters

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10, max: 100) |
| `role` | string | Filter by role |
| `status` | string | Filter by status |
| `search` | string | Search name or email |

---

### Records — `/api/v1/records`

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| POST | `/` | Analyst, Admin | Create record |
| GET | `/` | All roles | List records (paginated) |
| GET | `/:id` | All roles | Get single record |
| PATCH | `/:id` | Analyst, Admin | Update record |
| DELETE | `/:id` | Analyst, Admin | Soft delete record |

#### POST /records
```json
// Request
{
  "amount": 5000.00,
  "type": "income",
  "category": "salary",
  "date": "2025-01-15T00:00:00.000Z",
  "note": "January salary"
}
```

#### GET /records — Query Parameters

| Param | Type | Description |
|---|---|---|
| `type` | `income\|expense` | Filter by type |
| `category` | string | Filter by category |
| `startDate` | ISO 8601 | Date range start |
| `endDate` | ISO 8601 | Date range end |
| `page` | number | Page number |
| `limit` | number | Items per page |
| `sortField` | `date\|amount\|createdAt` | Sort field |
| `sortOrder` | `asc\|desc` | Sort direction |

#### Available Categories

**Income:** `salary`, `freelance`, `investment`, `rental`, `business`, `gift`

**Expense:** `food`, `transport`, `utilities`, `healthcare`, `education`,
`entertainment`, `shopping`, `rent`, `insurance`, `taxes`

**General:** `other`

---

### Dashboard — `/api/v1/dashboard` (Analyst + Admin)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/summary` | Total income, expenses, net balance |
| GET | `/categories` | Category-wise totals with percentages |
| GET | `/trends` | Monthly income vs expense trends |
| GET | `/recent` | Recent transactions (all roles) |

#### Dashboard Query Parameters

| Param | Type | Description |
|---|---|---|
| `startDate` | ISO 8601 | Filter start date |
| `endDate` | ISO 8601 | Filter end date |
| `months` | number | Months for trends (default: 6, max: 24) |
| `limit` | number | Count for recent (default: 10, max: 50) |

#### GET /dashboard/summary — Response
```json
{
  "data": {
    "totalIncome": 15000.00,
    "totalExpenses": 8500.00,
    "netBalance": 6500.00,
    "totalRecords": 12,
    "incomeCount": 5,
    "expenseCount": 7
  }
}
```

#### GET /dashboard/trends — Response
```json
{
  "data": [
    {
      "year": 2025,
      "month": 1,
      "monthName": "January",
      "income": 5000.00,
      "expenses": 2800.00,
      "net": 2200.00
    }
  ]
}
```

---

### System

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/health` | Health check + DB status |

---

## Data Models

### User
```ts
{
  name: string           // 2-50 chars
  email: string          // unique, lowercase
  password: string       // bcrypt hashed, never returned
  role: "viewer" | "analyst" | "admin"
  status: "active" | "inactive"
  lastLogin: Date | null
  createdAt: Date
  updatedAt: Date
}
```

### FinancialRecord
```ts
{
  userId: ObjectId       // reference to User
  amount: number         // positive, max 2 decimal places
  type: "income" | "expense"
  category: string       // from predefined list
  date: Date
  note: string           // max 500 chars
  createdBy: ObjectId
  updatedBy: ObjectId | null
  isDeleted: boolean     // soft delete flag
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
```

---

## Authentication

The API supports two authentication methods:

**1. HttpOnly Cookie** (browser clients)
Set automatically on login. Sent with every request automatically.

**2. Bearer Token** (API clients / Postman)
```
Authorization: Bearer <token>
```

Token priority: Bearer header is checked first, then cookie.

---

## Assumptions & Decisions

### Role Assignment
New users always register as `viewer`. An admin must explicitly promote
them to `analyst` or `admin`. This is the safest default — least privilege.

### Soft Delete
Financial records are never hard deleted. The `isDeleted` flag hides them
from all queries while preserving data for audit trails and historical
aggregations. Only the DB-level seed script or a DBA should ever hard delete.

### Admin Scope
Admins see platform-wide data in dashboard and record listing. This was a
deliberate design choice to support administrative oversight — useful for
a real finance dashboard where admins monitor all activity.

### Password Validation
Passwords require uppercase, lowercase, and a number (minimum 8 chars).
bcrypt salt rounds are set to 12 — secure while keeping login under ~300ms.

### Amount Precision
Amounts are stored as floats rounded to 2 decimal places via a Mongoose
setter. This avoids floating point errors like `100.999999` while staying
simple — a full currency library would be overkill for this scope.

### JWT Expiry
Tokens expire in 7 days by default. There is no refresh token mechanism —
users must re-login after expiry. This keeps the implementation clean;
refresh tokens would be the obvious next addition for production.

### Record Ownership
Non-admin users can only read/write their own records. Admins can access
any record. This enforces data isolation between users.

---

## Tradeoffs

| Decision | Tradeoff |
|---|---|
| No refresh tokens | Simpler auth flow, but users must re-login after 7 days |
| Soft delete only | Data preserved for audits, but DB grows over time |
| Predefined categories | Consistent analytics, but less flexible for users |
| Float for amounts | Simple implementation, sufficient for most cases |
| No rate limiting | Acceptable for assessment scope — would add in production |

---

## Scripts
```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run seed     # Create initial admin user
```

---

## Deployment (Vercel)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN, JWT_COOKIE_NAME
```

> Ensure your MongoDB Atlas cluster allows connections from
> `0.0.0.0/0` or Vercel's IP ranges.