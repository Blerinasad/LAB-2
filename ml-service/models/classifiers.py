# ============================================================
#  classifiers.py
#  Minimum 4 classifiers + Neural Network + Clustering
#  Requirement: Lab Course ML — UBT 2025–2026
#
#  Modelet:
#    1. Logistic Regression
#    2. KNN (K-Nearest Neighbors)
#    3. Random Forest Classifier
#    4. Neural Network (MLPClassifier — sklearn)
#    5. KMeans Clustering
#
#  Task: Klasifiko rrezikun e humbjes së ushqimit
#        Input:  category_id, shelf_life_days, quantity, days_until_expiry
#        Output: risk_level  (0=low, 1=medium, 2=high)
#
#  Endpoint: GET /ml/classifiers/compare
#            GET /ml/classifiers/predict
#            GET /ml/clustering/{user_id}
# ============================================================

import os
import numpy as np
import pandas as pd
import joblib

from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.cluster import KMeans
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix, classification_report
)
from sklearn.feature_selection import SelectKBest, f_classif

from config.db import run_query_to_df

# ── Paths ──────────────────────────────────────────────────
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)

SCALER_PATH  = os.path.join(MODELS_DIR, "clf_scaler.pkl")
KMEANS_PATH  = os.path.join(MODELS_DIR, "kmeans_model.pkl")


# ── Data generation ────────────────────────────────────────
def _generate_dataset(n=2000, seed=42):
    """
    Gjeneron dataset sintetik + mundësisht merr të dhëna reale nga MySQL.
    Features: category_id, shelf_life_days, quantity, days_until_expiry
    Target: risk_level (0=low, 1=medium, 2=high)
    """
    np.random.seed(seed)

    # Mundohu të marrësh të dhëna reale
    try:
        q = """
            SELECT
                i.category_id,
                COALESCE(i.shelf_life_days, 14)   AS shelf_life_days,
                inv.quantity,
                DATEDIFF(inv.expiry_date, CURDATE()) AS days_until_expiry
            FROM InventoryItems inv
            JOIN Ingredients i ON i.id = inv.ingredient_id
            WHERE inv.quantity > 0
              AND inv.expiry_date IS NOT NULL
            LIMIT 2000
        """
        df_real = run_query_to_df(q)
        if not df_real.empty and len(df_real) >= 50:
            df_real = df_real.dropna()
            df_real["days_until_expiry"] = df_real["days_until_expiry"].astype(float)
            # Label: risk bazuar në days_until_expiry
            df_real["risk_level"] = df_real["days_until_expiry"].apply(
                lambda d: 2 if d <= 2 else (1 if d <= 7 else 0)
            )
            df_real = df_real[["category_id", "shelf_life_days", "quantity", "days_until_expiry", "risk_level"]]
            # Plotëso me sintetik nëse të dhënat reale janë pak
            if len(df_real) >= 200:
                return df_real
    except Exception as e:
        print(f"[classifiers] Real data fetch failed: {e}. Using synthetic.")

    # Dataset sintetik
    rows = []
    for _ in range(n):
        cat        = np.random.randint(1, 7)
        shelf_life = np.random.choice([3, 5, 7, 14, 30, 90, 180, 365])
        quantity   = round(np.random.uniform(0.1, 10.0), 2)
        days_left  = np.random.randint(-5, 60)

        if days_left <= 2:
            risk = 2   # high
        elif days_left <= 7:
            risk = 1   # medium
        else:
            risk = 0   # low

        rows.append({
            "category_id": cat,
            "shelf_life_days": shelf_life,
            "quantity": quantity,
            "days_until_expiry": days_left,
            "risk_level": risk,
        })
    return pd.DataFrame(rows)


FEATURE_COLS = ["category_id", "shelf_life_days", "quantity", "days_until_expiry"]
TARGET_COL   = "risk_level"
RISK_LABELS  = {0: "low", 1: "medium", 2: "high"}


