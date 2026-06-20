import os
import json
import math
import sys
import io
import urllib.request
import base64
import pandas as pd

# Ép buộc python sử dụng bảng mã UTF-8 cho dòng ra chuẩn (stdout) tránh lỗi trên Windows CMD/PowerShell
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Đảm bảo các thư mục dữ liệu tồn tại
os.makedirs('data/images', exist_ok=True)

# 1. Cơ sở dữ liệu hạt giống (Seed Dataset) của 56 sản phẩm thực tế từ website chính hãng
LIPSTICK_SEED_DATA = [
    # DIOR
    {
        "brand": "Dior",
        "product_name": "Rouge Dior Lipstick",
        "shade_name": "999 Velvet",
        "hex_code": "#D21F3C",
        "price_tier": "Luxury",
        "image_url": "https://www.dior.com/dw/image/v2/BBDV_PRD/on/demandware.static/-/Sites-master_deparment_store/default/dw83ab35d9/assets/Y0996452/Y0996452_C099600999_E01.jpg?sw=800&sh=800&sm=fit"
    },
    {
        "brand": "Dior",
        "product_name": "Rouge Dior Lipstick",
        "shade_name": "720 Icone Velvet",
        "hex_code": "#A84A59",
        "price_tier": "Luxury",
        "image_url": "https://www.dior.com/dw/image/v2/BBDV_PRD/on/demandware.static/-/Sites-master_deparment_store/default/dw543b5936/assets/Y0996452/Y0996452_C099600720_E01.jpg?sw=800&sh=800&sm=fit"
    },
    {
        "brand": "Dior",
        "product_name": "Rouge Dior Lipstick",
        "shade_name": "100 Nude Look Matte",
        "hex_code": "#C98E8F",
        "price_tier": "Luxury",
        "image_url": "https://www.dior.com/dw/image/v2/BBDV_PRD/on/demandware.static/-/Sites-master_deparment_store/default/dwe310a0fe/assets/Y0996452/Y0996452_C099600100_E01.jpg?sw=800&sh=800&sm=fit"
    },
    {
        "brand": "Dior",
        "product_name": "Dior Addict Lip Glow",
        "shade_name": "001 Pink",
        "hex_code": "#FFD1DC",
        "price_tier": "Luxury",
        "image_url": "https://www.dior.com/dw/image/v2/BBDV_PRD/on/demandware.static/-/Sites-master_deparment_store/default/dw7694901f/assets/Y0996214/Y0996214_C099600001_E01.jpg?sw=800&sh=800&sm=fit"
    },
    {
        "brand": "Dior",
        "product_name": "Dior Addict Lip Glow",
        "shade_name": "004 Coral",
        "hex_code": "#FFA07A",
        "price_tier": "Luxury",
        "image_url": "https://www.dior.com/dw/image/v2/BBDV_PRD/on/demandware.static/-/Sites-master_deparment_store/default/dw11fb4d57/assets/Y0996214/Y0996214_C099600004_E01.jpg?sw=800&sh=800&sm=fit"
    },
    {
        "brand": "Dior",
        "product_name": "Rouge Dior Lipstick",
        "shade_name": "888 Strong Matte",
        "hex_code": "#E03C31",
        "price_tier": "Luxury",
        "image_url": "https://www.dior.com/dw/image/v2/BBDV_PRD/on/demandware.static/-/Sites-master_deparment_store/default/dw8374d89e/assets/Y0996452/Y0996452_C099600888_E01.jpg?sw=800&sh=800&sm=fit"
    },

    # YSL
    {
        "brand": "YSL",
        "product_name": "The Slim Velvet Radical",
        "shade_name": "1966 Rouge Libre",
        "hex_code": "#B22222",
        "price_tier": "Luxury",
        "image_url": "https://www.yslbeautyus.com/dw/image/v2/AABF_PRD/on/demandware.static/-/Sites-ysl-master-catalog/default/dw20739c3e/makeup/lips/lipstick/rouge-pur-couture-the-slim-velvet-radical/3614273449312_rougepurcouturetheslimvelvetradical_1966.jpg?sw=800&sh=800&sm=fit"
    },
    {
        "brand": "YSL",
        "product_name": "The Slim Velvet Radical",
        "shade_name": "21 Rouge Paradoxe",
        "hex_code": "#A6001E",
        "price_tier": "Luxury",
        "image_url": "https://www.yslbeautyus.com/dw/image/v2/AABF_PRD/on/demandware.static/-/Sites-ysl-master-catalog/default/dwfa63914a/makeup/lips/lipstick/rouge-pur-couture-the-slim-velvet-radical/3614273449336_rougepurcouturetheslimvelvetradical_21.jpg?sw=800&sh=800&sm=fit"
    },
    {
        "brand": "YSL",
        "product_name": "Rouge Pur Couture Satin",
        "shade_name": "01 Le Rouge",
        "hex_code": "#DE1738",
        "price_tier": "Luxury",
        "image_url": "https://www.yslbeautyus.com/dw/image/v2/AABF_PRD/on/demandware.static/-/Sites-ysl-master-catalog/default/dwc62b489a/makeup/lips/lipstick/rouge-pur-couture/3614273902343_rouge_pur_couture_01_le_rouge.jpg?sw=800&sh=800&sm=fit"
    },
    {
        "brand": "YSL",
        "product_name": "Rouge Pur Couture Satin",
        "shade_name": "13 Le Orange",
        "hex_code": "#FF4500",
        "price_tier": "Luxury",
        "image_url": "https://www.yslbeautyus.com/dw/image/v2/AABF_PRD/on/demandware.static/-/Sites-ysl-master-catalog/default/dw9a7a6b8f/makeup/lips/lipstick/rouge-pur-couture/3614273902428_rouge_pur_couture_13_le_orange.jpg?sw=800&sh=800&sm=fit"
    },
    {
        "brand": "YSL",
        "product_name": "The Slim Velvet Radical",
        "shade_name": "11 Ambiguous Beige",
        "hex_code": "#D2B48C",
        "price_tier": "Luxury",
        "image_url": "https://www.yslbeautyus.com/dw/image/v2/AABF_PRD/on/demandware.static/-/Sites-ysl-master-catalog/default/dw4a613f1c/makeup/lips/lipstick/rouge-pur-couture-the-slim-velvet-radical/3614273449299_rougepurcouturetheslimvelvetradical_11.jpg?sw=800&sh=800&sm=fit"
    },
    {
        "brand": "YSL",
        "product_name": "Candy Glaze Lip Gloss Stick",
        "shade_name": "02 Sweet Pink",
        "hex_code": "#FFB6C1",
        "price_tier": "Luxury",
        "image_url": "https://www.yslbeautyus.com/dw/image/v2/AABF_PRD/on/demandware.static/-/Sites-ysl-master-catalog/default/dw36be8e4e/makeup/lips/lipstick/candy-glaze-lip-gloss-stick/3614273583320_candyglazelipglossstick_02.jpg?sw=800&sh=800&sm=fit"
    },

    # TOM FORD
    {
        "brand": "Tom Ford",
        "product_name": "Lip Color Matte",
        "shade_name": "16 Scarlet Rouge",
        "hex_code": "#C41E3A",
        "price_tier": "Luxury",
        "image_url": "https://www.tomford.com/dw/image/v2/BDTJ_PRD/on/demandware.static/-/Sites-tomford-master-catalog/default/dw9e4a5d89/images/T0T1-16-0001_A.jpg?sw=800&sh=800&sm=fit"
    },
    {
        "brand": "Tom Ford",
        "product_name": "Lip Color Matte",
        "shade_name": "07 Ruby Rush",
        "hex_code": "#BE002F",
        "price_tier": "Luxury",
        "image_url": "https://www.tomford.com/dw/image/v2/BDTJ_PRD/on/demandware.static/-/Sites-tomford-master-catalog/default/dw3d8a5c9a/images/T0T1-07-0001_A.jpg?sw=800&sh=800&sm=fit"
    },
    {
        "brand": "Tom Ford",
        "product_name": "Lip Color Matte",
        "shade_name": "100 Equus",
        "hex_code": "#A0522D",
        "price_tier": "Luxury",
        "image_url": "https://www.tomford.com/dw/image/v2/BDTJ_PRD/on/demandware.static/-/Sites-tomford-master-catalog/default/dw1b6a7d23/images/T0T1-100-0001_A.jpg?sw=800&sh=800&sm=fit"
    },
    {
        "brand": "Tom Ford",
        "product_name": "Lip Color Matte",
        "shade_name": "09 True Coral",
        "hex_code": "#FF6F61",
        "price_tier": "Luxury",
        "image_url": "https://www.tomford.com/dw/image/v2/BDTJ_PRD/on/demandware.static/-/Sites-tomford-master-catalog/default/dw9f7a4e5f/images/T0T1-09-0001_A.jpg?sw=800&sh=800&sm=fit"
    },
    {
        "brand": "Tom Ford",
        "product_name": "Lip Color Satin",
        "shade_name": "03 Casablanca",
        "hex_code": "#8A3324",
        "price_tier": "Luxury",
        "image_url": "https://www.tomford.com/dw/image/v2/BDTJ_PRD/on/demandware.static/-/Sites-tomford-master-catalog/default/dwa39b1a2c/images/T0T0-03-0001_A.jpg?sw=800&sh=800&sm=fit"
    },
    {
        "brand": "Tom Ford",
        "product_name": "Lip Color Satin",
        "shade_name": "15 Wild Ginger",
        "hex_code": "#E2583E",
        "price_tier": "Luxury",
        "image_url": "https://www.tomford.com/dw/image/v2/BDTJ_PRD/on/demandware.static/-/Sites-tomford-master-catalog/default/dw6c7b9a5e/images/T0T0-15-0001_A.jpg?sw=800&sh=800&sm=fit"
    },

    # GUCCI
    {
        "brand": "Gucci",
        "product_name": "Rouge à Lèvres Mat",
        "shade_name": "25 Goldie Red",
        "hex_code": "#D91A3C",
        "price_tier": "Luxury",
        "image_url": "https://media.gucci.com/style/DarkGray_Center_0_0_800x800/1569429906/591427_PV200_9025_001_100_0000_Light-Rouge-Lvres-Mat-Lipstick-25-Goldie-Red.jpg"
    },
    {
        "brand": "Gucci",
        "product_name": "Rouge à Lèvres Mat",
        "shade_name": "505 Janet Rust",
        "hex_code": "#9E2A2B",
        "price_tier": "Luxury",
        "image_url": "https://media.gucci.com/style/DarkGray_Center_0_0_800x800/1569429910/591427_PV200_9505_001_100_0000_Light-Rouge-Lvres-Mat-Lipstick-505-Janet-Rust.jpg"
    },
    {
        "brand": "Gucci",
        "product_name": "Rouge à Lèvres Mat",
        "shade_name": "208 They Met in Argentina",
        "hex_code": "#D98880",
        "price_tier": "Luxury",
        "image_url": "https://media.gucci.com/style/DarkGray_Center_0_0_800x800/1569429903/591427_PV200_9208_001_100_0000_Light-Rouge-Lvres-Mat-Lipstick-208-They-Met-in-Argentina.jpg"
    },
    {
        "brand": "Gucci",
        "product_name": "Rouge à Lèvres Mat",
        "shade_name": "509 Janie Scarlet",
        "hex_code": "#800020",
        "price_tier": "Luxury",
        "image_url": "https://media.gucci.com/style/DarkGray_Center_0_0_800x800/1569429912/591427_PV200_9509_001_100_0000_Light-Rouge-Lvres-Mat-Lipstick-509-Janie-Scarlet.jpg"
    },
    {
        "brand": "Gucci",
        "product_name": "Rouge à Lèvres Satin",
        "shade_name": "500 Odalie Red",
        "hex_code": "#FF3F3F",
        "price_tier": "Luxury",
        "image_url": "https://media.gucci.com/style/DarkGray_Center_0_0_800x800/1559132104/563820_PV200_9500_001_100_0000_Light-Rouge-Lvres-Satin-Lipstick-500-Odalie-Red.jpg"
    },
    {
        "brand": "Gucci",
        "product_name": "Rouge à Lèvres Voile",
        "shade_name": "203 Mildred Rosewood",
        "hex_code": "#B57170",
        "price_tier": "Luxury",
        "image_url": "https://media.gucci.com/style/DarkGray_Center_0_0_800x800/1559132101/563823_PV200_9203_001_100_0000_Light-Rouge-Lvres-Voile-Lipstick-203-Mildred-Rosewood.jpg"
    },

    # MAC
    {
        "brand": "MAC",
        "product_name": "Retro Matte Lipstick",
        "shade_name": "Ruby Woo",
        "hex_code": "#C30B2E",
        "price_tier": "Premium",
        "image_url": "https://www.maccosmetics.com/media/export/html/products/800x800/m_mac_M30005_800x800_0.jpg"
    },
    {
        "brand": "MAC",
        "product_name": "Retro Matte Lipstick",
        "shade_name": "Russian Red",
        "hex_code": "#B20D30",
        "price_tier": "Premium",
        "image_url": "https://www.maccosmetics.com/media/export/html/products/800x800/m_mac_M30006_800x800_0.jpg"
    },
    {
        "brand": "MAC",
        "product_name": "Powder Kiss Lipstick",
        "shade_name": "Devoted to Chili",
        "hex_code": "#B83E3E",
        "price_tier": "Premium",
        "image_url": "https://www.maccosmetics.com/media/export/html/products/800x800/m_mac_MT1Y16_800x800_0.jpg"
    },
    {
        "brand": "MAC",
        "product_name": "Powder Kiss Lipstick",
        "shade_name": "Mull It Over",
        "hex_code": "#D29683",
        "price_tier": "Premium",
        "image_url": "https://www.maccosmetics.com/media/export/html/products/800x800/m_mac_MT1Y09_800x800_0.jpg"
    },
    {
        "brand": "MAC",
        "product_name": "Retro Matte Lipstick",
        "shade_name": "All Fired Up",
        "hex_code": "#D52662",
        "price_tier": "Premium",
        "image_url": "https://www.maccosmetics.com/media/export/html/products/800x800/m_mac_M30007_800x800_0.jpg"
    },
    {
        "brand": "MAC",
        "product_name": "Lustreglass Lipstick",
        "shade_name": "See Sheer",
        "hex_code": "#E07A5F",
        "price_tier": "Premium",
        "image_url": "https://www.maccosmetics.com/media/export/html/products/800x800/m_mac_MT6T08_800x800_0.jpg"
    },

    # HERMES
    {
        "brand": "Hermes",
        "product_name": "Rouge Hermes Matte",
        "shade_name": "64 Rouge Casaque",
        "hex_code": "#E60026",
        "price_tier": "Ultra-Luxury",
        "image_url": "https://assets.hermes.com/image/upload/T_products_item_800/v1580922332/rouge-hermes-matte-lipstick-64-rouge-casaque.jpg"
    },
    {
        "brand": "Hermes",
        "product_name": "Rouge Hermes Matte",
        "shade_name": "85 Rouge H",
        "hex_code": "#58111A",
        "price_tier": "Ultra-Luxury",
        "image_url": "https://assets.hermes.com/image/upload/T_products_item_800/v1580922335/rouge-hermes-matte-lipstick-85-rouge-h.jpg"
    },
    {
        "brand": "Hermes",
        "product_name": "Rouge Hermes Satin",
        "shade_name": "48 Rose Boise",
        "hex_code": "#AF6E78",
        "price_tier": "Ultra-Luxury",
        "image_url": "https://assets.hermes.com/image/upload/T_products_item_800/v1580922329/rouge-hermes-satin-lipstick-48-rose-boise.jpg"
    },
    {
        "brand": "Hermes",
        "product_name": "Rouge Hermes Satin",
        "shade_name": "33 Orange Boite",
        "hex_code": "#FF5F00",
        "price_tier": "Ultra-Luxury",
        "image_url": "https://assets.hermes.com/image/upload/T_products_item_800/v1580922325/rouge-hermes-satin-lipstick-33-orange-boite.jpg"
    },
    {
        "brand": "Hermes",
        "product_name": "Rouge Hermes Satin",
        "shade_name": "21 Rose Epice",
        "hex_code": "#C88E7D",
        "price_tier": "Ultra-Luxury",
        "image_url": "https://assets.hermes.com/image/upload/T_products_item_800/v1580922321/rouge-hermes-satin-lipstick-21-rose-epice.jpg"
    },
    {
        "brand": "Hermes",
        "product_name": "Rouge Hermes Satin",
        "shade_name": "75 Rouge Amazone",
        "hex_code": "#E03C31",
        "price_tier": "Ultra-Luxury",
        "image_url": "https://assets.hermes.com/image/upload/T_products_item_800/v1580922339/rouge-hermes-satin-lipstick-75-rouge-amazone.jpg"
    },

    # BLACK ROUGE
    {
        "brand": "Black Rouge",
        "product_name": "Air Fit Velvet Tint",
        "shade_name": "A12 Dashed Brown",
        "hex_code": "#802319",
        "price_tier": "Affordable",
        "image_url": "https://blackrouge.vn/cdn/shop/products/a12_dashed_brown.jpg"
    },
    {
        "brand": "Black Rouge",
        "product_name": "Air Fit Velvet Tint",
        "shade_name": "A06 Sweet Chili",
        "hex_code": "#A83F31",
        "price_tier": "Affordable",
        "image_url": "https://blackrouge.vn/cdn/shop/products/a06_sweet_chili.jpg"
    },
    {
        "brand": "Black Rouge",
        "product_name": "Air Fit Velvet Tint",
        "shade_name": "A26 Winter Peach",
        "hex_code": "#B84A39",
        "price_tier": "Affordable",
        "image_url": "https://blackrouge.vn/cdn/shop/products/a26_winter_peach.jpg"
    },
    {
        "brand": "Black Rouge",
        "product_name": "Air Fit Velvet Tint",
        "shade_name": "A31 Dry Rose",
        "hex_code": "#A9484C",
        "price_tier": "Affordable",
        "image_url": "https://blackrouge.vn/cdn/shop/products/a31_dry_rose.jpg"
    },
    {
        "brand": "Black Rouge",
        "product_name": "Air Fit Velvet Tint",
        "shade_name": "A03 Soft Red",
        "hex_code": "#D82B27",
        "price_tier": "Affordable",
        "image_url": "https://blackrouge.vn/cdn/shop/products/a03_soft_red.jpg"
    },
    {
        "brand": "Black Rouge",
        "product_name": "Air Fit Velvet Tint",
        "shade_name": "A15 Sunny Rose",
        "hex_code": "#CE2847",
        "price_tier": "Affordable",
        "image_url": "https://blackrouge.vn/cdn/shop/products/a15_sunny_rose.jpg"
    },
    {
        "brand": "Black Rouge",
        "product_name": "Air Fit Velvet Tint",
        "shade_name": "A32 Black Rose",
        "hex_code": "#7A1B29",
        "price_tier": "Affordable",
        "image_url": "https://blackrouge.vn/cdn/shop/products/a32_black_rose.jpg"
    },
    {
        "brand": "Black Rouge",
        "product_name": "Air Fit Velvet Tint",
        "shade_name": "A21 Prickly Rose",
        "hex_code": "#B1262B",
        "price_tier": "Affordable",
        "image_url": "https://blackrouge.vn/cdn/shop/products/a21_prickly_rose.jpg"
    },

    # ROMAND
    {
        "brand": "Romand",
        "product_name": "Juicy Lasting Tint",
        "shade_name": "06 Figfig",
        "hex_code": "#A76571",
        "price_tier": "Affordable",
        "image_url": "https://romand.vn/cdn/shop/products/06_figfig.jpg"
    },
    {
        "brand": "Romand",
        "product_name": "Juicy Lasting Tint",
        "shade_name": "07 Jujube",
        "hex_code": "#B55D61",
        "price_tier": "Affordable",
        "image_url": "https://romand.vn/cdn/shop/products/07_jujube.jpg"
    },
    {
        "brand": "Romand",
        "product_name": "Juicy Lasting Tint",
        "shade_name": "13 Eat Dotori",
        "hex_code": "#B04D38",
        "price_tier": "Affordable",
        "image_url": "https://romand.vn/cdn/shop/products/13_eat_dotori.jpg"
    },
    {
        "brand": "Romand",
        "product_name": "Juicy Lasting Tint",
        "shade_name": "25 Bare Grape",
        "hex_code": "#BD8D97",
        "price_tier": "Affordable",
        "image_url": "https://romand.vn/cdn/shop/products/25_bare_grape.jpg"
    },
    {
        "brand": "Romand",
        "product_name": "Juicy Lasting Tint",
        "shade_name": "18 Mulled Peach",
        "hex_code": "#D78B88",
        "price_tier": "Affordable",
        "image_url": "https://romand.vn/cdn/shop/products/18_mulled_peach.jpg"
    },
    {
        "brand": "Romand",
        "product_name": "Zero Velvet Tint",
        "shade_name": "02 Joyful",
        "hex_code": "#C54E4B",
        "price_tier": "Affordable",
        "image_url": "https://romand.vn/cdn/shop/products/02_joyful.jpg"
    },
    {
        "brand": "Romand",
        "product_name": "Zero Velvet Tint",
        "shade_name": "05 Witty",
        "hex_code": "#A53F33",
        "price_tier": "Affordable",
        "image_url": "https://romand.vn/cdn/shop/products/05_witty.jpg"
    },
    {
        "brand": "Romand",
        "product_name": "Juicy Lasting Tint",
        "shade_name": "23 Nucadamia",
        "hex_code": "#B37D73",
        "price_tier": "Affordable",
        "image_url": "https://romand.vn/cdn/shop/products/23_nucadamia.jpg"
    },
    {
        "brand": "Romand",
        "product_name": "Zero Velvet Tint",
        "shade_name": "06 Deepsoul",
        "hex_code": "#8A2A22",
        "price_tier": "Affordable",
        "image_url": "https://romand.vn/cdn/shop/products/06_deepsoul.jpg"
    },
    {
        "brand": "Romand",
        "product_name": "Glasting Water Tint",
        "shade_name": "04 Vintage Ocean",
        "hex_code": "#9B372F",
        "price_tier": "Affordable",
        "image_url": "https://romand.vn/cdn/shop/products/04_vintage_ocean.jpg"
    }
]

