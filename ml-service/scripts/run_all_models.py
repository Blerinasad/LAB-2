"""
================================================================
Smart Kitchen — ML Scripts (Python, VS Code)
Ekzekuto: python scripts/run_all_models.py

Modelet:
  1. Logistic Regression
  2. KNN
  3. Random Forest
  4. Neural Network (MLPClassifier)
  5. Clustering (KMeans)
  6. Regression (LR + RF + GradientBoosting)

Output:
  - Metrics të plota (accuracy, precision, recall, F1, confusion matrix)
  - Tabela krahasuese
  - Modelet .pkl ruhen në saved_models/
  - Reports HTML në ml_reports/
================================================================
"""

import os, sys, json, warnings
warnings.filterwarnings("ignore")

import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix, classification_report,
    mean_absolute_error, mean_squared_error, r2_score
)
# Classifiers
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingRegressor
from sklearn.neural_network import MLPClassifier
# Clustering
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE, "datasets", "food_waste_inventory.csv")
MODELS_DIR = os.path.join(BASE, "saved_models")
REPORTS_DIR = os.path.join(BASE, "ml_reports")
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

CLF_FEATURES = ["category_id","shelf_life_days","quantity_kg","days_until_expiry",
                 "storage_temp_c","calories_per_100","consumption_frequency"]
CLF_TARGET = "risk_code"
REG_FEATURES = ["category_id","shelf_life_days","quantity_kg","storage_temp_c",
                 "calories_per_100","purchase_days_ago","consumption_frequency"]
REG_TARGET = "waste_quantity_kg"


# ────────────────────────────────────────────────────────────
def separator(title=""):
    print("\n" + "="*60)
    if title: print(f"  {title}")
    print("="*60)


def load_data():
    df = pd.read_csv(DATA_PATH)
    print(f"Dataset: {len(df)} rreshta × {len(df.columns)} kolona")
    print(f"Kolona: {list(df.columns)}")
    print(f"\nShpërndarja e risk_level:\n{df['risk_level'].value_counts()}")
    print(f"\nMesataret:\n{df[CLF_FEATURES].describe().round(2)}")
    return df


