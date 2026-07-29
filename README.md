# Finance & Loan Management System

A full-stack production-ready Finance & Loan Management System built with React, Node.js, Express, and MongoDB.

## Features

### Authentication
- Register, Login, Logout
- JWT + Refresh Token authentication
- Forgot / Reset Password
- Role-based access (Admin, User)

### User Features
- Dashboard with charts and statistics
- Apply for loans, view loan details & EMI schedule
- Pay EMIs, download receipts
- Transaction history with filters
- Profile management (bank details, PAN, Aadhaar)
- Notifications

### Admin Features
- Comprehensive admin dashboard
- User management (CRUD, suspend)
- Loan approval workflow (approve, reject, disburse, close)
- EMI management (mark paid, penalties)
- Transaction management with export
- Fund management
- Reports (loans, EMIs, transactions, users, profit)

## Tech Stack

| Frontend | Backend |
|----------|---------|
| React 18 | Node.js |
| Vite | Express.js |
| Tailwind CSS | MongoDB + Mongoose |
| React Router | JWT + bcrypt |
| Axios | Multer, Nodemailer |
| React Hook Form | PDFKit, ExcelJS |
| Chart.js | Helmet, CORS, Rate Limiting |
| React Hot Toast | Express Validator |

## Project Structure

```
vitthal/
├── backend/
│   ├── config/          # Database & seed
│   ├── controllers/     # Route controllers
│   ├── middlewares/     # Auth, validation, upload, errors
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── services/        # Email, audit, notifications
│   ├── utils/           # Helpers, JWT, PDF, Excel
│   ├── validators/      # Request validators
│   ├── uploads/         # File uploads
│   └── server.js        # Entry point
├── frontend/
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── context/     # Auth & Theme context
│       ├── layouts/     # Page layouts
│       ├── pages/       # Route pages
│       ├── routes/      # App routing
│       ├── services/    # API services
│       └── utils/       # Helper functions
└── postman/             # Postman collection
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB 6+

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secrets
npm install
npm run seed    # Creates admin user & initial fund
npm run dev     # Starts on http://localhost:8000
```

**Default Admin Credentials:**
- Email: `admin@financeloan.com`
- Password: `Admin@123`

### Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev     # Starts on http://localhost:5173
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/forgot-password` | Forgot password |
| POST | `/api/auth/reset-password/:token` | Reset password |
| PUT | `/api/auth/change-password` | Change password |
| GET | `/api/auth/me` | Get current user |

### Users (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users |
| GET | `/api/users/:id` | Get user |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

### Loans
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/loans` | Apply loan |
| GET | `/api/loans` | List loans |
| GET | `/api/loans/:id` | Get loan details |
| PUT | `/api/loans/:id` | Update loan |
| DELETE | `/api/loans/:id` | Delete loan |

### EMIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/emis` | List EMIs |
| POST | `/api/emis/pay` | Pay EMI |
| PUT | `/api/emis/:id` | Update EMI |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List transactions |
| POST | `/api/transactions` | Create transaction |

### Funds (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/funds` | Get fund details |
| POST | `/api/funds` | Update fund |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/admin` | Admin dashboard |
| GET | `/api/dashboard/user` | User dashboard |

## Security

- Helmet for HTTP headers
- CORS configuration
- JWT authentication with refresh tokens
- bcrypt password hashing
- Express Validator input validation
- Rate limiting (100 req/15min)
- Role-based authorization

## Phase 2 - NBFC Finance Company Module

### Roles
| Role | Dashboard | Password (seed) |
|------|-----------|-----------------|
| Super Admin | `/super-admin/dashboard` | `superadmin@financeloan.com` / `SuperAdmin@123` |
| Admin | `/admin/dashboard` | Created by Super Admin |
| Recovery Agent | `/recovery/dashboard` | Created by Admin |
| User | `/dashboard` | Register via app |

### Phase 2 Features Added
- **Mobile OTP Registration/Login** + Email registration (existing)
- **KYC workflow** with admin review before loan apply
- **Loan timeline** with status tracking (Pending → Under Review → Approved → Disbursed → Active → Closed)
- **Processing fee breakup** (Loan Amount, Fee, GST, Net Disbursed)
- **Interest settings** (Flat/Reducing, configurable fees, penalties)
- **EMI Calculator** with tenure selection (6–60 months)
- **Auto penalty system** for overdue EMIs
- **Recovery management** (cases, notes, call/visit history)
- **Advanced reports** (collection, interest, penalty, cashflow, outstanding, missed EMI)
- **Soft delete** on users, loans, transactions
- **Encrypted PAN/Aadhaar** at rest
- **SMS + Email + In-app** notifications

### New API Endpoints (Phase 2)
| Prefix | Description |
|--------|-------------|
| `/api/otp` | Send, verify, resend OTP |
| `/api/auth/register-mobile` | Mobile OTP registration |
| `/api/auth/login-mobile` | Mobile OTP login |
| `/api/kyc` | KYC submit, review, status |
| `/api/settings` | Interest & fee configuration |
| `/api/loans/:id/select-tenure` | Post-approval tenure selection |
| `/api/loans/calculate` | EMI calculator preview |
| `/api/recovery` | Recovery cases, notes, calls, visits |
| `/api/reports/:type` | Advanced reports (PDF/Excel/CSV) |

Run `npm run seed` in backend to initialize Phase 2 roles and settings.

## License

MIT
