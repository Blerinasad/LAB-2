# SmartKitchen - Dokumentim per Mbrojtje dhe Prezantim

Ky dokument eshte pergatitur si flete mbeshtetese per prezantimin dhe mbrojtjen e projektit **Smart Kitchen & Marketplace System** ne Lab Course 2. Qellimi eshte qe gjate prezantimit te mund te shpjegohet qarte arkitektura, flow i aplikacionit, databaza, API-te, rolet, real-time komunikimi dhe Machine Learning.

## 1. Ideja e Projektit

SmartKitchen eshte aplikacion full-stack per menaxhimin e kuzhines personale dhe porosive ne marketplace. Perdoruesi mund te menaxhoje inventarin, te shohe produktet qe po skadojne, te marre rekomandime per receta, te krijoje plane javore, lista blerjeje dhe porosi. Manager-i merret me porosite e marketplace, courier-i me dorezime, ndersa admin-i menaxhon sistemin, perdoruesit, raportet globale dhe audit log.

Projekti lidh tri pjese kryesore:

- **Frontend:** React 18 + Vite.
- **Backend:** Node.js + Express.js.
- **Databaza:** MySQL per te dhenat relacionale dhe MongoDB per cache/rezultate te ML.
- **ML Service:** Python FastAPI per modele Machine Learning.
- **Real-time:** Socket.IO per njoftime live.

## 2. Portet dhe Localhost

Gjate zhvillimit projekti punon ne localhost:

- `http://localhost:5173` - frontend React/Vite.
- `http://localhost:5000` - backend Express API.
- `http://localhost:8000` - ML service FastAPI.

**Localhost** eshte adresa e kompjuterit lokal, zakonisht `127.0.0.1`. **Porti** tregon se cili sherbim po degjon ne ate kompjuter. Pra `localhost:5000` do te thote kompjuteri lokal, sherbimi backend ne portin 5000.

## 3. Arkitektura e Aplikacionit

Arkitektura eshte e shtresezuar:

```text
Frontend React
    |
Axios API Services
    |
Express Routes
    |
Controllers
    |
Services
    |
Repositories / Database Queries
    |
MySQL / MongoDB
```

Ndarja kryesore:

- **Routes:** percaktojne URL-te dhe lidhin endpoint-et me controller-at.
- **Controllers:** pranojne request-in HTTP dhe kthejne response. Nuk duhet te mbajne logjike biznesi.
- **Services:** mbajne logjiken kryesore te aplikacionit, validimet e biznesit dhe query-t.
- **Repositories:** perdoren aty ku logjika e qasjes ne databaze eshte ndare nga service layer.
- **Middleware:** kontrollon autentikimin, rolet, validimin dhe sigurine.

Kjo ndarje e ben projektin me te lehte per testim, mirembajtje dhe prezantim.

## 4. Frontend Flow

Frontend-i eshte i ndertuar me React dhe React Router. Pas hyrjes ne sistem, perdoruesi ridrejtohet ne `/dashboard`. Sidebar-i dhe route access kontrollohen sipas roleve ne konfigurimin qendror te roleve.

Faqet kryesore:

- `/login` - hyrja ne sistem.
- `/dashboard` - paneli sipas rolit.
- `/inventory` - inventari personal i user-it.
- `/photoscan` - skanim foto per te identifikuar produktin.
- `/recipes` - lista e recetave.
- `/meal-plans` - planet javore.
- `/shopping` - listat e blerjes.
- `/marketplace` - porosite/dyqanet sipas rolit.
- `/deliveries` - dorezimet e courier-it.
- `/notifications` - njoftimet live.
- `/reports` - raporte sipas rolit.
- `/ml` - rekomandime dhe analiza ML.
- `/users` - menaxhim i perdoruesve nga admin.
- `/settings` - konfigurime sistemi.

Frontend perdor service files me Axios per te komunikuar me backend-in. Token-i ruhet dhe dergohet ne header si `Authorization: Bearer <token>`.

## 5. Rolet dhe Aksesi

Rolet kryesore jane:

- **Admin:** menaxhon perdorues, raporte globale, audit/system activity, settings dhe notifications.
- **Manager:** menaxhon marketplace dhe statuset e porosive.
- **Courier:** sheh dhe dorezon porosite e caktuara.
- **User:** menaxhon kuzhinen personale, inventarin, recetat, planet javore, shopping lists, marketplace dhe ML recommendations.

Aksesi eshte i ndare ne dy nivele:

- **Frontend:** sidebar dhe ProtectedRoute fshehin faqet qe nuk i takojne rolit.
- **Backend:** middleware kontrollon JWT dhe rolet per endpoint-et e mbrojtura.