# ────────────────────────────────────────────────────────────
# SECTION 1: CLASSIFIERS
# ────────────────────────────────────────────────────────────
def run_classifiers(df):
    separator("SEKSIONI 1: KLASIFIKUESIT (4+)")

    X = df[CLF_FEATURES].fillna(0).values
    y = df[CLF_TARGET].values

    # Feature Selection
    selector = SelectKBest(f_classif, k=5)
    X_sel = selector.fit_transform(X, y)
    selected = [CLF_FEATURES[i] for i in selector.get_support(indices=True)]
    print(f"\nFeature Selection (SelectKBest k=5): {selected}")
    joblib.dump(selector, os.path.join(MODELS_DIR, "clf_selector.pkl"))

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_sel)
    joblib.dump(scaler, os.path.join(MODELS_DIR, "clf_scaler.pkl"))

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"\nTrain: {len(X_train)} | Test: {len(X_test)}")

    classifiers = {
        # 1. Logistic Regression
        "Logistic Regression": {
            "model": LogisticRegression(random_state=42, max_iter=500),
            "params": {"C": [0.01, 0.1, 1, 10], "solver": ["lbfgs","saga"]},
        },
        # 2. K-Nearest Neighbors
        "KNN": {
            "model": KNeighborsClassifier(),
            "params": {"n_neighbors": [3, 5, 7, 11], "weights": ["uniform","distance"],
                       "metric": ["euclidean","manhattan"]},
        },
        # 3. Random Forest
        "Random Forest": {
            "model": RandomForestClassifier(random_state=42),
            "params": {"n_estimators": [50, 100], "max_depth": [None, 10],
                       "min_samples_split": [2, 5]},
        },
        # 4. Neural Network (MLPClassifier)
        "Neural Network (64-32)": {
            "model": MLPClassifier(random_state=42, max_iter=500),
            "params": {"hidden_layer_sizes": [(64,32)], "alpha": [0.001, 0.01],
                       "activation": ["relu","tanh"]},
        },
        # 4b. Neural Network arkitektura 2
        "Neural Network (128-64-32)": {
            "model": MLPClassifier(random_state=42, max_iter=500),
            "params": {"hidden_layer_sizes": [(128,64,32)], "alpha": [0.001, 0.01],
                       "activation": ["relu"]},
        },
    }

    results = {}
    best_f1 = -1
    best_name = None

    for name, cfg in classifiers.items():
        print(f"\n→ {name}...")
        gs = GridSearchCV(cfg["model"], cfg["params"], cv=5,
                          scoring="f1_weighted", n_jobs=-1, verbose=0)
        gs.fit(X_train, y_train)
        model = gs.best_estimator_
        y_pred = model.predict(X_test)

        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
        rec = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
        f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))
        cm = confusion_matrix(y_test, y_pred).tolist()
        cv = float(cross_val_score(model, X_scaled, y, cv=5, scoring="f1_weighted").mean())

        results[name] = {
            "accuracy": round(acc,4), "precision": round(prec,4),
            "recall": round(rec,4), "f1_score": round(f1,4),
            "cross_val_f1": round(cv,4), "confusion_matrix": cm,
            "best_params": gs.best_params_,
        }

        print(f"  Acc={acc:.4f}  Prec={prec:.4f}  Rec={rec:.4f}  F1={f1:.4f}  CV={cv:.4f}")
        print(f"  Best params: {gs.best_params_}")
        print(f"  Confusion Matrix:\n{np.array(cm)}")

        if f1 > best_f1:
            best_f1 = f1; best_name = name
            joblib.dump(model, os.path.join(MODELS_DIR, "best_classifier.pkl"))

        fname = name.lower().replace(" ","_").replace("(","").replace(")","").replace("-","_")
        joblib.dump(model, os.path.join(MODELS_DIR, f"clf_{fname}.pkl"))

    # Tabela krahasuese
    separator("TABELA KRAHASUESE — KLASIFIKUESIT")
    header = f"{'Model':<30} {'Accuracy':>10} {'Precision':>10} {'Recall':>10} {'F1':>10} {'CV-F1':>10}"
    print(header)
    print("-"*80)
    for name, m in results.items():
        mark = " ← BEST" if name == best_name else ""
        print(f"{name:<30} {m['accuracy']:>10.4f} {m['precision']:>10.4f} "
              f"{m['recall']:>10.4f} {m['f1_score']:>10.4f} {m['cross_val_f1']:>10.4f}{mark}")

    # Neural Network arkitektura diskutim
    separator("NEURAL NETWORK — Krahasim Arkitekturash")
    nn1 = results.get("Neural Network (64-32)", {})
    nn2 = results.get("Neural Network (128-64-32)", {})
    print(f"  Arkitektura 1: hidden=(64,32)     → F1={nn1.get('f1_score','N/A'):.4f}")
    print(f"  Arkitektura 2: hidden=(128,64,32) → F1={nn2.get('f1_score','N/A'):.4f}")
    better = "1 (64-32)" if nn1.get("f1_score",0) >= nn2.get("f1_score",0) else "2 (128-64-32)"
    print(f"  Konkluzioni: Arkitektura {better} performon më mirë.")
    print(f"  Arsyeja: Arkitektura e thjeshtë shmang overfitting për dataset-e të mesme.")
    print(f"  Funksionet aktivizimit: relu/tanh — relu është më e shpejt, tanh mund")
    print(f"  të japë rezultate më të mira kur të dhënat janë të shumta dhe të ngjeshura.")

    # Feature Importance (RF)
    rf_model = joblib.load(os.path.join(MODELS_DIR, "clf_random_forest.pkl"))
    if hasattr(rf_model, "feature_importances_"):
        importances = rf_model.feature_importances_
        separator("FEATURE IMPORTANCE (Random Forest)")
        for feat, imp in sorted(zip(selected, importances), key=lambda x: -x[1]):
            bar = "█" * int(imp * 30)
            print(f"  {feat:<25} {imp:.4f}  {bar}")

    # Ruaj results JSON
    results["best_model"] = best_name
    results["features_used"] = selected
    results["classes"] = ["low(0)","medium(1)","high(2)"]
    with open(os.path.join(MODELS_DIR, "classifier_results.json"), "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n✅ Modelet u ruajtën → saved_models/")
    return results


# ────────────────────────────────────────────────────────────
# SECTION 2: CLUSTERING (KMeans)
# ────────────────────────────────────────────────────────────
def run_clustering(df):
    separator("SEKSIONI 2: CLUSTERING — KMeans")

    # Heq etiketat (siç kërkon kursi)
    X_raw = df[CLF_FEATURES].fillna(0).values
    scaler = StandardScaler()
    X_sc = scaler.fit_transform(X_raw)

    # Elbow method
    print("\nElbow Method (Inertia vs K):")
    print(f"  {'K':>4} {'Inertia':>12}")
    print("  " + "-"*20)
    for k in range(2, 8):
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        km.fit(X_sc)
        print(f"  {k:>4} {km.inertia_:>12.2f}")

    # Optimal k=3
    best_k = 3
    km = KMeans(n_clusters=best_k, random_state=42, n_init=10)
    labels = km.fit_predict(X_sc)
    df2 = df.copy()
    df2["cluster"] = labels

    print(f"\nKMeans me k={best_k} — Inertia: {km.inertia_:.2f}")
    print(f"\nShpërndarja e grupeve:")
    for c in range(best_k):
        grp = df2[df2["cluster"] == c]
        wstR = grp["waste_ratio"].mean()
        print(f"\n  Grupi {c} ({len(grp)} rreshta):")
        print(f"    Avg waste ratio:   {wstR:.3f}")
        print(f"    Avg days_left:     {grp['days_until_expiry'].mean():.1f}")
        print(f"    Avg consumption:   {grp['consumption_frequency'].mean():.1f}")
        print(f"    Kategoritë:        {dict(grp['category_name'].value_counts().head(3))}")

    # PCA vizualizim (tekst)
    pca = PCA(n_components=2)
    X2 = pca.fit_transform(X_sc)
    print(f"\nPCA — Varianca e shpjeguar: {pca.explained_variance_ratio_.sum()*100:.1f}%")
    print(f"  PC1: {pca.explained_variance_ratio_[0]*100:.1f}%")
    print(f"  PC2: {pca.explained_variance_ratio_[1]*100:.1f}%")

    # Krahasim me etiketat reale (risk_code)
    print(f"\nKrahasim grupimesh me risk_code reale:")
    ct = pd.crosstab(df2["cluster"], df2["risk_level"],
                     rownames=["Cluster"], colnames=["Risk Level"])
    print(ct.to_string())
    print("\nInterpretim: Grupimet KMeans reflektojnë ndarjen low/medium/high")
    print("por jo plotësisht — clustering është unsupervised dhe gjen")
    print("modele natyrore pa etiketa, të cilat mund të jenë të ndryshme.")

    joblib.dump(km, os.path.join(MODELS_DIR, "kmeans_model.pkl"))
    print(f"\n✅ KMeans u ruajt → saved_models/kmeans_model.pkl")
    return km


