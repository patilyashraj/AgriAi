from pydantic import BaseModel, Field


class DiseaseDetailResponse(BaseModel):
    disease_name: str
    display_name: str
    plant_name: str
    symptoms: str
    causes: str
    preventive_measures: str
    treatment: str
    pesticide: str


class PredictionScore(BaseModel):
    class_name: str
    confidence: float = Field(..., ge=0, le=1)


class PredictResponse(BaseModel):
    predicted_class: str
    confidence: float = Field(..., ge=0, le=1)
    top_predictions: list[PredictionScore]
    disease: DiseaseDetailResponse


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    ai_enabled: bool


class AIExplainRequest(BaseModel):
    disease_name: str
    question: str
    language: str = "en"


class AIExplainResponse(BaseModel):
    answer: str


class TranslateRequest(BaseModel):
    text: str


class TranslateResponse(BaseModel):
    translated_text: str
