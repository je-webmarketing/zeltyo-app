const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL || "https://zeltyo-app.onrender.com").replace(/\/+$/, "");

function buildApiUrl(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // ✅ En DEV → passer par le proxy Vite
  if (import.meta.env.DEV) {
    return `/api${cleanPath}`;
  }

  // ✅ En PROD → Render direct
  return `${API_BASE_URL}${cleanPath}`;
}

export { API_BASE_URL, buildApiUrl };