# ── Train & Evaluate all classifiers ──────────────────────
def train_and_compare():
    """
    Trajnon 4 klasifikues, bën hyperparameter tuning me GridSearchCV,
    kthon metrics të plota dhe confusion matrix.
    """
    df = _generate_dataset()
    X  = df[FEATURE_COLS].values
    y  = df[TARGET_COL].values

    # Feature selection — SelectKBest
    selector = SelectKBest(f_classif, k=4)
    X_sel    = selector.fit_transform(X, y)

    # Scale
    scaler   = StandardScaler()
    X_scaled = scaler.fit_transform(X_sel)
    joblib.dump(scaler, SCALER_PATH)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )

    # ── Logistic Regression ──────────────────────────────
    lr_params = {"C": [0.01, 0.1, 1, 10], "max_iter": [200]}
    lr_gs     = GridSearchCV(LogisticRegression(random_state=42), lr_params, cv=5, scoring="f1_weighted", n_jobs=-1)
    lr_gs.fit(X_train, y_train)
    lr_best   = lr_gs.best_estimator_

    # ── KNN ──────────────────────────────────────────────
    knn_params = {"n_neighbors": [3, 5, 7, 11], "weights": ["uniform", "distance"]}
    knn_gs     = GridSearchCV(KNeighborsClassifier(), knn_params, cv=5, scoring="f1_weighted", n_jobs=-1)
    knn_gs.fit(X_train, y_train)
    knn_best   = knn_gs.best_estimator_

    # ── Random Forest ────────────────────────────────────
    rf_params = {"n_estimators": [50, 100], "max_depth": [None, 10, 20]}
    rf_gs     = GridSearchCV(RandomForestClassifier(random_state=42), rf_params, cv=5, scoring="f1_weighted", n_jobs=-1)
    rf_gs.fit(X_train, y_train)
    rf_best   = rf_gs.best_estimator_

    # ── Neural Network (MLPClassifier) ───────────────────
    nn_params = {
        "hidden_layer_sizes": [(64, 32), (128, 64)],
        "alpha": [0.001, 0.01],
        "max_iter": [300],
    }
    nn_gs   = GridSearchCV(MLPClassifier(random_state=42), nn_params, cv=5, scoring="f1_weighted", n_jobs=-1)
    nn_gs.fit(X_train, y_train)
    nn_best = nn_gs.best_estimator_

    models = {
        "Logistic Regression": (lr_best, lr_gs.best_params_),
        "KNN": (knn_best, knn_gs.best_params_),
        "Random Forest": (rf_best, rf_gs.best_params_),
        "Neural Network": (nn_best, nn_gs.best_params_),
    }

    results = {}
    best_model_name = None
    best_f1 = -1

    for name, (model, best_params) in models.items():
        y_pred = model.predict(X_test)

        acc  = round(float(accuracy_score(y_test, y_pred)), 4)
        prec = round(float(precision_score(y_test, y_pred, average="weighted", zero_division=0)), 4)
        rec  = round(float(recall_score(y_test, y_pred, average="weighted", zero_division=0)), 4)
        f1   = round(float(f1_score(y_test, y_pred, average="weighted", zero_division=0)), 4)
        cm   = confusion_matrix(y_test, y_pred).tolist()
        cv   = round(float(cross_val_score(model, X_scaled, y, cv=5, scoring="f1_weighted").mean()), 4)

        results[name] = {
            "accuracy": acc,
            "precision": prec,
            "recall": rec,
            "f1_score": f1,
            "cross_val_f1": cv,
            "confusion_matrix": cm,
            "best_params": best_params,
        }

        if f1 > best_f1:
            best_f1         = f1
            best_model_name = name
            joblib.dump(model, os.path.join(MODELS_DIR, "best_classifier.pkl"))

    # Ruaj info
    joblib.dump({
        "results": results,
        "best_model": best_model_name,
        "features": FEATURE_COLS,
    }, os.path.join(MODELS_DIR, "classifier_results.pkl"))

    return {
        "models": results,
        "best_model": best_model_name,
        "dataset_size": len(df),
        "features": FEATURE_COLS,
        "classes": ["low (0)", "medium (1)", "high (2)"],
    }


def load_compare_results():
    path = os.path.join(MODELS_DIR, "classifier_results.pkl")
    if os.path.exists(path):
        return joblib.load(path)
    return train_and_compare()


# ── Single prediction ──────────────────────────────────────
def predict_risk(category_id: int, shelf_life_days: int, quantity: float, days_until_expiry: int):
    """
    Parashiko rrezikun e humbjes për një artikull të vetëm inventari.
    """
    clf_path = os.path.join(MODELS_DIR, "best_classifier.pkl")
    if not os.path.exists(clf_path) or not os.path.exists(SCALER_PATH):
        train_and_compare()

    clf    = joblib.load(clf_path)
    scaler = joblib.load(SCALER_PATH)

    X = scaler.transform([[category_id, shelf_life_days, quantity, days_until_expiry]])
    pred  = int(clf.predict(X)[0])
    proba = clf.predict_proba(X)[0].tolist() if hasattr(clf, "predict_proba") else []

    return {
        "risk_level": RISK_LABELS.get(pred, "unknown"),
        "risk_code": pred,
        "probabilities": {
            "low": round(proba[0], 4) if len(proba) > 0 else None,
            "medium": round(proba[1], 4) if len(proba) > 1 else None,
            "high": round(proba[2], 4) if len(proba) > 2 else None,
        },
    }


