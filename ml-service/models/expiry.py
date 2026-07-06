import os
import datetime
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import joblib

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "saved_models", "expiry_model.pkl")
ENCODER_PATH = os.path.join(os.path.dirname(__file__), "..", "saved_models", "expiry_encoder.pkl")

# Predefined average shelf life in days at 4 degrees Celsius for common categories
CATEGORY_SHELF_LIFE = {
    "dairy": 10,
    "meat": 5,
    "fish": 3,
    "vegetables": 7,
    "fruits": 10,
    "bakery": 4,
    "beverages": 30,
    "grains": 180,
    "canned": 365,
    "spices": 500,
    "others": 14
}

def train_expiry_model():
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    
    # Generate a realistic synthetic dataset
    np.random.seed(42)
    data = []
    categories = list(CATEGORY_SHELF_LIFE.keys())
    
    for _ in range(1000):
        cat = np.random.choice(categories)
        base_life = CATEGORY_SHELF_LIFE[cat]
        
        # Temperature effect: higher temperature decreases shelf life
        temp = np.random.uniform(-5, 25)
        # Optimal temperature is ~4 degrees. Deviances reduce shelf life.
        temp_factor = np.exp(-0.05 * (temp - 4)) if temp > 4 else np.exp(-0.02 * (4 - temp))
        
        # Quantity effect: larger quantities might consume slower or spoil slightly differently
        qty = np.random.uniform(0.1, 10.0)
        
        # Calculate realistic shelf life
        shelf_life = base_life * temp_factor * np.random.uniform(0.8, 1.2)
        shelf_life = max(1.0, shelf_life) # At least 1 day
        
        data.append({
            "category": cat,
            "temperature": temp,
            "quantity": qty,
            "shelf_life": shelf_life
        })
        
    df = pd.DataFrame(data)
    
    # Encode categories
    le = LabelEncoder()
    df['category_encoded'] = le.fit_transform(df['category'])
    
    X = df[['category_encoded', 'temperature', 'quantity']]
    y = df['shelf_life']
    
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    # Save the trained model and label encoder
    joblib.dump(model, MODEL_PATH)
    joblib.dump(le, ENCODER_PATH)
    print("Expiry model trained and saved successfully!")
    return model, le

def load_model_and_encoder():
    if not os.path.exists(MODEL_PATH) or not os.path.exists(ENCODER_PATH):
        return train_expiry_model()
    else:
        model = joblib.load(MODEL_PATH)
        le = joblib.load(ENCODER_PATH)
        return model, le

def predict_expiry(category: str, temperature: float, purchase_date_str: str, quantity: float):
    model, le = load_model_and_encoder()
    
    # Fallback/default category if not found
    category = category.lower().strip()
    if category not in le.classes_:
        # Map to closest category or use 'others'
        category = "others"
        
    category_encoded = le.transform([category])[0]
    
    # Run prediction
    X_pred = pd.DataFrame([[category_encoded, temperature, quantity]], columns=['category_encoded', 'temperature', 'quantity'])
    predicted_days = float(model.predict(X_pred)[0])
    
    # Process dates
    try:
        purchase_date = datetime.datetime.strptime(purchase_date_str, "%Y-%m-%d")
    except ValueError:
        purchase_date = datetime.datetime.today()
        
    expiry_date = purchase_date + datetime.timedelta(days=int(np.round(predicted_days)))
    expiry_date_str = expiry_date.strftime("%Y-%m-%d")
    
    # Determine risk level
    if predicted_days <= 3:
        risk_level = "high"
    elif predicted_days <= 7:
        risk_level = "medium"
    else:
        risk_level = "low"
        
    return {
        "predicted_shelf_life_days": int(np.round(predicted_days)),
        "predicted_expiry_date": expiry_date_str,
        "risk_level": risk_level
    }