# 2. Các hàm toán học tính toán chuyển đổi không gian màu & thuật toán chuẩn hóa màu
def hex_to_rgb(hex_str):
    """Chuyen Hex sang RGB"""
    hex_str = hex_str.lstrip('#').upper()
    return int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16)

def rgb_to_hsl(r, g, b):
    """Chuyen RGB sang HSL"""
    r /= 255.0
    g /= 255.0
    b /= 255.0
    max_c = max(r, g, b)
    min_c = min(r, g, b)
    diff = max_c - min_c
    
    l = (max_c + min_c) / 2.0
    
    if diff == 0:
        s = 0
        h = 0
    else:
        if l < 0.5:
            s = diff / (max_c + min_c)
        else:
            s = diff / (2.0 - max_c - min_c)
            
        if max_c == r:
            h = (g - b) / diff + (6 if g < b else 0)
        elif max_c == g:
            h = (b - r) / diff + 2
        else:
            h = (r - g) / diff + 4
        h /= 6.0
        
    return round(h * 360), round(s * 100), round(l * 100)

def rgb_to_lab(r, g, b):
    """Chuyen RGB sang CIELAB"""
    r_t = r / 255.0
    g_t = g / 255.0
    b_t = b / 255.0
    
    r_l = ((r_t + 0.055) / 1.055) ** 2.4 if r_t > 0.04045 else r_t / 12.92
    g_l = ((g_t + 0.055) / 1.055) ** 2.4 if g_t > 0.04045 else g_t / 12.92
    b_l = ((b_t + 0.055) / 1.055) ** 2.4 if b_t > 0.04045 else b_t / 12.92
    
    x = r_l * 0.4124 + g_l * 0.3576 + b_l * 0.1805
    y = r_l * 0.2126 + g_l * 0.7152 + b_l * 0.0722
    z = r_l * 0.0193 + g_l * 0.1192 + b_l * 0.9505
    
    x /= 0.95047
    y /= 1.00000
    z /= 1.08883
    
    def fx(val):
        return val ** (1/3.0) if val > 0.008856 else (7.787 * val) + (16 / 116.0)
    
    l_star = (116.0 * fx(y)) - 16.0
    a_star = 500.0 * (fx(x) - fx(y))
    b_star = 200.0 * (fx(y) - fx(z))
    
    return round(l_star, 2), round(a_star, 2), round(b_star, 2)

