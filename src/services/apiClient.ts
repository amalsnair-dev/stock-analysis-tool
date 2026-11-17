export function normalizeBaseUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  // If local IP is configured as https://, switch to http://
  if (
    url.startsWith('https://192.168.') ||
    url.startsWith('https://10.') ||
    url.startsWith('https://localhost') ||
    url.startsWith('https://127.0.0.1')
  ) {
    url = 'http://' + url.slice(8);
  }
  // Fix spelling if "auriwebapi" is missing the "x"
  url = url.replace(/\/auriwebapi(\/|$)/gi, '/aurixwebapi$1');
  return url.replace(/\/+$/, '');
}

let API_BASE_URL: string | null = null;

export function setApiBaseUrl(baseUrl: string): void {
  API_BASE_URL = normalizeBaseUrl(baseUrl);
}

export function getApiBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not set.");
  }
  return normalizeBaseUrl(API_BASE_URL);
}

export function clearApiBaseUrl(): void {
  API_BASE_URL = null;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000,
): Promise<Response> {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`API request timed out after ${timeoutMs} ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseJsonResponse<T>(text: string, path: string): T {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }

    let inString = false;
    let escaped = false;
    let repairedText = "";
    let repaired = false;

    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];

      if (inString) {
        if (escaped) {
          repairedText += character;
          escaped = false;
          continue;
        }

        if (character === "\\") {
          repairedText += character;
          escaped = true;
          continue;
        }

        if (character === '"') {
          inString = false;
          repairedText += character;
          continue;
        }

        const code = text.charCodeAt(index);
        if (code <= 0x1f) {
          repairedText += `\\u${code.toString(16).padStart(4, "0")}`;
          repaired = true;
          continue;
        }
      } else if (character === '"') {
        inString = true;
      }

      repairedText += character;
    }

    if (repaired) {
      try {
        return JSON.parse(repairedText) as T;
      } catch {
        // Report the response as invalid below; other JSON defects are not recoverable here.
      }
    }

    const reason = error instanceof Error ? error.message : "Invalid JSON";
    throw new Error(`API returned invalid JSON for ${path}: ${reason}`);
  }
}

export async function checkApiConnection(baseUrl: string): Promise<boolean> {
  const healthUrl = `${baseUrl.replace(/\/+$/, "")}/api/v1/health`;

  console.log("Checking branch API:", healthUrl);

  try {
    const response = await fetchWithTimeout(healthUrl, {}, 5000);

    console.log("Branch health status:", response.status);

    return response.ok;
  } catch (error) {
    console.error("Branch health check failed:", error);
    return false;
  }
}

export async function apiGet<T>(
  path: string,
  headers: Record<string, string> = {},
  timeoutMs = 8000,
): Promise<T> {
  const response = await fetchWithTimeout(
    `${getApiBaseUrl()}${path}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    },
    timeoutMs,
  );
  const text = await response.text();

  if (!response.ok) {
    const details = text.trim().slice(0, 500);
    throw new Error(
      `API request failed: ${response.status}${details ? ` - ${details}` : ""}`,
    );
  }

  if (!text) {
    return undefined as T;
  }

  return parseJsonResponse<T>(text, path);
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
  timeoutMs = 30000,
): Promise<T> {
  const response = await fetchWithTimeout(
    `${getApiBaseUrl()}${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );

  const text = await response.text();

  if (!response.ok) {
    const details = text.trim().slice(0, 500);
    throw new Error(
      `API request failed: ${response.status}${details ? ` - ${details}` : ""}`,
    );
  }

  if (!text) {
    return undefined as T;
  }

  return parseJsonResponse<T>(text, path);
}

export async function apiPut<T>(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
  timeoutMs = 30000,
): Promise<T> {
  const response = await fetchWithTimeout(
    `${getApiBaseUrl()}${path}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );

  const text = await response.text();

  if (!response.ok) {
    const details = text.trim().slice(0, 500);
    throw new Error(
      `API request failed: ${response.status}${details ? ` - ${details}` : ""}`,
    );
  }

  if (!text) {
    return undefined as T;
  }

  return parseJsonResponse<T>(text, path);
}

export async function apiDelete(path: string): Promise<void> {
  const response = await fetchWithTimeout(
    `${getApiBaseUrl()}${path}`,
    { method: 'DELETE' },
    8000,
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API request failed: ${response.status}`);
  }
}