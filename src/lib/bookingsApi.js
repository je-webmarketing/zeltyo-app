async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || "Erreur API");
  }

  return data;
}

export function buildApiUrl(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (import.meta.env.DEV) {
    return `/api${cleanPath}`;
  }

  return `https://zeltyo-app.onrender.com${cleanPath}`;
}

export async function getBookingsByBusiness(businessId) {
  return apiFetch(buildApiUrl(`/bookings/by-business/${businessId}`));
}

export async function updateBookingStatus(bookingId, status) {
  return apiFetch(buildApiUrl(`/bookings/${bookingId}/status`), {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}