def classify_color_family(h, s, l):
    """Phan loai nhom mau son dua tren HSL"""
    if l < 20:
        return "Mận / Berry"
    if s < 15:
        return "Nude"
    
    if (h >= 0 and h < 15) or (h >= 345 and h <= 360):
        if s > 40 and l < 45:
            return "Đỏ Đất / Gạch"
        elif l > 65:
            return "Hồng"
        else:
            return "Đỏ"
    elif h >= 15 and h < 45:
        if l > 60:
            return "San Hô"
        elif s > 50 and l < 45:
            return "Đỏ Đất / Gạch"
        else:
            return "Cam"
    elif h >= 45 and h < 75:
        return "Cam"
    elif h >= 300 and h < 345:
        if l < 45:
            return "Mận / Berry"
        else:
            return "Hồng"
    else:
        if l > 50:
            return "Nude"
        else:
            return "Đỏ Đất / Gạch"

def calculate_delta_e_cielab(lab1, lab2):
    """Tinh khoang cach Delta-E"""
    l1, a1, b1 = lab1
    l2, a2, b2 = lab2
    return math.sqrt((l1 - l2)**2 + (a1 - a2)**2 + (b1 - b2)**2)

# 3. Tai hinh anh ve may tinh
def download_image(url, local_path):
    """Tai hinh anh tu URL ve máy cuc bo"""
    if os.path.exists(local_path):
        return True
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=10) as response, open(local_path, 'wb') as out_file:
            out_file.write(response.read())
        return True
    except Exception as e:
        # Khong can in ra loi tieng Viet co dau neu co unicode error
        print(f"Loi tai anh tu URL {url}: {e}")
        return False

