"""
image_detect.py — Heuristikë e thjeshtë e identifikimit të ushqimit nga foto.

SHËNIM I RËNDËSISHËM (transparencë):
Ky shërbim ML (Python/FastAPI) nuk ka asnjë model të trajnuar të visionit
(CNN/ResNet/etj.) për identifikim ushqimi nga foto — në repo nuk ekziston
dataset imazhesh apo libreri deep-learning (torch/tensorflow) për këtë qëllim.

Identifikimi i KLASIT TË PRODHIMTAR me cilësi të lartë në këtë projekt bëhet
nga backend-i Node (services/ML.service.js) nëpërmjet OpenAI Vision
(ose mode demo kur OPENAI_API_KEY mungon) — shih photo-scan.jsx → POST
/api/ml/detect-food-image.

Ky endpoint plotëson kërkesën e specifikuar që ML-service Python të kishte
GJITHASHTU një rrugë /ml/detect-food-image, por e bën këtë me një HEURISTIKË
TË NDERSHME bazuar te statistikat reale të ngjyrave të pikselave (jo me vlera
të rastësishme/të trilluara). Konfidenca mbahet e moderuar dhe sasia
(quantity_estimate) ËSHTË GJITHMONË None, sepse vlerësimi i sasisë nga
ngjyra mesatare e një fotoje nuk është i besueshëm.
"""
from io import BytesIO
from PIL import Image

# Kandidatë sipas kovave të ngjyrave dominante — heuristikë e thjeshtë,
# JO klasifikim i specifikuar saktë i produktit.
_HUE_BUCKETS = [
    # (hue_min, hue_max, kategoria, kandidatët, ruajtja, jetëgjatësia_ditë)
    (0,   18,  "Perime",   ["Domate", "Mollë e kuqe", "Spec i kuq"],   "Fridge",  7),
    (18,  45,  "Perime",   ["Karrota", "Patate", "Portokall"],         "Fridge",  20),
    (45,  70,  "Fruta",    ["Banane", "Limon"],                        "Counter", 7),
    (70,  170, "Perime",   ["Mollë jeshile", "Spinaq", "Kastravec", "Speca"], "Fridge", 8),
    (170, 220, "Bulmet",   ["Qumësht", "Kos"],                         "Fridge",  6),
    (220, 300, "Drithëra", ["Bukë", "Pasta", "Oriz"],                  "Pantry",  180),
    (300, 342, "Fruta",    ["Panxhar", "Rrush"],                       "Fridge",  10),
    (342, 360, "Perime",   ["Domate", "Mollë e kuqe", "Spec i kuq"],   "Fridge",  7),
]


def _rgb_to_hue(r, g, b):
    """RGB (0-255) → hue në shkallë (0-360). Pa libreri shtesë (colorsys mjafton)."""
    import colorsys
    h, _, _ = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
    return h * 360.0


def detect_food_image(image_bytes: bytes) -> dict:
    """
    Analizon bajtet e imazhit dhe kthon një vlerësim heuristik.
    Nuk fabrikon kurrë quantity_estimate — ai mbetet None me shpjegim.
    """
    try:
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
    except Exception:
        return {"error": "Imazhi nuk mund të lexohet (format i pavlefshëm)"}

    # Zvogëlo për performancë dhe merr ngjyrën mesatare reale
    small = img.resize((48, 48))
    pixels = list(small.getdata())
    n = len(pixels)
    avg_r = sum(p[0] for p in pixels) / n
    avg_g = sum(p[1] for p in pixels) / n
    avg_b = sum(p[2] for p in pixels) / n
    brightness = (avg_r + avg_g + avg_b) / 3
    hue = _rgb_to_hue(avg_r, avg_g, avg_b)

    # Imazh shumë i errët/shumë i çelur → saturim i ulët, heuristika e ngjyrës
    # nuk është e besueshme (p.sh. foto bardh-e-zi ose errësirë).
    low_confidence_signal = brightness < 25 or brightness > 240

    bucket = next(
        (b for b in _HUE_BUCKETS if b[0] <= hue < b[1]),
        _HUE_BUCKETS[0],
    )
    _, _, category, candidates, storage, shelf_days = bucket
    detected = candidates[0]
    alternatives = candidates[1:]

    confidence = 35 if low_confidence_signal else 52  # heuristikë e thjeshtë → konfidencë modeste, e ndershme

    return {
        "detected_product": detected,
        "alternatives": alternatives,
        "confidence": confidence,
        "category": category,
        "shelf_life_estimate": f"{shelf_days} ditë",
        "storage_recommendation": storage,
        "suggested_recipes": [],  # kërkon lidhje me DB-në MySQL; jashtë qëllimit të këtij mikroshërbimi
        "quantity_estimate": None,
        "note": (
            "Vlerësim heuristik bazuar në ngjyrën mesatare të pikselave "
            "(ML-service Python nuk ka model vision të trajnuar). Për "
            "identifikim më të saktë, backend-i Node përdor OpenAI Vision "
            "te POST /api/ml/detect-food-image. Sasia nuk mund të "
            "vlerësohet nga ngjyra mesatare e fotos."
        ),
        "method": "color_heuristic_v1",
    }
