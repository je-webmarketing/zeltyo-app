const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL || "http://zeltyo-app.onrender.com").replace(/\/+$/, "");

function buildApiUrl(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export { API_BASE_URL, buildApiUrl };