Kjo eshte e rendesishme sepse fshehja ne frontend nuk mjafton per siguri; kontrolli real duhet te jete ne backend.

## 6. Authentication dhe JWT

Flow i login-it:

1. User shkruan email dhe password.
2. Frontend dergon request ne backend.
3. Backend kontrollon password-in me hash bcrypt.
4. Nese kredencialet jane te sakta, backend kthen access token dhe vendos refresh token.
5. Frontend perdor access token per request-et e mbrojtura.

Pse JWT?

- Eshte stateless.
- Punon mire me REST API.
- Access token perdoret per request-et e perditshme.
- Refresh token perdoret per te rinovuar sesionin pa kerkuar login te ri.

Fjalekalimet nuk ruhen si plaintext, por si hash me bcrypt.

## 7. Databaza MySQL

Databaza kryesore eshte MySQL. Schema perfshin 29 tabela, pra me shume se minimumi i kerkuar prej 24 tabelash.

10 tabelat obligative:

- `Users`
- `Roles`
- `UserRoles`
- `Permissions`
- `RolePermissions`
- `RefreshTokens`
- `AuditLogs`
- `Notifications`
- `Settings`
- `Files`

Tabelat e domain-it perfshijne inventarin, ingredientet, recetat, planet javore, shopping lists, stores, orders, order items, waste logs, consumption logs dhe te tjera.

Pse MySQL?

- Eshte databaze relacionale.
- Pershtatet mire me lidhje si user-role, recipe-ingredients, orders-items.
- Mbështet foreign keys, indexes dhe constraints.
- Eshte e pershtatshme per 3NF.

## 8. MongoDB

MongoDB perdoret per te dhena NoSQL te lidhura me ML recommendations/cache. Nuk eshte databaza kryesore e biznesit, por sherben per ruajtje fleksibile te rezultateve ose output-eve qe nuk kane gjithmone strukture fikse.

Nese MongoDB nuk eshte aktive gjate zhvillimit, backend vazhdon punen me fallback dhe nuk e bllokon startimin.

## 9. Backend API Flow

Backend-i Express ekspozon API nen `/api`.

Shembuj endpoint-esh:

- `POST /api/auth/login` - login.
- `GET /api/auth/me` - profili aktual.
- `GET /api/inventory` - inventari i user-it.
- `POST /api/inventory` - shtim artikulli ne inventar.
- `GET /api/recipes` - lista e recetave.
- `GET /api/reports/summary` - raporte dinamike.
- `GET /api/reports/audit` - audit logs per admin.
- `POST /api/market/orders` - krijim porosie.
- `PATCH /api/market/orders/:id/status` - ndryshim statusi porosie.
- `GET /api/ml/recommendations/my` - rekomandime nga ML.
- `POST /api/ml/detect-food-image` - PhotoScan.

Dokumentimi i API-se eshte ne:

- `http://localhost:5000/api/docs`
- `http://localhost:5000/api/openapi.json`

## 10. Marketplace Flow

Flow i marketplace:

1. User krijon shopping list.
2. User zgjedh store dhe krijon porosi.
3. Manager sheh porosite e store-it.
4. Manager pranon ose refuzon porosine.
5. Manager e kalon ne pergatitje dhe pastaj per dorezim.
6. Courier merr porosine.
7. Courier e shenon si te dorezuar.
8. User merr njoftim per statusin.

Statuset kryesore te porosise:

- `pending`
- `accepted`
- `preparing`
- `out_for_delivery`
- `delivered`
- `rejected`
- `cancelled`

Keto status values duhet te perputhen me enum-in e databazes qe te mos kete gabime SQL.

## 11. Inventory dhe PhotoScan Flow

Inventari ruan produktet e user-it, sasine, njesine, daten e blerjes, daten e skadimit dhe lokacionin.

PhotoScan:

1. User hap `/photoscan`.
2. Ngarkon ose ben foto te produktit.
3. Frontend dergon foton te backend.
4. Backend provon OpenAI Vision nese `OPENAI_API_KEY` eshte konfiguruar.
5. Nese OpenAI nuk eshte i disponueshem ose kthen 429/timeout/server error, backend perdor fallback/demo detection.
6. Rezultati sugjeron emrin, njesine dhe sasine.
7. User mund ta shtoje produktin ne inventar.

Kjo ndihmon prezantimin sepse edhe pa OpenAI aktiv projekti vazhdon te demonstrohet.

## 12. Recipes, Meal Plans dhe Shopping Lists

Recipes:

- User sheh receta.
- Recetat lidhen me ingredientet permes `RecipeIngredients`.
- Rekomandimet krahasojne ingredientet e recetes me inventarin e user-it.

