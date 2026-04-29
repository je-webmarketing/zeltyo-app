const API_BASE = "https://zeltyo-backend.onrender.com";

export function buildApiUrl(path) {
  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  return API_BASE + path;
}