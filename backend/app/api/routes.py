from fastapi import APIRouter, File, Header, HTTPException, UploadFile

from app.schemas.responses import (
    AIExplainRequest,
    AIExplainResponse,
    DiseaseDetailResponse,
    HealthResponse,
    PredictResponse,
    TranslateRequest,
    TranslateResponse,
)
from app.services.ai_service import AIService, AIServiceError
from app.services.data_service import DataService
from app.services.model_service import ModelService, ModelServiceError

router = APIRouter()

data_service = DataService()
model_service = ModelService()
ai_service = AIService(data_service=data_service)


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        model_loaded=model_service.is_available(),
        ai_enabled=ai_service.is_enabled(),
    )


@router.get("/diseases", response_model=list[DiseaseDetailResponse])
def list_diseases(x_language: str | None = Header(default="en")) -> list[DiseaseDetailResponse]:
    diseases = data_service.list_diseases(language=x_language)
    return [DiseaseDetailResponse(**disease) for disease in diseases]


@router.get("/diseases/{disease_name}", response_model=DiseaseDetailResponse)
def get_disease(disease_name: str, x_language: str | None = Header(default="en")) -> DiseaseDetailResponse:
    disease = data_service.get_disease(disease_name, language=x_language)
    if not disease:
        raise HTTPException(status_code=404, detail="Disease not found")
    return DiseaseDetailResponse(**disease)


@router.post("/predict", response_model=PredictResponse)
async def predict(file: UploadFile = File(...), x_language: str | None = Header(default="en")) -> PredictResponse:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload a valid image file.")

    contents = await file.read()
    try:
        result = model_service.predict(contents)
    except ModelServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    disease = data_service.get_disease(result["predicted_class"], language=x_language)
    if not disease:
        disease = data_service.build_placeholder(result["predicted_class"])

    return PredictResponse(
        predicted_class=result["predicted_class"],
        confidence=result["confidence"],
        top_predictions=result["top_predictions"],
        disease=DiseaseDetailResponse(**disease),
    )


@router.post("/ai/explain", response_model=AIExplainResponse)
def explain_disease(payload: AIExplainRequest) -> AIExplainResponse:
    disease = data_service.get_disease(payload.disease_name, language=payload.language)
    if not disease:
        raise HTTPException(status_code=404, detail="Disease not found")

    try:
        answer = ai_service.explain(
            disease_name=payload.disease_name,
            question=payload.question,
            disease_context=disease,
            language=payload.language,
        )
    except AIServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return AIExplainResponse(answer=answer)


@router.get("/ai/status")
def ai_status() -> dict[str, bool]:
    return {"enabled": ai_service.is_enabled()}


@router.post("/translate", response_model=TranslateResponse)
def translate_text(payload: TranslateRequest, x_language: str | None = Header(default=None)) -> TranslateResponse:
    language = x_language or "en"
    if not payload.text:
        return TranslateResponse(translated_text="")

    try:
        translated = ai_service.translate(text=payload.text, language=language)
    except AIServiceError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Translation failed. Ensure GOOGLE_API_KEY is set. Details: {exc}",
        ) from exc

    return TranslateResponse(translated_text=translated)