Meal Plans:

- User krijon plan javor.
- Cdo dite lidhet me receta dhe meal type.
- Nga meal plan mund te gjenerohet shopping list per ingredientet qe mungojne.

Shopping Lists:

- User krijon lista blerjeje.
- Artikujt mund te shenohen si te blere.
- Lista mund te kthehet ne porosi marketplace.

## 13. Reports dhe Audit

Raportet jane role-based:

- Admin sheh raporte sistemi: total users, active/inactive users, orders, statuset e porosive, marketplace activity, audit summary dhe system activity.
- User sheh raporte personale: inventar, produkte qe skadojne, consumption, top ingredients dhe waste.
- Manager sheh raporte te lidhura me marketplace/porosite.

Audit logs regjistrojne veprime kritike si login, create, update, delete dhe ndryshim statusi porosie.

## 14. Notifications dhe Real-Time Communication

Projekti perdor Socket.IO per njoftime live. Kur ndodh nje ngjarje e rendesishme, backend krijon notification dhe dergon event live ne frontend.

Shembuj:

- Produkti po skadon.
- Porosia u pranua.
- Porosia u dorezua.
- Ka njoftim sistemi.

Kjo ploteson kerkesen e lendes per real-time communication, sepse nuk eshte polling me interval, por komunikim live server-client.

## 15. Machine Learning Flow

ML Service eshte mikro-sherbim Python FastAPI ne `ml-service`.

Modelet dhe funksionet kryesore:

- **Logistic Regression**
- **Random Forest**
- **Decision Tree**
- **K-Nearest Neighbors**
- **Neural Network / MLP**
- **K-Means Clustering**
- **Regression per waste prediction**
- **Recommendation logic per receta**

Perdorimet:

- Klasifikimi i riskut te produkteve.
- Parashikimi i food waste.
- Rekomandime recetash.
- Grupim i perdoruesve/produkteve sipas sjelljes.
- PhotoScan per identifikim produkti nga foto.

Dataset-i ndodhet ne `ml-service/datasets/food_waste_inventory.csv`. Nje pjese e te dhenave vjen nga domain-i i aplikacionit, ndersa nje pjese eshte e pergatitur per trajnim dhe testim.

Saktesia e modeleve varet nga trajnimi dhe shfaqet ne rezultatet e skriptave/model reports, me metrika si Accuracy, F1 Score dhe Confusion Matrix.

## 16. Kerkesat e Lendes dhe Si Plotesohen

Kerkesat kryesore te lendes:

- Full-stack app: plotesuar me React + Express.
- SQL database minimum 24 tabela: plotesuar me 29 tabela.
- 10 tabela obligative: plotesuar.
- NoSQL database: MongoDB per ML recommendations/cache.
- MVC/layered architecture: routes, controllers, services, repositories.
- Authentication/Authorization: JWT, refresh token, role-based access.
- Password hashing: bcrypt.
- Environment variables: `.env`.
- API documentation: Swagger/OpenAPI.
- Real-time communication: Socket.IO notifications.
- Additional features: ML integration, dynamic reports, export/import, PhotoScan, marketplace workflow.

## 17. Si ta Prezantoj Live

Rendi i rekomanduar:

1. Hape frontend-in ne `localhost:5173`.
2. Shpjego portet: frontend 5173, backend 5000, ML 8000.
3. Bej login si Admin.
4. Trego dashboard, users, reports dhe activities.
5. Shpjego role-based access dhe pse admin nuk sheh inventar personal.
6. Bej login si User.
7. Trego inventory, PhotoScan, recipes, meal plans dhe shopping list.
8. Krijo ose hap nje porosi marketplace.
9. Bej login si Manager dhe trego pranimin e porosise.
10. Bej login si Courier dhe trego dorezimet.
11. Trego notifications live.
12. Trego Swagger docs ne `/api/docs`.
13. Trego `database/01_schema.sql` per 29 tabelat.
14. Trego `ml-service` dhe dataset-in.

## 18. Pyetje te Mundshme ne Mbrojtje

### Cka eshte localhost?

Localhost eshte adresa e kompjuterit lokal. Zakonisht eshte `127.0.0.1` dhe perdoret per te ekzekutuar aplikacionin gjate zhvillimit.

### Cka eshte web server?

Web server eshte programi qe pranon HTTP request dhe kthen HTTP response. Ne projekt web server eshte backend-i Express.js.

### Ku eshte web server ne projekt?

Ne folderin `backend`, me entry point `index.js`. Startohet me `npm run dev` ose `node index.js`.

### Cfare web server kemi perdorur?

Node.js me Express.js.

### Cka eshte porti?

