import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from config.db import run_query_to_df, get_db_connection

def recommend_recipes(user_id):
    # 1. Fetch user's inventory ingredients
    inventory_query = """
        SELECT i.id AS ingredient_id, i.name AS ingredient_name, inv.quantity
        FROM InventoryItems inv
        JOIN Ingredients i ON inv.ingredient_id = i.id
        WHERE inv.user_id = %s
    """
    df_inventory = run_query_to_df(inventory_query, params=(user_id,))
    
    if df_inventory.empty:
        return []

    # Inventory ingredients as a single space-separated string
    inventory_ingredients = [item.lower().replace(" ", "_") for item in df_inventory['ingredient_name'].tolist()]
    inventory_str = " ".join(inventory_ingredients)
    
    # 2. Fetch all recipes and their ingredients
    recipes_query = """
        SELECT r.id AS recipe_id, r.title, r.difficulty,
               COALESCE(r.prep_time_min, 0) AS prep_time,
               COALESCE(r.cook_time_min, 0) AS cook_time,
               i.name AS ingredient_name
        FROM Recipes r
        JOIN RecipeIngredients ri ON r.id = ri.recipe_id
        JOIN Ingredients i ON ri.ingredient_id = i.id
    """
    df_recipes_raw = run_query_to_df(recipes_query)
    
    if df_recipes_raw.empty:
        return []

    # Group recipes and their ingredients
    recipes_grouped = df_recipes_raw.groupby(['recipe_id', 'title', 'difficulty', 'prep_time', 'cook_time'])['ingredient_name'].apply(
        lambda x: " ".join([i.lower().replace(" ", "_") for i in x])
    ).reset_index()
    
    # Add recipes ingredients list for later check of actual list matches
    recipes_grouped['ingredients_list'] = df_recipes_raw.groupby(['recipe_id', 'title', 'difficulty', 'prep_time', 'cook_time'])['ingredient_name'].apply(
        lambda x: [i.lower() for i in x]
    ).reset_index()['ingredient_name']
    
    # 3. Apply TF-IDF and Cosine Similarity
    vectorizer = TfidfVectorizer()
    
    # Combine recipe ingredient strings and user inventory string for vectorization
    corpus = recipes_grouped['ingredient_name'].tolist() + [inventory_str]
    tfidf_matrix = vectorizer.fit_transform(corpus)
    
    # Cosine similarity between all recipes and the last entry (the user inventory)
    similarities = cosine_similarity(tfidf_matrix[:-1], tfidf_matrix[-1]).flatten()
    
    # Add similarity score
    recipes_grouped['score'] = similarities
    
    # 4. Fetch User Preferences to filter/prioritize (e.g. Vegetarian, Gluten-Free)
    pref_query = """
        SELECT is_vegetarian, is_vegan, is_gluten_free, is_lactose_free
        FROM UserPreferences
        WHERE user_id = %s
    """
    df_pref = run_query_to_df(pref_query, params=(user_id,))
    user_prefs = df_pref.iloc[0].to_dict() if not df_pref.empty else {}
    
    # 5. Populate recommendations and calculate exact match percentages and missing items
    user_inv_set = set([i.lower() for i in df_inventory['ingredient_name'].tolist()])
    
    recommendations = []
    for _, row in recipes_grouped.iterrows():
        rec_ingredients = row['ingredients_list']
        rec_id = row['recipe_id']
        
        # Calculate missing and matched ingredients
        matched = [ing for ing in rec_ingredients if ing in user_inv_set]
        missing = [ing for ing in rec_ingredients if ing not in user_inv_set]
        
        match_percentage = round((len(matched) / len(rec_ingredients)) * 100, 2) if rec_ingredients else 0.0
        
        # Boost score if matching percentage is high
        final_score = float(row['score']) * 0.7 + (match_percentage / 100.0) * 0.3
        
        # Apply preferences check (Keto, Vegetarian, etc.)
        # If user has a preference, and recipe is not compliant, lower the score
        recipe_title_desc = (row['title'] + " " + row['ingredient_name']).lower()
        if (user_prefs.get("is_vegetarian") or user_prefs.get("is_vegan")) and not any(
            meat in recipe_title_desc for meat in ["chicken", "beef", "pork", "meat", "fish", "shrimp"]
        ):
            final_score += 0.15
        if user_prefs.get("is_gluten_free") and not any(
            gluten in recipe_title_desc for gluten in ["wheat", "flour", "bread", "pasta"]
        ):
            final_score += 0.15

        # Keep values within [0.0, 1.0] range
        final_score = min(max(final_score, 0.0), 1.0)
        
        recommendations.append({
            "recipe_id": int(rec_id),
            "title": row['title'],
            "difficulty": row['difficulty'],
            "prep_time": int(row['prep_time']),
            "cook_time": int(row['cook_time']),
            "score": round(final_score, 4),
            "match_percentage": match_percentage,
            "matched_ingredients": matched,
            "missing_ingredients": missing
        })
        
    # Sort recommendations by final score descending
    recommendations = sorted(recommendations, key=lambda x: x['score'], reverse=True)
    
    # Return top 15 matches
    return recommendations[:15]