# ── KMeans Clustering ──────────────────────────────────────
def cluster_user_behavior(user_id: int, n_clusters: int = 3):
    """
    Grupon ingredientët e user-it bazuar në sjellje konsumimi.
    Input: ConsumptionLog + WasteLog për user_id
    Output: cluster labels + karakteristikat e secilit grup
    """
    try:
        q = f"""
            SELECT
                cl.ingredient_id,
                i.name             AS ingredient_name,
                i.category_id,
                SUM(cl.quantity_used)  AS total_consumed,
                COUNT(cl.id)           AS consumption_count,
                COALESCE(SUM(wl.quantity_wasted), 0)  AS total_wasted,
                COALESCE(COUNT(wl.id), 0)             AS waste_count
            FROM ConsumptionLog cl
            JOIN Ingredients i ON i.id = cl.ingredient_id
            LEFT JOIN WasteLog wl ON wl.ingredient_id = cl.ingredient_id
                                  AND wl.user_id = cl.user_id
            WHERE cl.user_id = {int(user_id)}
            GROUP BY cl.ingredient_id, i.name, i.category_id
            HAVING total_consumed > 0
        """
        df = run_query_to_df(q)
    except Exception as e:
        print(f"[clustering] DB error: {e}")
        df = pd.DataFrame()

    # Nëse nuk ka të dhëna reale, gjenero sintetike për user
    if df.empty or len(df) < n_clusters:
        np.random.seed(user_id % 999)
        n_fake = max(n_clusters * 3, 15)
        df = pd.DataFrame({
            "ingredient_id": np.arange(1, n_fake + 1),
            "ingredient_name": [f"Ingredient_{i}" for i in range(1, n_fake + 1)],
            "category_id": np.random.randint(1, 7, n_fake),
            "total_consumed": np.random.uniform(0.5, 20.0, n_fake),
            "consumption_count": np.random.randint(1, 15, n_fake),
            "total_wasted": np.random.uniform(0.0, 5.0, n_fake),
            "waste_count": np.random.randint(0, 5, n_fake),
        })

    features = ["total_consumed", "consumption_count", "total_wasted", "waste_count"]
    X_raw    = df[features].values.astype(float)

    scaler = StandardScaler()
    X      = scaler.fit_transform(X_raw)

    k = min(n_clusters, len(df))
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = km.fit_predict(X)
    df["cluster"] = labels

    # Karakteristika per cluster
    summary = []
    for c in sorted(df["cluster"].unique()):
        grp = df[df["cluster"] == c]
        summary.append({
            "cluster": int(c),
            "size": int(len(grp)),
            "ingredients": grp["ingredient_name"].tolist()[:10],
            "avg_consumed": round(float(grp["total_consumed"].mean()), 3),
            "avg_waste": round(float(grp["total_wasted"].mean()), 3),
            "waste_ratio": round(float(grp["total_wasted"].sum() / max(grp["total_consumed"].sum(), 0.001)), 3),
            "dominant_category": int(grp["category_id"].mode()[0]) if not grp["category_id"].mode().empty else 0,
            "label": _cluster_label(grp),
        })

    joblib.dump(km, KMEANS_PATH)

    return {
        "user_id": int(user_id),
        "n_clusters": int(k),
        "total_ingredients": int(len(df)),
        "inertia": round(float(km.inertia_), 2),
        "clusters": summary,
    }


def _cluster_label(grp):
    """Emërto clusterin bazuar në karakteristikat e tij."""
    ratio = grp["total_wasted"].sum() / max(grp["total_consumed"].sum(), 0.001)
    freq  = grp["consumption_count"].mean()
    if ratio > 0.25:
        return "Waste-Heavy Group"
    if freq > 8:
        return "High-Frequency Consumers"
    if grp["total_consumed"].mean() > 10:
        return "Bulk Buyers"
    return "Balanced Consumers"