Porti eshte numer logjik qe identifikon nje sherbim ne kompjuter. Frontend perdor 5173, backend 5000 dhe ML service 8000.

### Dallimi mes localhost dhe portit?

Localhost eshte kompjuteri lokal. Porti tregon sherbimin brenda atij kompjuteri.

### Pse perdoret service layer?

Sepse ndan logjiken e biznesit nga controller-at. Controller merret me request/response, ndersa service mban rregullat e biznesit dhe komunikimin me databazen.

### Pse perdoret JWT?

Sepse eshte stateless, i shpejte dhe i pershtatshem per REST API. Access token perdoret per request-et, refresh token per rinovim sesioni.

### Ku eshte lidhja me databazen?

Ne backend, te konfigurimi i MySQL pool-it ne `backend/config/db.js`.

### Cka eshte connection string?

Eshte informacioni per lidhjen me databazen: host, port, username, password dhe database name.

### Cilat databaza jane perdorur?

MySQL per te dhenat relacionale dhe MongoDB per te dhena fleksibile/ML cache.

### Pse MySQL?

Sepse projekti ka shume relacione: user-role, inventory-ingredients, recipes-ingredients, orders-items. MySQL mbeshtet foreign keys, indexes dhe 3NF.

### Pse MongoDB?

Sepse disa output-e te ML jane fleksibile dhe nuk kane gjithmone strukture fikse relacionale.

### Cila eshte arkitektura?

Arkitekture e shtresezuar MVC: routes, controllers, services, repositories/models dhe database.

### Cka jane endpoints?

Endpoint eshte URL qe ofron nje funksionalitet te backend-it, p.sh. `GET /api/inventory`.

### Pse perdoren endpoints?

Qe frontend-i te komunikoje me backend-in per te lexuar ose ruajtur te dhena.

### Kur krijohet API?

Kur frontend-i ose nje sistem tjeter duhet te kete qasje ne nje funksionalitet ose ne te dhena.

### Cfare algoritme ML jane perdorur?

Logistic Regression, Random Forest, Decision Tree, KNN, Neural Network/MLP dhe K-Means Clustering. Jane perdorur per risk classification, waste prediction, recommendations dhe clustering.

### Ku eshte dataset-i?

Ne `ml-service/datasets/food_waste_inventory.csv`.

### Sa eshte saktesia?

Saktesia varet nga modeli dhe shfaqet gjate trajnimit. Duhet te referohet te rezultatet aktuale te modelit, si Accuracy, F1 Score dhe Confusion Matrix.

### Pse nuk punon pa internet?

Localhost punon pa internet nese frontend, backend, MySQL dhe ML service jane aktive lokalisht. Internet mund te nevojitet vetem per sherbime cloud si OpenAI ose per instalim packages.

### Si lidhen komponentet?

Frontend perdor React Router per navigim, Axios service files per API calls, AuthContext/Redux per state, backend Express per API dhe databaza per ruajtje.

### Cka eshte real-time ne projekt?

Socket.IO per njoftime live. Kur ndryshon statusi i porosise ose krijohet alert, frontend merr event pa rifreskuar faqen.

### Cka eshte Swagger/OpenAPI?

Eshte dokumentim interaktiv i API-se ku mund te shihen endpoint-et, request-et dhe response-et.

### Cka jane foreign keys?

Foreign keys lidhin tabelat dhe ruajne integritetin referencial, p.sh. `UserRoles.user_id` lidhet me `Users.id`.

### Cka eshte 3NF?

Third Normal Form do te thote qe te dhenat jane te organizuara pa perseritje te panevojshme dhe cdo fushe varet nga celesi primar i tabeles.

### Si ndahet puna ne projekt?

Puna ndahet ne frontend, backend, databaze, ML, dokumentim dhe testim.

## 19. Pika te Forta per Prezantim

- Projekti ploteson stack-un e kerkuar dhe ka arkitekture te qarte.
- Ka 29 tabela dhe i ploteson 10 tabelat obligative.
- Ka role reale: Admin, Manager, Courier, User.
- Ka workflow biznesi: inventory -> shopping list -> marketplace order -> manager approval -> courier delivery.
- Ka ML service te vecante me FastAPI.
- Ka real-time notifications me Socket.IO.
- Ka Swagger/OpenAPI per dokumentim API.
- Ka fallback per PhotoScan kur OpenAI nuk eshte i disponueshem.

## 20. Komanda te Dobishme

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

ML Service:

```bash
cd ml-service
uvicorn main:app --reload --port 8000
```

Build frontend:

```bash
cd frontend
npm run build
```

Kontroll syntax backend:

```bash
cd backend
node --check index.js
node --check routes/index.js
```

