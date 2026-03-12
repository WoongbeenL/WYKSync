import { supabase } from "./supabaseClient";

export const backendUrl = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

export const parseBackendError = async (response, fallback) => {
  const text = await response.text();
  if (!text) return fallback;

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.error === "string" && parsed.error.trim()) {
      return parsed.error;
    }
    if (typeof parsed?.message === "string" && parsed.message.trim()) {
      return parsed.message;
    }
    return text;
  } catch {
    return text;
  }
};

export const getAccessToken = async () => {
  if (!supabase) {
    return { token: null, error: "Supabase auth is unavailable." };
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return { token: null, error: error.message || "Could not load auth session." };
  }

  return {
    token: data.session?.access_token || null,
    error: null,
  };
};

export const requestBackend = async (
  path,
  {
    method = "GET",
    body,
    requireAuth = false,
    fallbackError = "Request failed.",
    allowNotFound = false,
  } = {}
) => {
  if (!backendUrl) {
    return { data: null, error: "VITE_BACKEND_URL is missing.", status: 0 };
  }

  const headers = {};
  let token = null;

  if (requireAuth) {
    const tokenResult = await getAccessToken();
    if (tokenResult.error) {
      return { data: null, error: tokenResult.error, status: 0 };
    }

    token = tokenResult.token;
    if (!token) {
      return { data: null, error: "Please log in again.", status: 401 };
    }

    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(`${backendUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (allowNotFound && response.status === 404) {
      return { data: null, error: null, status: 404 };
    }

    if (!response.ok) {
      return {
        data: null,
        error: await parseBackendError(response, fallbackError),
        status: response.status,
      };
    }

    if (response.status === 204) {
      return { data: null, error: null, status: 204 };
    }

    return {
      data: await response.json(),
      error: null,
      status: response.status,
    };
  } catch (error) {
    return {
      data: null,
      error: error.message || fallbackError,
      status: 0,
    };
  }
};

export const requestBackendWithFallback = async (
  paths,
  options
) => {
  let lastError = "Request failed.";
  let sawNotFound = false;

  for (const path of paths) {
    const result = await requestBackend(path, options);
    if (!result.error) {
      return result;
    }

    if (result.status === 404) {
      sawNotFound = true;
      lastError = result.error || lastError;
      continue;
    }

    return result;
  }

  return {
    data: null,
    error: sawNotFound ? null : lastError,
    status: sawNotFound ? 404 : 0,
  };
};
