import i18n, { LANGUAGE_STORAGE_KEY } from "./i18n";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

export function getSelectedLanguage() {
  return localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? i18n.language ?? "en";
}

export function apiFetch(path, options = {}) {
  const language = getSelectedLanguage();
  const headers = new Headers(options.headers ?? {});
  headers.set("X-Language", language);

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
}

