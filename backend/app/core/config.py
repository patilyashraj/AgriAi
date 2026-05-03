import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[3]
load_dotenv(BASE_DIR / ".env")


@dataclass(slots=True)
class Settings:
    model_path: Path = BASE_DIR / "plant_disease_efficientnetv2b0.keras"
    class_indices_path: Path = BASE_DIR / "class_indices.json"
    disease_info_path: Path = BASE_DIR / "plant_disease_info.json"
    google_api_key: str | None = os.getenv("GOOGLE_API_KEY")
    gemini_model_name: str = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")
    allowed_origins: list[str] = field(
        default_factory=lambda: [
            origin.strip()
            for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
            if origin.strip()
        ]
    )
    image_size: tuple[int, int] = (224, 224)
    top_k_predictions: int = 3


settings = Settings()
