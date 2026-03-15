# X-PATH LIMS — Pathology Lab Information Management System

A full-featured **Laboratory Information Management System (LIMS)** for pathology labs. Browser-based access for staff and a public-facing site for patients and referring physicians.

## Features

- **End-to-end pathology workflow:** Order → Receiving (accession) → Grossing → Processing → Embedding → Sectioning → H&E / IHC staining → Pathologist review → Report (PDF, email).
- **Histology & IHC:** Accessions, blocks, slides, processing and staining records, QC status.
- **Cytology:** Case tracking, screening status, staining.
- **Molecular:** Test types and order integration (NGS, PCR, FISH, etc.).
- **Roles:** Receptionist, Technician, Pathologist, Admin, Finance, Courier, Doctor (referrer). Role-based dashboards and quick actions.
- **Patient portal:** Look up orders by last name + DOB; view order status and request payment (e.g. mobile money).
- **Online ordering:** Public form to request tests; courier pickup workflow.
- **Payments:** Multiple methods (cash, card, insurance, MTN/Orange money, etc.); payment summary and confirmation.
- **Reports:** PDF generation and email to client.
- **Digital pathology:** Slide image upload (scanner API) and listing by order.
- **Configurable lab branding:** Lab name, tagline, about text, contact details, business hours, accreditations (CAP, ISO 15189, etc.) — editable in Admin → Settings and shown on the public landing page.
- **Multi-currency:** XAF, USD, EUR. Transparent public pricing by test type with optional turnaround times.

## Stack

- **Frontend:** React 18, TypeScript, Vite, React Router v6, Material UI, Zustand, TanStack Query
- **Backend:** Node.js, Express, MongoDB, JWT auth

## Quick start

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set MONGODB_URI (e.g. mongodb://localhost:27017/xpath_lims) and JWT_SECRET
npm install
npm run dev
```

API runs at `http://localhost:3000`. Optional: seed an admin user, pathology test types (Histology, Cytology, Molecular, Consultation), and default system settings (requires MongoDB):

```bash
npm run seed
# Login: admin@xpath.lims / admin123
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The app proxies `/api` to the backend when using dev server.

### 3. Production build

**Backend:** Ensure `MONGODB_URI` and `JWT_SECRET` are set. Run `npm start`.

**Frontend:** Set `VITE_API_URL` to your API base URL (e.g. `https://lims.lab.local/api`). Then:

```bash
cd frontend
npm run build
```

Serve the `dist/` folder with Nginx or any static host. Configure the reverse proxy so `/api` is forwarded to the Node.js API.

## Environment

| Variable | Where | Description |
|----------|--------|-------------|
| `PORT` | Backend | API port (default 3000) |
| `MONGODB_URI` | Backend | MongoDB connection string |
| `JWT_SECRET` | Backend | Secret for signing JWTs |
| `CORS_ORIGIN` | Backend | Allowed web origin (e.g. https://lims.lab.local) |
| `VITE_API_URL` | Frontend (build) | API base URL (e.g. /api or https://api.lims.lab.local) |
| `SCANNER_API_KEY` | Backend | Optional. If set, POST /api/public/slide-image requires X-API-Key header for scanner uploads. |

## Routes (feature parity)

- **Auth:** `/login`, `/register`
- **Dashboard:** `/`
- **Orders:** `/orders`, `/orders/create`, `/orders/:id`
- **Workflows:** `/receptionist/workflow`, `/technician/workflow`, `/pathologist/workflow`, `/pathologist-review`
- **Financial & Courier:** `/financial`, `/courier`
- **Receiving, Histology, Reports, Inventory:** `/receiving`, `/histology`, `/reports`, `/inventory`, `/inventory/sample/:id`
- **Workflows:** `/workflow/select`, `/workflow/execute/:id`, `/workflow/complete/:id`, `/workflow/history`
- **Admin:** `/admin/users`, `/admin/test-types`, `/admin/workflow-templates`, `/admin/settings`
- **Settings:** `/settings`, `/backend-settings`

Role-based navigation: menu items depend on user role (receptionist, technician, pathologist, admin, finance, courier).

## Deployment (single server)

- Nginx listens on :443, serves static files from the frontend `dist/` and proxies `location /api { proxy_pass http://127.0.0.1:3000; }`.
- Run Node.js API (e.g. with pm2): `node backend/src/index.js` or `npm start` in `backend/`.

## Document

See the project specification for full scope, architecture, security, and phases.
