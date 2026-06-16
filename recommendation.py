import json
import math
import database

def get_content_based_recommendations(user_profile, limit=6):
    """
    Content-Based Filtering: scores lipsticks based on the user's skin profile.
    Returns sorted list of lipsticks with recommendation scores.
    """
    if not user_profile:
        user_profile = {}
        
    skin_tone = user_profile.get("skin_tone")
    undertone = user_profile.get("undertone")
    personal_color = user_profile.get("personal_color")
    pref_finish = user_profile.get("preferred_finish")
    
    lipsticks = database.fetch_all("SELECT * FROM lipsticks")
    scored_lipsticks = []
    
    for lp in lipsticks:
        score = 3.0 # Baseline score
        
        color_fam = lp.get("color_family", "")
        prod_name = lp.get("product_name", "").lower()
        shade_name = lp.get("shade_name", "").lower()
        
        # 1. Skin Tone Matching
        if skin_tone == "Fair":
            if color_fam == "Hồng":
                score += 1.5
            elif color_fam in ["Mận / Berry", "Nude"]:
                score += 0.5
        elif skin_tone == "Medium":
            if color_fam in ["Đỏ", "Cam", "San Hô"]:
                score += 1.2
            else:
                score += 0.3
        elif skin_tone == "Deep":
            if color_fam in ["Đỏ Đất / Gạch", "Mận / Berry"]:
                score += 1.5
            elif color_fam in ["Cam", "Nude"]:
                score += 0.5
            else:
                score -= 0.5
                
        # 2. Undertone Matching
        if undertone == "Warm":
            if color_fam in ["Cam", "San Hô", "Đỏ Đất / Gạch"]:
                score += 1.5
            elif color_fam in ["Hồng", "Mận / Berry"]:
                score -= 1.5
        elif undertone == "Cool":
            if color_fam in ["Hồng", "Mận / Berry"]:
                score += 1.5
            elif color_fam in ["Cam", "San Hô"]:
                score -= 1.5
        elif undertone == "Neutral":
            score += 0.5
            
        # 3. Personal Color Matching
        if personal_color == "Spring":
            if color_fam in ["San Hô", "Cam", "Hồng"]:
                score += 1.0
        elif personal_color == "Autumn":
            if color_fam in ["Đỏ Đất / Gạch", "Nude", "Cam"]:
                score += 1.0
        elif personal_color == "Summer":
            if color_fam == "Hồng":
                score += 1.0
        elif personal_color == "Winter":
            if color_fam in ["Đỏ", "Mận / Berry"]:
                score += 1.0
                
        # 4. Finish Preference
        if pref_finish == "Velvet" and ("velvet" in prod_name or "velvet" in shade_name):
            score += 2.0
        elif pref_finish == "Matte" and ("matte" in prod_name or "mat" in prod_name or "matte" in shade_name or "mat" in shade_name):
            score += 2.0
        elif pref_finish == "Satin" and ("satin" in prod_name or "satin" in shade_name):
            score += 2.0
        elif pref_finish == "Tint" and ("tint" in prod_name or "water" in prod_name or "glaze" in prod_name or "gloss" in prod_name or "tint" in shade_name):
            score += 2.0
            
        scored_lipsticks.append({
            "lipstick": lp,
            "score": round(score, 2)
        })
        
    scored_lipsticks.sort(key=lambda x: x["score"], reverse=True)
    
    result = []
    for item in scored_lipsticks[:limit]:
        lp = item["lipstick"]
        lp["match_score"] = item["score"]
        if "rgb_r" in lp:
            lp["rgb"] = {"r": lp["rgb_r"], "g": lp["rgb_g"], "b": lp["rgb_b"]}
            lp["hsl"] = {"h": lp["hsl_h"], "s": lp["hsl_s"], "l": lp["hsl_l"]}
            lp["lab"] = {"l": float(lp["lab_l"]), "a": float(lp["lab_a"]), "b": float(lp["lab_b"])}
            lp["dupes"] = json.loads(lp["dupes_json"]) if lp.get("dupes_json") else []
        result.append(lp)
        
    return result