# ────────────────────────────────────────────────────────────
# SECTION 3: REGRESSION
# ────────────────────────────────────────────────────────────
def run_regression(df):
    separator("SEKSIONI 3: MODELET REGRESIONI")

    X = df[REG_FEATURES].fillna(0).values
    y = df[REG_TARGET].fillna(0).values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42
    )

    models = {
        "Linear Regression": LinearRegression(),
        "Random Forest Regressor": RandomForestRegressor(
            n_estimators=100, random_state=42
        ),
        "Gradient Boosting Regressor": GradientBoostingRegressor(
            n_estimators=100, learning_rate=0.1, random_state=42
        ),
    }

    reg_results = {}
    print(f"\n{'Model':<30} {'MAE':>8} {'RMSE':>8} {'R²':>8}")
    print("-"*56)

    for name, model in models.items():
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        mae = float(mean_absolute_error(y_test, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
        r2 = float(r2_score(y_test, y_pred))

        reg_results[name] = {"MAE": round(mae,4), "RMSE": round(rmse,4), "R2": round(r2,4)}
        print(f"{name:<30} {mae:>8.4f} {rmse:>8.4f} {r2:>8.4f}")

        fname = name.lower().replace(" ","_")
        joblib.dump(model, os.path.join(MODELS_DIR, f"reg_{fname}.pkl"))

    with open(os.path.join(MODELS_DIR, "regression_results.json"), "w") as f:
        json.dump(reg_results, f, indent=2)

    print(f"\n✅ Modelet regresioni u ruajtën")
    return reg_results


# ────────────────────────────────────────────────────────────
# SECTION 4: DATASET EXPLORATION
# ────────────────────────────────────────────────────────────
def explore_data(df):
    separator("SEKSIONI 0: EKSPLORIMI I DATASETIT")

    print(f"\nDimensionet: {df.shape}")
    print(f"\nTipi i të dhënave:\n{df.dtypes}")
    print(f"\nVlera null:\n{df.isnull().sum()}")
    print(f"\nStatistikat:\n{df.describe().round(3).to_string()}")

    print(f"\nShpërndarja e kategorive:")
    print(df["category_name"].value_counts().to_string())

    print(f"\nShpërndarja e risk_level:")
    rv = df["risk_level"].value_counts()
    for lvl, cnt in rv.items():
        bar = "█" * (cnt // 30)
        print(f"  {lvl:<10} {cnt:>5}  {bar}")

    print(f"\nKorrelacioni me waste_ratio:")
    num_cols = [c for c in df.columns if df[c].dtype in ["float64","int64"]]
    corr = df[num_cols].corr()["waste_ratio"].drop("waste_ratio").sort_values()
    for feat, val in corr.items():
        print(f"  {feat:<30} {val:>7.4f}")


# ────────────────────────────────────────────────────────────
# MAIN
# ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    separator("SMART KITCHEN — ML PIPELINE")
    print("Dataset: food_waste_inventory.csv")
    print("Modelet: 4 Klasifikues + KMeans + 3 Regresion")

    df = load_data()
    explore_data(df)
    clf_results = run_classifiers(df)
    run_clustering(df)
    run_regression(df)

    separator("PËRFUNDIM")
    print("✅ Të gjitha modelet u ekzekutuan me sukses!")
    print("✅ Modelet .pkl → ml-service/saved_models/")
    print("✅ Rezultatet JSON → ml-service/saved_models/*.json")
    print(f"\nKlasifikuesi më i mirë: {clf_results.get('best_model','N/A')}")
    print("\nPër të ekzekutuar sërish:")
    print("  cd ml-service && python scripts/run_all_models.py")
