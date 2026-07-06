# ============================================================
#  endpoints.py — FastAPI ML Routes
#  Smart Kitchen ML Service
# ============================================================

from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from pydantic import BaseModel
from typing import Optional

from models.recommendation import recommend_recipes
from models.expiry import predict_expiry
from models.waste import predict_waste
from models.preferences import classify_preference
from models.image_detect import detect_food_image
from models.classifiers import (
    train_and_compare,
    load_compare_results,
    predict_risk,
    cluster_user_behavior,
)

router = APIRouter()


# ── Request models ─────────────────────────────────────────

class ExpiryPayload(BaseModel):
    category: str
    temperature: float
    purchase_date: str
    quantity: float


class WastePayload(BaseModel):
    ingredient_id: int
    category_id: int
    consumed_qty: float


class RiskPayload(BaseModel):
    category_id: int
    shelf_life_days: int
    quantity: float
    days_until_expiry: int


# ── Health ─────────────────────────────────────────────────

@router.get("/ml/health")
def health():
    return {"status": "online", "service": "Smart Kitchen ML", "models": 4, "version": "1.0.0"}


# ── Recipe Recommendation (Model 1 — Content-Based) ────────

@router.get("/ml/recommendations/{user_id}")
async def get_recommendations(user_id: int):
    try:
        recs = recommend_recipes(user_id)
        return {"user_id": user_id, "recommendations": recs, "count": len(recs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Expiry Predictor (Model 2 — RandomForestRegressor) ─────

@router.post("/ml/predict/expiry")
async def get_expiry_prediction(payload: ExpiryPayload):
    try:
        pred = predict_expiry(
            category=payload.category,
            temperature=payload.temperature,
            purchase_date_str=payload.purchase_date,
            quantity=payload.quantity,
        )
        return pred
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Waste Predictor (Model 3 — GradientBoosting) ───────────

@router.post("/ml/predict/waste")
async def get_waste_prediction(payload: WastePayload):
    try:
        pred = predict_waste(
            ingredient_id=payload.ingredient_id,
            category_id=payload.category_id,
            consumed_qty=payload.consumed_qty,
        )
        return pred
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Image Food Detection (heuristikë e bazuar te ngjyrat) ──

@router.post("/ml/detect-food-image")
async def detect_food_image_endpoint(image: UploadFile = File(...)):
    """
    Identifikim i thjeshtë i ushqimit nga foto, bazuar te statistikat
    reale të ngjyrave (jo model deep-learning — shih shënimin në
    models/image_detect.py). Për identifikim cilësor prodhimi përdoret
    OpenAI Vision nga backend-i Node: POST /api/ml/detect-food-image.
    """
    try:
        content = await image.read()
        if not content:
            raise HTTPException(status_code=400, detail="Imazhi është bosh")
        result = detect_food_image(content)
        if "error" in result:
            raise HTTPException(status_code=422, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Preference Classifier (Model 4 — RandomForest) ─────────

@router.get("/ml/preferences/{user_id}")
async def get_preference_classification(user_id: int):
    try:
        pref = classify_preference(user_id)
        return {"user_id": user_id, **pref}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Risk Classifier — Single prediction ────────────────────

@router.post("/ml/classify/risk")
async def classify_waste_risk(payload: RiskPayload):
    """
    Klasifiko rrezikun e humbjes për një artikull inventari.
    Modelet: Logistic Regression, KNN, Random Forest, Neural Network.
    Kthon: risk_level (low / medium / high) + probabilities.
    """
    try:
        result = predict_risk(
            category_id=payload.category_id,
            shelf_life_days=payload.shelf_life_days,
            quantity=payload.quantity,
            days_until_expiry=payload.days_until_expiry,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Classifiers Comparison — Train all 4 + metrics ─────────

@router.get("/ml/classifiers/compare")
async def compare_classifiers(retrain: bool = Query(default=False)):
    """
    Trajnon dhe krahason 4 klasifikues me GridSearchCV + metrics:
    - Logistic Regression
    - KNN
    - Random Forest
    - Neural Network (MLPClassifier)

    Metrics: accuracy, precision, recall, F1, confusion matrix, cross-val F1.
    """
    try:
        if retrain:
            result = train_and_compare()
        else:
            result = load_compare_results()
            if "results" in result:
                # reshape për response
                result = {
                    "models": result["results"],
                    "best_model": result["best_model"],
                    "features": result.get("features", []),
                    "dataset_size": None,
                    "classes": ["low (0)", "medium (1)", "high (2)"],
                }
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── KMeans Clustering ───────────────────────────────────────

@router.get("/ml/clustering/{user_id}")
async def get_user_clustering(
    user_id: int,
    n_clusters: int = Query(default=3, ge=2, le=6),
):
    """
    Grupon ingredientët e user-it sipas sjelljes konsumimi.
    Algoritmi: KMeans Clustering.
    Output: cluster labels, karakteristika, waste ratio per grup.
    """
    try:
        result = cluster_user_behavior(user_id=user_id, n_clusters=n_clusters)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