def get_collaborative_filtering_recommendations(user_id, limit=6):
    """
    User-Based Collaborative Filtering: finds similar users and recommends items they rated highly.
    If ratings are insufficient, fallbacks to Content-Based.
    """
    # 1. Fetch user from e-commerce users table
    user_profile = database.fetch_one("SELECT * FROM users WHERE username = %s", (user_id,))
    if not user_profile:
        return get_content_based_recommendations({}, limit)
        
    # 2. Get all ratings from database
    all_ratings = database.fetch_all("SELECT user_id, lipstick_id, rating FROM ratings")
    
    if len(all_ratings) < 5:
        return get_content_based_recommendations(user_profile, limit)
        
    # 3. Build rating matrix
    user_ratings = {}
    for r in all_ratings:
        uid = r["user_id"]
        lid = r["lipstick_id"]
        rating = r["rating"]
        if uid not in user_ratings:
            user_ratings[uid] = {}
        user_ratings[uid][lid] = rating
        
    # Cold start checks
    if user_id not in user_ratings or len(user_ratings[user_id]) == 0:
        return get_content_based_recommendations(user_profile, limit)
        
    active_ratings = user_ratings[user_id]
    
    # 4. Compute similarity between active user and all other users
    similarities = {}
    
    def cosine_similarity(v1, v2):
        common_items = set(v1.keys()) & set(v2.keys())
        if len(common_items) == 0:
            return 0.0
            
        dot_product = sum(v1[item] * v2[item] for item in common_items)
        norm1 = math.sqrt(sum(v1[item]**2 for item in v1))
        norm2 = math.sqrt(sum(v2[item]**2 for item in v2))
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
            
        return dot_product / (norm1 * norm2)
        
    for other_user_id, other_ratings in user_ratings.items():
        if other_user_id == user_id:
            continue
        sim = cosine_similarity(active_ratings, other_ratings)
        if sim > 0:
            similarities[other_user_id] = sim
            
    if not similarities:
        return get_content_based_recommendations(user_profile, limit)
        
    # 5. Predict ratings for unrated lipsticks
    predicted_ratings = {}
    all_lipsticks = database.fetch_all("SELECT id FROM lipsticks")
    lipstick_ids = [lp["id"] for lp in all_lipsticks]
    
    for lid in lipstick_ids:
        if lid in active_ratings:
            continue
            
        weighted_sum = 0.0
        sim_sum = 0.0
        
        for other_uid, sim in similarities.items():
            if lid in user_ratings[other_uid]:
                weighted_sum += user_ratings[other_uid][lid] * sim
                sim_sum += sim
                
        if sim_sum > 0:
            predicted_ratings[lid] = weighted_sum / sim_sum
            
    if not predicted_ratings:
        return get_content_based_recommendations(user_profile, limit)
        
    # 6. Sort and fetch products
    sorted_predictions = sorted(predicted_ratings.items(), key=lambda x: x[1], reverse=True)[:limit]
    
    recommended_lipsticks = []
    for lid, score in sorted_predictions:
        lp = database.fetch_one("SELECT * FROM lipsticks WHERE id = %s", (lid,))
        if lp:
            lp["match_score"] = round(score, 2)
            if "rgb_r" in lp:
                lp["rgb"] = {"r": lp["rgb_r"], "g": lp["rgb_g"], "b": lp["rgb_b"]}
                lp["hsl"] = {"h": lp["hsl_h"], "s": lp["hsl_s"], "l": lp["hsl_l"]}
                lp["lab"] = {"l": float(lp["lab_l"]), "a": float(lp["lab_a"]), "b": float(lp["lab_b"])}
                lp["dupes"] = json.loads(lp["dupes_json"]) if lp.get("dupes_json") else []
            recommended_lipsticks.append(lp)
            
    # Fill up with CB recommendations
    if len(recommended_lipsticks) < limit:
        cb_recs = get_content_based_recommendations(user_profile, limit * 2)
        existing_ids = {r["id"] for r in recommended_lipsticks}
        for cb_lp in cb_recs:
            if cb_lp["id"] not in existing_ids:
                cb_lp["match_score"] = cb_lp.get("match_score", 3.0)
                recommended_lipsticks.append(cb_lp)
                existing_ids.add(cb_lp["id"])
            if len(recommended_lipsticks) == limit:
                break
                
    return recommended_lipsticks[:limit]
