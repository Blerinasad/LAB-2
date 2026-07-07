# Smart Kitchen & Marketplace System

> Platformë e zgjuar e menaxhimit të kuzhinës — Lab Course 2 + ML · UBT 2025–2026

## Tech Stack

| Shtresa | Teknologjia |
|---|---|
| Backend | Node.js + Express.js (ES Modules) |
| Frontend | React 18 + Vite + Tailwind CSS |
| DB SQL | MySQL — 29 tabela, 3NF |
| DB NoSQL | MongoDB — ML outputs |
| ML Service | Python 3.11 + FastAPI |
| Real-Time | Socket.IO |
| Auth | JWT Access Token (15min) + Refresh Token Cookie (7d) |

## Struktura

```
SmartKitchen/
├── backend/
│   ├── controllers/     # Thin controllers — vetëm HTTP layer
│   ├── services/        # Biznes logjika e plotë
│   ├── routes/          # Një file routes për çdo controller
│   ├── middleware/      # Auth, Role, Validation
│   ├── models/          # DB models dhe MongoDB schemas
│   ├── config/          # db.js, mongo.js
│   └── util/            # Token, mailer, cron
├── frontend/
│   ├── src/
│   │   ├── pages/       # Dashboard, Inventory, Recipes...
│   │   ├── services/    # 13 API service files
│   │   ├── context/     # AuthContext (Lab 1 pattern)
│   │   └── components/  # Layout, UI, Toast, Skeleton
├── ml-service/          # Python FastAPI
└── database/
    ├── 01_schema.sql    # 29 tabela
    └── 02_seed.sql      # Të dhëna fillestare
```

## Kërkesat

- Node.js >= 18
- MySQL >= 8.0
- MongoDB >= 6.0 *(opsionale — aplikacioni funksionon edhe pa të; përdoret vetëm si cache për outpute ML)*
- Python >= 3.11

## Setup

### 1. MySQL

```bash
# MySQL Workbench ose CLI:
mysql -u root -p < database/01_schema.sql
mysql -u root -p < database/02_seed.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edito .env me kredencialet e databazës

npm install
npm run seed        # seed.js + seed_demo_data.js
npm run dev         # port 5000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev         # port 5173
```

### 4. ML Service

```bash
cd ml-service
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Variables të mjedisit

### backend/.env
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=fjalëkalimi
DB_NAME=smart_kitchen

ACCESS_TOKEN_SECRET=secret_random_gjatë
REFRESH_TOKEN_SECRET=secret_tjetër_random
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d
SALT_ROUNDS=12

MONGO_URI=mongodb://localhost:27017/smart_kitchen
FRONTEND_URL=http://localhost:5173

# Email (për Reset Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASS=app_password

# AI Features
OPENAI_API_KEY=         # Opsionale — për PhotoScan AI real
ENABLE_DEMO_AI=true     # true = mode demo pa OpenAI key
ML_SERVICE_URL=http://localhost:8000
```

### Fjalëkalim DB i enkriptuar (opsional)

Për zhvillim, `DB_PASSWORD` mund të jetë tekst i thjeshtë. Për ta enkriptuar:

```bash
# 1. Gjenero vlerën e enkriptuar
node util/env-encrypt.js encrypt "your_mysql_password"
# Output: ENC:iv_hex:encrypted_hex

# 2. Vendose në backend/.env
DB_PASSWORD=ENC:iv_hex:encrypted_hex
```

Çelësi kryesor (`ENV_MASTER_KEY`) duhet vendosur si variabël sistemi, JO në `.env`:

```bash
export ENV_MASTER_KEY=your_secret_master_key   # Linux/Mac
set ENV_MASTER_KEY=your_secret_master_key      # Windows
```

> Në prodhim (`NODE_ENV=production`), nëse `DB_PASSWORD` fillon me `ENC:` por `ENV_MASTER_KEY` mungon, aplikacioni ndalon me një gabim të qartë — nuk përdoret kurrë çelës i parazgjedhur i pasigurt.

### frontend/.env
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

> **PhotoScan / OpenAI:** Frontend-i NUK thërret kurrë OpenAI direkt dhe NUK ka nevojë
> për ndonjë `VITE_OPENAI_KEY`. Çdo skanim foto kalon vetëm nëpërmjet
> `POST /api/ml/detect-food-image` (backend). Backend-i vendos automatikisht nëse
> përdor OpenAI Vision (nëse `OPENAI_API_KEY` është konfiguruar më sipër) ose
> Mode Demo (nëse jo) — shih `ENABLE_DEMO_AI` te `backend/.env`.

## Llogaritë Demo

| Roli | Email | Fjalëkalimi |
|---|---|---|
| Admin | admin@smartkitchen.com | Password123! |
| Manager | artan@smartkitchen.com | Password123! |
| User | blerta@smartkitchen.com | Password123! |
| User | driton@smartkitchen.com | Password123! |
| User | fjolla@smartkitchen.com | Password123! |
| Courier | courier@smartkitchen.com | Password123! |

## Renditja e nisjes

```
1. MySQL server
2. MongoDB server (opsional — mund të kapërcehet)
3. npm run seed (te backend/)
4. npm run dev (te backend/)
5. uvicorn main:app --reload --port 8000 (te ml-service/)
6. npm run dev (te frontend/)
```

## Featuret Kryesore

- Menaxhim inventari me data skadimi dhe alertë automatike
- Rekomandime recetash bazuar në inventarin aktual (ML)
- Plane javore të vakteve me gjenerim automatik të listave
- Marketplace me flow të plotë (User → Manager → Courier)
- Notifikime real-time me Socket.IO
- Raportime dinamike me eksport CSV
- PhotoScan AI — foto → identifikim produkti → inventar
- Dashboard me statistika dhe grafiqe
- Reset fjalëkalimit me email

## API Dokumentimi

```
http://localhost:5000/api/docs     # Swagger UI interaktiv
http://localhost:5000/api/openapi.json  # OpenAPI JSON
```

## Arkitektura MVC

```
Request → routes/ → controllers/ → services/ → models/ → DB
                                    ↕
                              ML.service.js → ML FastAPI
```

## Shënim i rëndësishëm

- Controllers: ZERO biznes logjikë, ZERO SQL
- Services: gjithë logjika, query-et, validimi i domeneve
- Çdo controller ka route file të veçantë

## ERD

Shih `database/01_schema.sql` për strukturën e plotë (29 tabela).
