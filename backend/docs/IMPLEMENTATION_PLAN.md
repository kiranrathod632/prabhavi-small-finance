# Implementation Plan — Module-by-Module File Map

## Existing Project Baseline
- Phase 1: User/Admin loan system (working)
- Phase 2: OTP, KYC (unmounted), recovery (unrouted), 6 roles in backend config (frontend only admin/user)

---

## Module 1: Multi-Role Auth + adminId Foundation

### Modify
| File | Changes |
|------|---------|
| `backend/models/User.js` | Add `adminId`, `sub_admin` role, `preferredLanguage`, `permissions[]` for sub_admin |
| `backend/models/Loan.js` | Add `adminId`, `draft` status, `approvedAmount`, `emiStartDate` |
| `backend/models/Role.js` | Add `sub_admin` enum |
| `backend/config/permissions.js` | Sub Admin permissions, super admin admin-mgmt perms |
| `backend/config/seed.js` | Fix duplicate seed, add sub_admin user |
| `backend/middlewares/auth.js` | Export scope helpers |
| `backend/middlewares/scope.js` | **NEW** — filter queries by adminId for admin/sub_admin |
| `backend/controllers/authController.js` | Role-specific login validation |
| `backend/routes/index.js` | Mount KYC (fix) |

### Create
| File | Purpose |
|------|---------|
| `backend/models/Commission.js` | Commission tracking |
| `backend/middlewares/scope.js` | Admin ownership scoping |

### Frontend Modify
| File | Changes |
|------|---------|
| `frontend/src/utils/roles.js` | super_admin, admin, sub_admin paths |
| `frontend/src/context/AuthContext.jsx` | Multi-role dashboard paths, language |
| `frontend/src/routes/AppRoutes.jsx` | Separate route groups per role |
| `frontend/src/layouts/DashboardLayout.jsx` | Allow all staff roles |
| `frontend/src/components/Sidebar.jsx` | Role-based nav |
| `frontend/src/pages/auth/AdminLogin.jsx` | Allow admin + sub_admin |
| `frontend/src/pages/auth/SuperAdminLogin.jsx` | **NEW** |
| `frontend/src/pages/auth/SubAdminLogin.jsx` | **NEW** |

---

## Module 2: User Registration (Email OR Mobile)
- `backend/controllers/authController.js` — email OR mobile required
- `backend/validators/index.js` — conditional validation
- `frontend/src/pages/auth/Register.jsx` — already has tabs

## Module 3: OTP (exists — enhance)
- `backend/services/otpService.js` — already has retry/expiry
- `backend/services/smsService.js` — provider abstraction

## Module 4: User Profile (extend)
- `backend/models/Profile.js` — nominee, employment, salary, documents[]
- `backend/controllers/profileController.js`

## Module 5: Loan Application
- `backend/models/Loan.js` — draft, extended fields
- `backend/controllers/loanController.js` — auto-set adminId from user

## Module 6–8: Admin Ownership + Super Admin + Admin scoping
- `backend/controllers/userController.js` — filter by adminId
- `backend/controllers/loanController.js` — filter by adminId
- **NEW** `backend/controllers/adminController.js` — CRUD admins (super_admin only)

## Module 9: Sub Admin RBAC
- User.permissions[] + middleware checkPermission

## Module 10: Loan Processing at approval
- `backend/controllers/loanController.js` — approved amount, tenure, schedule generation

## Module 11: EMI Management (mostly exists)
- `backend/controllers/emiController.js` — partial payment

## Module 12: Commission
- `backend/models/Commission.js`
- `backend/services/commissionService.js`
- Hook in loan approval

## Module 13–16: Notifications/SMS/Reminders
- `backend/services/notificationService.js` — extend
- `backend/services/smsService.js` — provider pattern
- `backend/models/NotificationLog.js` — **NEW**
- Cron in `server.js`

## Module 17: Dashboards
- Role-specific dashboard controllers + frontend pages

## Module 18: Reports
- Extend reportController — commission, admin-scoped

## Module 19: Audit Logs
- **NEW** auditController + route GET /api/audit-logs

## Module 20: i18n
- **NEW** `frontend/src/i18n/` — en.json, hi.json, mr.json
- User.preferredLanguage API
- Language selector on login + profile

---

## Implementation Order
1. Module 1 (this session) — roles, adminId, scoping, logins, mount KYC
2. Module 6–8 — admin ownership in queries
3. Module 12 — commission
4. Module 20 — i18n foundation
5. Remaining modules incrementally
