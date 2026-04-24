export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL || "https://zeltyo-app.onrender.com")
    .replace(/\/+$/, "");

export function buildApiUrl(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${cleanPath}`;

  console.log("API CALL →", url); // 👈 IMPORTANT

  return url;
}