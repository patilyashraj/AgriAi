import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n, { LANGUAGE_STORAGE_KEY } from "./i18n";
import { apiFetch } from "./api";
import heroLeaf from "./assets/hero-leaf.jpg";

function prettifyClassName(className) {
  return (className || "")
    .replace(/___/g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function App() {
  const { t } = useTranslation();
  const [language, setLanguage] = useState(i18n.language ?? "en");
  const [health, setHealth] = useState({ status: "checking", model_loaded: false, ai_enabled: false });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [prediction, setPrediction] = useState(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [error, setError] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const aiTextareaRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const predictedClass = prediction?.predicted_class ?? "";
  const diseaseInfo = prediction?.disease ?? null;
  const displayDiseaseName = diseaseInfo?.display_name || (predictedClass ? prettifyClassName(predictedClass) : "");
  const confidenceValue = prediction ? prediction.confidence * 100 : 0;
  const confidencePercent = confidenceValue.toFixed(2);
  const confidenceTone = confidenceValue >= 75 ? "high" : confidenceValue >= 45 ? "medium" : "low";

  function buildAiFallback() {
    if (!diseaseInfo) {
      return t("ai_unavailable_try_again");
    }

    const lines = [
      `${t("about_disease")}: ${diseaseInfo.display_name}`,
      `${t("prevention")}: ${diseaseInfo.preventive_measures}`,
      `${t("treatment")}: ${diseaseInfo.treatment}`,
    ];

    if (diseaseInfo.pesticide) {
      lines.push(`${t("pesticide")}: ${diseaseInfo.pesticide}`);
    }

    return lines.join("\n");
  }

  useEffect(() => {
    apiFetch("/health")
      .then((response) => response.json())
      .then((data) => setHealth(data))
      .catch(() => {
        setHealth({ status: "offline", model_loaded: false, ai_enabled: false });
      });
  }, []);

  function handleLanguageChange(event) {
    const nextLanguage = event.target.value;
    setLanguage(nextLanguage);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    i18n.changeLanguage(nextLanguage);
  }

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    setChatHistory([]);
    setAiQuestion("");

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  useEffect(() => {
    if (aiTextareaRef.current && !aiQuestion) {
      aiTextareaRef.current.style.height = "";
    }
  }, [aiQuestion]);

  useEffect(() => {
    if (!cameraOpen) {
      return undefined;
    }

    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(t("camera_not_supported"));
        setCameraOpen(false);
        return;
      }

      try {
        const stream = await getBackCameraStream();

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (cameraRequestError) {
        setCameraError(t("camera_permission_error"));
        setCameraOpen(false);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [cameraOpen, t]);

  function stopCamera() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function getBackCameraStream() {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: "environment" } },
        audio: false,
      });
    } catch (exactCameraError) {
      return navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
    }
  }

  function handleFileChange(event) {
    setSelectedFile(event.target.files?.[0] ?? null);
    setCameraError("");
  }

  function openCamera() {
    setCameraError("");
    setCameraOpen(true);
  }

  function closeCamera() {
    setCameraOpen(false);
    stopCamera();
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setCameraError(t("camera_capture_error"));
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError(t("camera_capture_error"));
          return;
        }

        const file = new File([blob], `plant-photo-${Date.now()}.jpg`, { type: "image/jpeg" });
        setSelectedFile(file);
        setCameraError("");
        closeCamera();
      },
      "image/jpeg",
      0.92
    );
  }

  async function handlePredict(event) {
    event.preventDefault();

    if (!selectedFile) {
      setError(t("choose_image_error"));
      return;
    }

    setLoadingPrediction(true);
    setError("");
    setPrediction(null);
    setChatHistory([]);
    setAiQuestion("");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await apiFetch("/predict", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail ?? t("prediction_failed"));
      }

      setPrediction(data);
    } catch (requestError) {
      setError(t("prediction_failed"));
    } finally {
      setLoadingPrediction(false);
    }
  }

  async function handleAskAi(event) {
    event.preventDefault();

    if (!prediction || !aiQuestion.trim()) {
      return;
    }

    setLoadingAi(true);
    setError("");
    const question = aiQuestion.trim();

    try {
      const response = await apiFetch("/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disease_name: prediction.predicted_class,
          question,
          language,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail ?? t("ai_request_failed"));
      }

      setChatHistory((messages) => [...messages, { question, answer: data.answer }]);
      setAiQuestion("");
    } catch (requestError) {
      setChatHistory((messages) => [...messages, { question, answer: buildAiFallback() }]);
      setAiQuestion("");
    } finally {
      setLoadingAi(false);
    }
  }

  function handleAskAiKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function resizeAiTextarea(element) {
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 180)}px`;
  }

  return (
    <div className="page-shell">
      <header className="hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(238, 249, 237, 0.96) 0%, rgba(238, 249, 237, 0.88) 46%, rgba(238, 249, 237, 0.5) 100%), url(${heroLeaf})` }}>
        <div className="hero-top">
          <div className="brand-status" aria-label={t("system_status")}>
            <div className="brand-mark" aria-hidden="true">Ag</div>
            <div>
              <p className="brand-name">AgriAI</p>
              <div className="status-dots">
                <span className={`status-dot ${health.status === "ok" ? "ok" : "bad"}`}>
                  {t("api")}
                </span>
                <span className={`status-dot ${health.model_loaded ? "ok" : "bad"}`}>
                  {t("model")}
                </span>
                <span className={`status-dot ${health.ai_enabled ? "ok" : "bad"}`}>
                  AI
                </span>
              </div>
            </div>
          </div>

          <div className="language-tabs" aria-label={t("language")}>
            <span aria-hidden="true">◎</span>
            <button
              type="button"
              className={language === "en" ? "active" : ""}
              onClick={() => handleLanguageChange({ target: { value: "en" } })}
            >
              EN
            </button>
            <button
              type="button"
              className={language === "hi" ? "active" : ""}
              onClick={() => handleLanguageChange({ target: { value: "hi" } })}
            >
              हिं
            </button>
            <button
              type="button"
              className={language === "mr" ? "active" : ""}
              onClick={() => handleLanguageChange({ target: { value: "mr" } })}
            >
              मरा
            </button>
          </div>
        </div>

        <div className="hero-copy">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p className="hero-text">{t("hero_text")}</p>
          <div className="outcome-strip" aria-label={t("outcomes")}>
            <span>{t("outcome_prediction")}</span>
            <span>{t("outcome_guidance")}</span>
            <span>{t("outcome_ai")}</span>
          </div>
        </div>

      </header>

      <main className="content-grid">
        <section className="panel upload-panel">
          <h2>{t("upload")}</h2>
          <form onSubmit={handlePredict} className="stack">
            <div className="upload-box">
              <span className="upload-title">{t("select_image")}</span>
              <div className="upload-actions">
                <label className="file-button">
                  {t("choose_file")}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleFileChange}
                    hidden
                  />
                </label>
                <button type="button" className="camera-trigger-button" onClick={openCamera}>
                  {t("take_photo")}
                </button>
              </div>
              {selectedFile ? <span className="file-name">{selectedFile.name}</span> : null}
            </div>

            {cameraOpen ? (
              <div className="camera-panel" aria-label={t("camera_preview")}>
                <video ref={videoRef} className="camera-preview" playsInline muted autoPlay />
                <canvas ref={canvasRef} hidden />
                <div className="camera-actions">
                  <button type="button" onClick={capturePhoto}>
                    {t("capture_photo")}
                  </button>
                  <button type="button" className="camera-cancel-button" onClick={closeCamera}>
                    {t("cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <canvas ref={canvasRef} hidden />
            )}

            <button type="submit" className="predict-button" disabled={loadingPrediction}>
              {loadingPrediction ? t("analyzing") : t("predict")}
            </button>
          </form>

          {previewUrl ? <img src={previewUrl} alt={t("selected_plant_alt")} className="preview-image" /> : null}

          {cameraError ? <p className="error-text">{cameraError}</p> : null}
          {error ? <p className="error-text">{error}</p> : null}
        </section>

        <section className="panel result-panel">
          <h2>{t("result")}</h2>
          {prediction ? (
            <div className="stack">
              <div className="result-card">
                <p className="result-label">{t("primary_prediction")}</p>
                <h3>{displayDiseaseName}</h3>
                <div className={`progress-bar ${confidenceTone}`} aria-label={`${t("confidence")}: ${confidencePercent}%`}>
                  <div style={{ width: `${prediction.confidence * 100}%` }} />
                </div>
                <p>
                  {t("confidence")}: <strong>{confidencePercent}%</strong>
                </p>
              </div>

              <div className="guidance-block">
                <p className="section-label">{t("disease_guidance")}</p>
                {diseaseInfo ? (
                  <>
                    <div className="guidance-grid">
                      <article className="info-card">
                        <h3>{t("symptoms")}</h3>
                        <p>{diseaseInfo.symptoms}</p>
                      </article>
                      <article className="info-card">
                        <h3>{t("causes")}</h3>
                        <p>{diseaseInfo.causes}</p>
                      </article>
                      <article className="info-card">
                        <h3>{t("prevention")}</h3>
                        <p>{diseaseInfo.preventive_measures}</p>
                      </article>
                      <article className="info-card">
                        <h3>{t("treatment")}</h3>
                        <p>{diseaseInfo.treatment}</p>
                      </article>
                    </div>
                    <article className="info-card full">
                      <h3>{t("pesticide")}</h3>
                      <p>{diseaseInfo.pesticide}</p>
                    </article>
                    <article className="urgent-box">
                      <h3>{t("what_to_do")}</h3>
                      <ul>
                        <li>{t("remove_infected_leaves")}</li>
                        <li>{t("spray_pesticide")}</li>
                        <li>{t("avoid_watering")}</li>
                      </ul>
                    </article>
                  </>
                ) : (
                  <article className="detail-card">
                    <p>{t("disease_data_not_available")}</p>
                  </article>
                )}
              </div>
            </div>
          ) : (
            <p className="muted-text">{t("run_prediction_hint")}</p>
          )}
        </section>

        <section className="panel panel-wide ask-panel">
          <h2>{t("ask_ai")}</h2>
          <p className="muted-text">{t("ask_ai_help")}</p>

          {chatHistory.length > 0 ? (
            <div className="chat-thread" aria-label={t("chat_history")}>
              {chatHistory.map((message, index) => (
                <article className="chat-exchange" key={`${message.question}-${index}`}>
                  <div className="chat-bubble user">
                    <p className="section-label">{t("you")}</p>
                    <p>{message.question}</p>
                  </div>
                  <div className="chat-bubble assistant">
                    <p className="section-label">{t("ai_answer")}</p>
                    <p className="pre-wrap">{message.answer}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          <form onSubmit={handleAskAi} className="stack">
            <textarea
              ref={aiTextareaRef}
              rows="1"
              placeholder={t("ask_ai_placeholder")}
              value={aiQuestion}
              onChange={(event) => {
                setAiQuestion(event.target.value);
                resizeAiTextarea(event.target);
              }}
              onKeyDown={handleAskAiKeyDown}
              disabled={!prediction}
            />
            <button type="submit" disabled={!prediction || loadingAi}>
              {loadingAi ? t("thinking") : t("ask_ai")}
            </button>
            {loadingAi ? <p className="muted-text">{t("thinking")}</p> : null}
          </form>
        </section>
      </main>
    </div>
  );
}

export default App;
