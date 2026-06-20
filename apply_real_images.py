import os
import shutil
import json

# Paths to generated images (from Gemini brain directory)
BRAIN_DIR = r"C:\Users\Admin\.gemini\antigravity-ide\brain\cb6a0335-c12b-4bb5-a5ca-a1d877fef71a"

IMAGE_MAPPING = {
    # Solid lipsticks (Luxury, Premium, Ultra-Luxury)
    ("luxury", "Đỏ"): "luxury_lipstick_red_1781696410575.png",
    ("luxury", "Hồng"): "luxury_lipstick_pink_1781696423103.png",
    ("luxury", "Cam"): "luxury_lipstick_orange_1781696438831.png",
    ("luxury", "San Hô"): "luxury_lipstick_coral_1781696455560.png",
    ("luxury", "Đỏ Đất / Gạch"): "luxury_lipstick_brick_1781696468814.png",
    ("luxury", "Mận / Berry"): "luxury_lipstick_berry_1781696481961.png",
    ("luxury", "Nude"): "luxury_lipstick_nude_1781696495913.png",
    
    # Liquid tints (Affordable)
    ("affordable", "Đỏ"): "affordable_tint_red_1781696508384.png",
    ("affordable", "Hồng"): "affordable_tint_pink_1781696523684.png",
    ("affordable", "Cam"): "affordable_tint_orange_1781696537858.png",
    ("affordable", "San Hô"): "affordable_tint_coral_1781696552327.png",
    ("affordable", "Đỏ Đất / Gạch"): "affordable_tint_brick_1781696565622.png",
    ("affordable", "Mận / Berry"): "affordable_tint_berry_1781696580498.png",
    ("affordable", "Nude"): "affordable_tint_nude_1781696593419.png"
}

def clean_svg_files():
    dirs_to_clean = ["data/images", "static/images"]
    for d in dirs_to_clean:
        if not os.path.exists(d):
            continue
        for f in os.listdir(d):
            if f.endswith(".svg") and f != "swatch_fallback.svg":
                os.remove(os.path.join(d, f))
                print(f"Removed fallback SVG: {os.path.join(d, f)}")

def apply_images():
    # Load seed data to classify
    with open("data/lipsticks.json", "r", encoding="utf-8") as f:
        lipsticks = json.load(f)
        
    os.makedirs("data/images", exist_ok=True)
    os.makedirs("static/images", exist_ok=True)
    
    for lp in lipsticks:
        brand = lp["brand"]
        shade = lp["shade_name"]
        color_fam = lp["color_family"]
        price_tier = lp["price_tier"]
        
        # Determine category (luxury vs affordable)
        cat = "affordable" if price_tier == "Affordable" else "luxury"
        
        img_file = IMAGE_MAPPING.get((cat, color_fam))
        if not img_file:
            # Fallback if color family doesn't map exactly
            img_file = IMAGE_MAPPING.get((cat, "Đỏ"))
            print(f"Warning: No mapping found for {cat} - {color_fam}, falling back to red.")
            
        src_path = os.path.join(BRAIN_DIR, img_file)
        
        safe_brand = brand.replace(" ", "").lower()
        safe_shade = shade.replace(" ", "_").replace("/", "_").lower()
        dest_filename = f"{safe_brand}_{safe_shade}.png"
        
        dest_path_data = os.path.join("data/images", dest_filename)
        dest_path_static = os.path.join("static/images", dest_filename)
        
        if os.path.exists(src_path):
            shutil.copy(src_path, dest_path_data)
            shutil.copy(src_path, dest_path_static)
            print(f"Copied image for {brand} - {shade} to {dest_filename}")
        else:
            print(f"Error: Source image not found at {src_path}")

if __name__ == "__main__":
    clean_svg_files()
    apply_images()
    print("Done applying real images!")
