import os
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from config.db import run_query_to_df
import joblib

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "saved_models", "preference_model.pkl")
ENCODER_PATH = os.path.join(os.path.dirname(__file__), "..", "saved_models", "preference_encoder.pkl")

# Preferences profile list
PREFERENCE_LABELS = ["Standard", "Vegetarian", "Gluten-Free", "Keto"]

def train_preference_model():
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    
    # Generate a realistic synthetic dataset
    # We will simulate rating habits for users
    np.random.seed(42)
    data = []
    
    for _ in range(500):
        # We classify based on ratio of foods consumed
        # - meat_ratio: ratio of meat products
        # - gluten_ratio: ratio of wheat, flour, pasta
        # - carb_ratio: ratio of high-carb items (grains, sweets)
        # - veg_ratio: ratio of fresh vegetables and fruits
        
        pref = np.random.choice(PREFERENCE_LABELS)
        
        if pref == "Vegetarian":
            meat_ratio = np.random.uniform(0.0, 0.05)
            gluten_ratio = np.random.uniform(0.1, 0.4)
            carb_ratio = np.random.uniform(0.2, 0.6)
            veg_ratio = np.random.uniform(0.4, 0.8)
        elif pref == "Gluten-Free":
            meat_ratio = np.random.uniform(0.1, 0.3)
            gluten_ratio = np.random.uniform(0.0, 0.02)
            carb_ratio = np.random.uniform(0.1, 0.3)
            veg_ratio = np.random.uniform(0.3, 0.6)
        elif pref == "Keto":
            meat_ratio = np.random.uniform(0.4, 0.7)
            gluten_ratio = np.random.uniform(0.0, 0.05)
            carb_ratio = np.random.uniform(0.0, 0.05)
            veg_ratio = np.random.uniform(0.2, 0.4)
        else: # Standard
            meat_ratio = np.random.uniform(0.1, 0.3)
            gluten_ratio = np.random.uniform(0.1, 0.3)
            carb_ratio = np.random.uniform(0.2, 0.4)
            veg_ratio = np.random.uniform(0.1, 0.3)
            
        data.append({
            "meat_ratio": meat_ratio,
            "gluten_ratio": gluten_ratio,
            "carb_ratio": carb_ratio,
            "veg_ratio": veg_ratio,
            "preference": pref
        })
        
    df = pd.DataFrame(data)
    
    le = LabelEncoder()
    df['preference_encoded'] = le.fit_transform(df['preference'])
    
    X = df[['meat_ratio', 'gluten_ratio', 'carb_ratio', 'veg_ratio']]
    y = df['preference_encoded']
    
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    joblib.dump(model, MODEL_PATH)
    joblib.dump(le, ENCODER_PATH)
    print("Preference classifier trained and saved successfully!")
    return model, le

def load_preference_model():
    if not os.path.exists(MODEL_PATH) or not os.path.exists(ENCODER_PATH):
        return train_preference_model()
    return joblib.load(MODEL_PATH), joblib.load(ENCODER_PATH)

def classify_preference(user_id: int):
    # 1. Fetch user's consumption logs to build ratios
    consumption_query = """
        SELECT cl.quantity_used, i.name, i.category_id
        FROM ConsumptionLog cl
        JOIN Ingredients i ON cl.ingredient_id = i.id
        WHERE cl.user_id = %s
    """
    df_logs = run_query_to_df(consumption_query, params=(user_id,))
    
    # Defaults in case of no logs
    meat_ratio = 0.20
    gluten_ratio = 0.15
    carb_ratio = 0.25
    veg_ratio = 0.20
    
    if not df_logs.empty:
        total_items = len(df_logs)
        # Categories: 1: Dairy, 2: Meat/Fish, 3: Veg, 4: Fruits, 5: Bakery/Grains, 6: Others
        meat_count = len(df_logs[df_logs['category_id'] == 2])
        veg_count = len(df_logs[df_logs['category_id'].isin([3, 4])])
        bakery_count = len(df_logs[df_logs['category_id'] == 5])
        
        meat_ratio = meat_count / total_items
        veg_ratio = veg_count / total_items
        
        # Check gluten keywords
        gluten_items = df_logs[df_logs['name'].str.lower().str.contains("wheat|flour|bread|pasta|cookie|cake", na=False)]
        gluten_ratio = len(gluten_items) / total_items
        
        # Carb count estimate (bakery + grains + sweets)
        carb_ratio = (bakery_count + len(gluten_items)) / (2 * total_items)
        
    model, le = load_preference_model()
    
    X_pred = pd.DataFrame([[meat_ratio, gluten_ratio, carb_ratio, veg_ratio]],
                          columns=['meat_ratio', 'gluten_ratio', 'carb_ratio', 'veg_ratio'])
    
    pred_encoded = model.predict(X_pred)[0]
    predicted_pref = le.classes_[pred_encoded]
    
    # Calculate probabilities
    probs = model.predict_proba(X_pred)[0]
    confidence = float(np.max(probs))
    
    return {
        "predicted_preference": predicted_pref,
        "confidence_score": round(confidence, 4),
        "profile_ratios": {
            "meat_ratio": round(meat_ratio, 3),
            "gluten_ratio": round(gluten_ratio, 3),
            "carb_ratio": round(carb_ratio, 3),
            "veg_ratio": round(veg_ratio, 3)
        }
    }