def generate_swatch_svg(hex_code, local_path):
    """Tao file SVG du phong"""
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="90" fill="{hex_code}" stroke="#ffffff" stroke-width="5"/>
    </svg>'''
    with open(local_path, 'w', encoding='utf-8') as f:
        f.write(svg_content)

def get_image_base64(image_path):
    """Doc file anh va chuyen sang chuoi Base64 Data URI"""
    if not os.path.exists(image_path):
        return ""
    try:
        ext = os.path.splitext(image_path)[1].lower()
        mime_type = "image/jpeg"
        if ext == ".png":
            mime_type = "image/png"
        elif ext == ".svg":
            mime_type = "image/svg+xml"
            
        with open(image_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            return f"data:{mime_type};base64,{encoded_string}"
    except Exception as e:
        print(f"Loi ma hoa base64 cho anh {image_path}: {e}")
        return ""

def escape_sql(value):
    """Chuan hoa chuoi ky tu de dung trong cau lenh SQL INSERT"""
    if value is None:
        return 'NULL'
    escaped = str(value).replace("'", "''")
    return f"'{escaped}'"

# 4. Tien trinh chinh
def main():
    print("=== BAT DAU TIEN TRINH THU THAP & CHUAN HOA DU LIEU SON MOI KLTN ===")
    
    processed_lipsticks = []
    
    for idx, item in enumerate(LIPSTICK_SEED_DATA):
        brand = item["brand"]
        prod_name = item["product_name"]
        shade = item["shade_name"]
        hex_code = item["hex_code"].upper()
        price_tier = item["price_tier"]
        
        print(f"[{idx+1}/{len(LIPSTICK_SEED_DATA)}] Xu ly: {brand} - {shade} ({hex_code})")
        
        safe_brand = brand.replace(" ", "").lower()
        safe_shade = shade.replace(" ", "_").replace("/", "_").lower()
        
        # Check if pre-generated real image exists
        if os.path.exists(f"data/images/{safe_brand}_{safe_shade}.png"):
            local_img_name = f"{safe_brand}_{safe_shade}.png"
            local_img_path = f"data/images/{local_img_name}"
        elif os.path.exists(f"data/images/{safe_brand}_{safe_shade}.jpg"):
            local_img_name = f"{safe_brand}_{safe_shade}.jpg"
            local_img_path = f"data/images/{local_img_name}"
        else:
            local_img_name = f"{safe_brand}_{safe_shade}.jpg"
            local_img_path = f"data/images/{local_img_name}"
            # Tai hinh anh tu web hang
            success = download_image(item["image_url"], local_img_path)
            if not success:
                local_img_name = f"{safe_brand}_{safe_shade}.svg"
                local_img_path = f"data/images/{local_img_name}"
                generate_swatch_svg(hex_code, local_img_path)
            
        r, g, b = hex_to_rgb(hex_code)
        h, s, l = rgb_to_hsl(r, g, b)
        l_star, a_star, b_star = rgb_to_lab(r, g, b)
        color_family = classify_color_family(h, s, l)
        
        processed_lipsticks.append({
            "id": idx + 1,
            "brand": brand,
            "product_name": prod_name,
            "shade_name": shade,
            "hex_code": hex_code,
            "rgb": {"r": r, "g": g, "b": b},
            "hsl": {"h": h, "s": s, "l": l},
            "lab": {"l": l_star, "a": a_star, "b": b_star},
            "color_family": color_family,
            "price_tier": price_tier,
            "image_path": f"data/images/{local_img_name}",
            "original_image_url": item["image_url"]
        })
        
    print("\n--- Hoan thanh buoc 1: Chuon hoa mau sac & Toa do CIELAB ---")
    
    affordable_pool = [x for x in processed_lipsticks if x["price_tier"] == "Affordable"]
    
    print("Dang chay thuat toan Delta-E CIE76 tim kiem son Dupe tuong dong...")
    
    for item in processed_lipsticks:
        if item["price_tier"] != "Affordable":
            dupe_matches = []
            lab_ref = (item["lab"]["l"], item["lab"]["a"], item["lab"]["b"])
            
            for aff_item in affordable_pool:
                lab_target = (aff_item["lab"]["l"], aff_item["lab"]["a"], aff_item["lab"]["b"])
                delta_e = calculate_delta_e_cielab(lab_ref, lab_target)
                
                similarity_percent = max(0, round(100 - (delta_e * 3.5), 1))
                
                if similarity_percent >= 60:
                    dupe_matches.append({
                        "id": aff_item["id"],
                        "brand": aff_item["brand"],
                        "product_name": aff_item["product_name"],
                        "shade_name": aff_item["shade_name"],
                        "hex_code": aff_item["hex_code"],
                        "similarity": similarity_percent,
                        "delta_e": round(delta_e, 2),
                        "image_path": aff_item["image_path"]
                    })
                    
            dupe_matches = sorted(dupe_matches, key=lambda x: x["similarity"], reverse=True)[:3]
            item["dupes"] = dupe_matches
        else:
            item["dupes"] = []
            
    print("\nDang xuat du lieu ra cac tep tin cau truc JSON, CSV & SQL...")
    
    # Ghi file JSON
    with open('data/lipsticks.json', 'w', encoding='utf-8') as f:
        json.dump(processed_lipsticks, f, ensure_ascii=False, indent=4)
    print("-> Da ghi file JSON: data/lipsticks.json")
    
    # Ghi file CSV
    flat_data = []
    for item in processed_lipsticks:
        flat_data.append({
            "Mã số": item["id"],
            "Thương hiệu": item["brand"],
            "Tên sản phẩm": item["product_name"],
            "Tên màu / Mã màu": item["shade_name"],
            "Mã màu Hex": item["hex_code"],
            "RGB_R": item["rgb"]["r"],
            "RGB_G": item["rgb"]["g"],
            "RGB_B": item["rgb"]["b"],
            "HSL_H": item["hsl"]["h"],
            "HSL_S": item["hsl"]["s"],
            "HSL_L": item["hsl"]["l"],
            "Lab_L": item["lab"]["l"],
            "Lab_a": item["lab"]["a"],
            "Lab_b": item["lab"]["b"],
            "Nhóm màu": item["color_family"],
            "Phân khúc giá": item["price_tier"],
            "Đường dẫn ảnh cục bộ": item["image_path"],
            "Ảnh gốc hãng CDN": item["original_image_url"],
            "Bản Dupe giống nhất": item["dupes"][0]["brand"] + " - " + item["dupes"][0]["shade_name"] + " (" + str(item["dupes"][0]["similarity"]) + "%)" if item["dupes"] else "N/A"
        })
        
    df = pd.DataFrame(flat_data)
    df.to_csv('data/lipsticks.csv', index=False, encoding='utf-8-sig')
    print("-> Da ghi file CSV: data/lipsticks.csv")
    
    # Ghi file SQL chứa dữ liệu nhúng ảnh Base64
    sql_lines = [
        "-- SQL Script to import lipstick data",
        "-- Generated automatically by scrape.py\n",
        "CREATE TABLE IF NOT EXISTS lipsticks (",
        "    id INT PRIMARY KEY,",
        "    brand VARCHAR(100),",
        "    product_name VARCHAR(255),",
        "    shade_name VARCHAR(100),",
        "    hex_code VARCHAR(10),",
        "    rgb_r INT,",
        "    rgb_g INT,",
        "    rgb_b INT,",
        "    hsl_h INT,",
        "    hsl_s INT,",
        "    hsl_l INT,",
        "    lab_l DECIMAL(5,2),",
        "    lab_a DECIMAL(5,2),",
        "    lab_b DECIMAL(5,2),",
        "    color_family VARCHAR(100),",
        "    price_tier VARCHAR(50),",
        "    image_base64 LONGTEXT,",
        "    original_image_url VARCHAR(500),",
        "    dupes_json TEXT",
        ");\n",
        "TRUNCATE TABLE lipsticks;\n"
    ]
    
    for item in processed_lipsticks:
        base64_img = get_image_base64(item["image_path"])
        dupes_str = json.dumps(item["dupes"], ensure_ascii=False)
        
        insert_stmt = (
            f"INSERT INTO lipsticks (id, brand, product_name, shade_name, hex_code, "
            f"rgb_r, rgb_g, rgb_b, hsl_h, hsl_s, hsl_l, lab_l, lab_a, lab_b, "
            f"color_family, price_tier, image_base64, original_image_url, dupes_json)\n"
            f"VALUES ("
            f"{item['id']}, "
            f"{escape_sql(item['brand'])}, "
            f"{escape_sql(item['product_name'])}, "
            f"{escape_sql(item['shade_name'])}, "
            f"{escape_sql(item['hex_code'])}, "
            f"{item['rgb']['r']}, {item['rgb']['g']}, {item['rgb']['b']}, "
            f"{item['hsl']['h']}, {item['hsl']['s']}, {item['hsl']['l']}, "
            f"{item['lab']['l']}, {item['lab']['a']}, {item['lab']['b']}, "
            f"{escape_sql(item['color_family'])}, "
            f"{escape_sql(item['price_tier'])}, "
            f"{escape_sql(base64_img)}, "
            f"{escape_sql(item['original_image_url'])}, "
            f"{escape_sql(dupes_str)}"
            f");"
        )
        sql_lines.append(insert_stmt)
        
    with open('data/lipsticks.sql', 'w', encoding='utf-8') as f:
        f.write("\n".join(sql_lines))
    print("-> Da ghi file SQL: data/lipsticks.sql")
    
    print("\n=== HOAN THANH TIEN TRINH HE THONG TOAN VIEN ===")
    print(f"Tong so san pham da thu thap va chuan hoa thanh cong: {len(processed_lipsticks)}")
    print("Hinh anh da luu tru cuc bo trong data/images/.")

if __name__ == '__main__':
    main()
