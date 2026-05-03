from io import BytesIO

import numpy as np
import tensorflow as tf
from PIL import Image

from app.core.config import settings
from app.schemas.responses import PredictionScore
from app.services.data_service import DataService


class ModelServiceError(Exception):
    """Raised when inference cannot be completed."""


class ModelService:
    def __init__(self) -> None:
        self._model = None
        self._data_service = DataService()

    def is_available(self) -> bool:
        return settings.model_path.exists()

    def _load_model(self):
        if self._model is None:
            if not settings.model_path.exists():
                raise ModelServiceError(f"Model file not found at {settings.model_path}")
            self._model = tf.keras.models.load_model(settings.model_path, compile=False)
        return self._model

    def _preprocess(self, image_bytes: bytes) -> np.ndarray:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        image = image.resize(settings.image_size)
        image_array = np.array(image).astype("float32")
        return np.expand_dims(image_array, axis=0)

    def predict(self, image_bytes: bytes) -> dict[str, object]:
        model = self._load_model()
        image_array = self._preprocess(image_bytes)

        predictions = model.predict(image_array, verbose=0)[0]
        top_indices = predictions.argsort()[-settings.top_k_predictions :][::-1]

        top_predictions = [
            PredictionScore(
                class_name=self._data_service.class_indices[str(index)],
                confidence=float(predictions[index]),
            )
            for index in top_indices
        ]

        winner = top_predictions[0]
        return {
            "predicted_class": winner.class_name,
            "confidence": winner.confidence,
            "top_predictions": top_predictions,
        }
