# Plant Disease Platform

This project has been upgraded from a Streamlit prototype into a backend + frontend foundation:

- `backend/`: FastAPI API for model inference, disease metadata, health checks, and optional Gemini-powered explanations
- `frontend/`: React + Vite UI for image upload, prediction results, confidence scores, and AI follow-up questions
- Root data/model assets: the existing `.h5` model, `class_indices.json`, and `plant_disease_info.json`

## Current Stack

- Backend: FastAPI, Uvicorn, TensorFlow, NumPy, Pillow, python-dotenv
- Frontend: React, Vite
- AI integration: Google Gemini via `google-generativeai`
- Model artifact: `plant_disease_prediction_model_jyp.h5`

## Project Structure

```text
plantproject/
├─ backend/
│  ├─ app/
│  │  ├─ api/
│  │  ├─ core/
│  │  ├─ schemas/
│  │  └─ services/
│  └─ requirements.txt
├─ frontend/
│  ├─ src/
│  ├─ .env.example
│  └─ package.json
├─ class_indices.json
├─ plant_disease_info.json
└─ plant_disease_prediction_model_jyp.h5
```

## Backend Setup

Create and activate a virtual environment, then install dependencies:

```powershell
cd C:\development\plantproject\backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create a root `.env` file from `.env.example` if you want AI support:

```env
GOOGLE_API_KEY=your_key_here
GEMINI_MODEL_NAME=gemini-2.5-flash
ALLOWED_ORIGINS=http://localhost:5173
```

Run the API:

```powershell
cd C:\development\plantproject\backend
uvicorn app.main:app --reload
```

API base URL: `http://localhost:8000/api`

## Frontend Setup

Install and run the frontend:

```powershell
cd C:\development\plantproject\frontend
npm install
npm run dev
```

If needed, create `frontend/.env` from `frontend/.env.example`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Frontend URL: `http://localhost:5173`

## API Endpoints

- `GET /api/health`
- `GET /api/diseases`
- `GET /api/diseases/{disease_name}`
- `POST /api/predict`
- `POST /api/ai/explain`
- `GET /api/ai/status`

## Suggested Next Upgrades

- Replace the current CNN with transfer learning such as EfficientNet or MobileNet
- Add a training pipeline under `backend/app/training/` or a separate `ml/` module
- Add tests for preprocessing, prediction responses, and API contracts
- Move the model into a dedicated storage or `models/` directory with versioning
- Add authentication, prediction history, and farmer feedback collection
- Add multilingual UI and field-ready disease advice flows
