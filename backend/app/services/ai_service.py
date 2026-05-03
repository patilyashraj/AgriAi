from __future__ import annotations

try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover - optional dependency during local edits
    genai = None

try:
    from google.api_core.exceptions import GoogleAPICallError
except ImportError:  # pragma: no cover - optional dependency during local edits
    GoogleAPICallError = Exception

from app.core.config import settings
from app.services.data_service import DataService


class AIServiceError(Exception):
    """Raised when AI assistance is unavailable."""


class AIService:
    def __init__(self, data_service: DataService) -> None:
        self.data_service = data_service
        if genai and settings.google_api_key:
            genai.configure(api_key=settings.google_api_key)

    def is_enabled(self) -> bool:
        return bool(genai and settings.google_api_key)

    def explain(self, disease_name: str, question: str, disease_context: dict[str, str], language: str = "en") -> str:
        if not self.is_enabled():
            raise AIServiceError("AI support is not configured. Add GOOGLE_API_KEY to enable it.")

        model = genai.GenerativeModel(settings.gemini_model_name)
        prompt = f"""
You are an agricultural expert helping farmers.

You MUST respond in: {language}

Rules:
- Keep the answer short (max 4–5 lines).
- Use simple, farmer-friendly language.
- Include: (1) 1-line disease explanation, (2) prevention steps, (3) pesticide/treatment suggestion.
- Base the answer primarily on the disease context below. If unsure, say so plainly.

Disease: {disease_name}
Plant: {disease_context.get("plant_name", "")}
Symptoms: {disease_context.get("symptoms", "")}
Causes: {disease_context.get("causes", "")}
Preventive measures: {disease_context.get("preventive_measures", "")}
Treatment: {disease_context.get("treatment", "")}

User question: {question}
""".strip()
        try:
            response = model.generate_content(prompt)
        except GoogleAPICallError as exc:
            raise AIServiceError(
                f"AI request failed for model '{settings.gemini_model_name}'. "
                f"Check GEMINI_MODEL_NAME and API access. Upstream error: {exc}"
            ) from exc
        except Exception as exc:
            raise AIServiceError(f"AI request failed unexpectedly. Upstream error: {exc}") from exc

        return response.text

    def translate(self, text: str, language: str) -> str:
        normalized_language = (language or "en").strip().lower()
        if normalized_language in {"en", "english"}:
            return text

        # Translation should not take down the UI if Gemini is not configured.
        # In that case we degrade gracefully by returning the original text.
        if not self.is_enabled():
            return text

        model = genai.GenerativeModel(settings.gemini_model_name)
        prompt = f"""
You are translating UI text for a farming support app.

Target language: {language}

Rules:
- Translate naturally into the target language.
- Keep the meaning identical.
- Keep numbers, units, pesticide/chemical names, and crop/disease names unchanged unless they have a widely-used local equivalent.
- Preserve formatting (line breaks, punctuation).
- Return ONLY the translated text with no extra commentary.

Text:
\"\"\"{text}\"\"\"
""".strip()
        try:
            response = model.generate_content(prompt)
        except GoogleAPICallError as exc:
            raise AIServiceError(
                f"AI request failed for model '{settings.gemini_model_name}'. "
                f"Check GEMINI_MODEL_NAME and API access. Upstream error: {exc}"
            ) from exc
        except Exception as exc:
            raise AIServiceError(f"AI request failed unexpectedly. Upstream error: {exc}") from exc

        return response.text
