const protocol = process.env.EXPO_PUBLIC_OWNER_API_PROTOCOL ?? 'http';
const host = process.env.EXPO_PUBLIC_OWNER_API_HOST ?? '192.168.1.7';
const port = process.env.EXPO_PUBLIC_OWNER_API_PORT ?? '8082';
const project = process.env.EXPO_PUBLIC_OWNER_API_PROJECT ?? 'aurixownersapi';

const OWNER_API_BASE_URL = `${protocol}://${host}:${port}/${project}`;

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
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function ownerApiGet<T>(
  path: string,
): Promise<T> {
  const response = await fetchWithTimeout(
    `${OWNER_API_BASE_URL}${path}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Owner API request failed: ${response.status}`,
    );
  }

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text);
}