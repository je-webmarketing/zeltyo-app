const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL || "https://zeltyo-app.onrender.com").replace(/\/+$/, "");

function buildApiUrl(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (import.meta.env.DEV) {
    return `/api${cleanPath}`;
  }

  return `${API_BASE_URL}${cleanPath}`;
}

function getAuthToken() {
  try {
    const raw = localStorage.getItem("zeltyo_merchant_auth");
    if (!raw) return "";

    const auth = JSON.parse(raw);
    return auth?.token || "";
  } catch {
    localStorage.removeItem("zeltyo_merchant_auth");
    return "";
  }
}

function authFetch(path, options = {}) {
  const token = getAuthToken();

  return fetch(buildApiUrl(path), {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

export { API_BASE_URL, buildApiUrl, getAuthToken, authFetch };