import json

from app.core.config import settings


class DataService:
    def __init__(self) -> None:
        with settings.class_indices_path.open("r", encoding="utf-8") as file:
            self.class_indices: dict[str, str] = json.load(file)
        with settings.disease_info_path.open("r", encoding="utf-8") as file:
            self.disease_info: dict[str, dict[str, str]] = json.load(file)

    def get_disease(self, disease_name: str, language: str = "en") -> dict[str, str] | None:
        disease = self.disease_info.get(disease_name)
        if not disease:
            return None

        # Get language specific block or fallback to "en"
        lang_data = disease.get(language) or disease.get("en")
        if not lang_data:
            return None

        return {
            "disease_name": disease_name,
            "display_name": lang_data.get("display_name", disease_name),
            "plant_name": lang_data.get("plant_name", ""),
            "symptoms": lang_data.get("symptoms", ""),
            "causes": lang_data.get("causes", ""),
            "preventive_measures": lang_data.get("prevention", ""),
            "treatment": lang_data.get("treatment", ""),
            "pesticide": lang_data.get("pesticide", ""),
        }

    def list_diseases(self, language: str = "en") -> list[dict[str, str]]:
        results = []
        for disease_name in sorted(self.disease_info.keys()):
            disease = self.get_disease(disease_name, language)
            if disease:
                results.append(disease)
        return results

    def build_placeholder(self, disease_name: str) -> dict[str, str]:
        plant_name = disease_name.split("___")[0].replace("_", " ").replace(",", "")
        return {
            "disease_name": disease_name,
            "display_name": disease_name.replace("___", " — ").replace("_", " "),
            "plant_name": plant_name,
            "symptoms": "Detailed symptoms are not available yet.",
            "causes": "Detailed causes are not available yet.",
            "preventive_measures": "Preventive guidance is not available yet.",
            "treatment": "Treatment guidance is not available yet.",
            "pesticide": "No specific pesticide recommended yet.",
        }
