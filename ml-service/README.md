# Smart Kitchen — ML Service

FastAPI microservice për Machine Learning.

## Setup

```bash
cd ml-service
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

## Ekzekuto

```bash
uvicorn main:app --reload --port 8000
```

Në Windows, përdor launcher-in që zgjedh automatikisht virtual environment-in:

```powershell
.\start.ps1
```

Për reload automatik gjatë zhvillimit:

```powershell
.\start.ps1 -Reload
```

API Docs: http://localhost:8000/docs

## Ekzekuto modelet (VS Code / terminal)

```bash
python scripts/run_all_models.py
```

Kjo ekzekuton:
- 4 klasifikues (LR, KNN, Random Forest, Neural Network)
- GridSearchCV hyperparameter tuning
- KMeans Clustering
- 3 modele regresioni
- Metrics të plota + tabela krahasuese

## Endpoints

| Endpoint | Përshkrimi |
|---|---|
| GET /ml/health | Status |
| GET /ml/recommendations/{user_id} | Recipe recommendations |
| POST /ml/predict/expiry | Parashiko datën skadimit |
| POST /ml/predict/waste | Parashiko humbjen |
| GET /ml/preferences/{user_id} | Profil preferencash |
| POST /ml/classify/risk | Klasifiko rrezikun (4 modele) |
| GET /ml/classifiers/compare | Krahaso 4 klasifikues |
| GET /ml/clustering/{user_id} | KMeans grupim |

## Dataset

`datasets/food_waste_inventory.csv` — 3000 rreshta, 17 kolona.

Features: category_id, shelf_life_days, quantity_kg, days_until_expiry,
          storage_temp_c, calories_per_100, consumption_frequency, risk_level.

## Modelet e ruajtura

Pas ekzekutimit të `run_all_models.py`, modelet ruhen te `saved_models/`:
- `best_classifier.pkl`
- `clf_logistic_regression.pkl`
- `clf_knn.pkl`
- `clf_random_forest.pkl`
- `clf_neural_network_64_32.pkl`
- `clf_neural_network_128_64_32.pkl`
- `kmeans_model.pkl`
- `reg_*.pkl`
