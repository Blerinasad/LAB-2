import os
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from config.db import run_query_to_df
import joblib

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "saved_models", "waste_model.pkl")

def train_waste_model():
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    
    # 1. Try to load historical data from MySQL
    history_query = """
        SELECT
            cl.ingredient_id,
            i.category_id,
            SUM(cl.quantity_used) as consumed_qty,
            COALESCE(SUM(wl.quantity_wasted), 0) as wasted_qty
        FROM ConsumptionLog cl
        JOIN Ingredients i ON cl.ingredient_id = i.id
        LEFT JOIN WasteLog wl ON cl.ingredient_id = wl.ingredient_id AND cl.user_id = wl.user_id
        GROUP BY cl.ingredient_id, i.category_id
    """
    try:
        df_mysql = run_query_to_df(history_query)
    except Exception as e:
        print("Could not fetch data from MySQL for waste training. Using synthetic data. Error:", e)
        df_mysql = pd.DataFrame()

    # 2. Generate/Supplement with synthetic dataset to ensure robust training
    np.random.seed(42)
    synthetic_data = []
    
    # Standard food categories (1: Dairy, 2: Meat, 3: Veg, 4: Fruits, 5: Bakery)
    for ingredient_id in range(1, 101):
        category_id = np.random.choice([1, 2, 3, 4, 5])
        
        # We simulate 50 weeks of history per ingredient
        for week in range(1, 51):
            # Base consumption per week
            base_cons = np.random.uniform(1.0, 15.0)
            # Consumption fluctuation
            consumed = base_cons * np.random.uniform(0.7, 1.3)
            
            # Waste probability: fresh foods (veg, fruits, meat) waste more
            waste_prob = 0.25 if category_id in [3, 4] else (0.15 if category_id == 2 else 0.05)
            
            if np.random.rand() < waste_prob:
                wasted = consumed * np.random.uniform(0.1, 0.4)
            else:
                wasted = 0.0
                
            synthetic_data.append({
                "ingredient_id": ingredient_id,
                "category_id": category_id,
                "consumed_qty": consumed,
                "wasted_qty": wasted
            })
            
    df_synthetic = pd.DataFrame(synthetic_data)
    
    if not df_mysql.empty and len(df_mysql) >= 10:
        # Merge actual and synthetic to have robust models
        df = pd.concat([df_mysql, df_synthetic], ignore_index=True)
    else:
        df = df_synthetic

    # 3. Train GradientBoostingRegressor
    # Features: ingredient_id, category_id, consumed_qty
    # Target: wasted_qty
    X = df[['ingredient_id', 'category_id', 'consumed_qty']]
    y = df['wasted_qty']
    
    model = GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, random_state=42)
    model.fit(X, y)
    
    joblib.dump(model, MODEL_PATH)
    print("Waste prediction model trained and saved successfully!")
    return model

def load_waste_model():
    if not os.path.exists(MODEL_PATH):
        return train_waste_model()
    return joblib.load(MODEL_PATH)

def predict_waste(ingredient_id: int, category_id: int, consumed_qty: float):
    model = load_waste_model()
    
    # Run prediction
    X_pred = pd.DataFrame([[ingredient_id, category_id, consumed_qty]], columns=['ingredient_id', 'category_id', 'consumed_qty'])
    predicted_waste = float(model.predict(X_pred)[0])
    
    # Ensure prediction is non-negative
    predicted_waste = max(0.0, round(predicted_waste, 3))
    
    # Determine waste risk level
    if predicted_waste / (consumed_qty + 0.001) > 0.20:
        waste_risk = "high"
    elif predicted_waste / (consumed_qty + 0.001) > 0.05:
        waste_risk = "medium"
    else:
        waste_risk = "low"
        
    return {
        "predicted_waste_qty_kg": predicted_waste,
        "waste_risk_level": waste_risk
    }
