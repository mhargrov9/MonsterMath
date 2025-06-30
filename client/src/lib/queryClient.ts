import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

interface ApiRequestOptions {
  method?: string;
  data?: unknown;
  headers?: Record<string, string>;
}

export const apiRequest = async (
  url: string, // e.g., '/api/auth/user'
  options: ApiRequestOptions = {},
): Promise<Response> => {
  const { method = 'GET', data, headers: customHeaders } = options;

  // Use the environment variable for the base URL.
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // Ensure all API calls are correctly prefixed with /api/v1
  let path = url;
  if (url.startsWith('/api/') && !url.startsWith('/api/v1/')) {
    path = url.replace('/api/', '/api/v1/');
  }

  // Construct the full, absolute URL. This now bypasses the Vite proxy entirely.
  const apiUrl = `${API_BASE_URL}${path}`;

  const headers = new Headers({
    'Content-Type': 'application/json',
    ...customHeaders,
  });

  const config: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(apiUrl, config);

  if (response.status >= 500) {
    const errorBody = await response.text();
    console.error('API Request Failed:', errorBody);
    throw new Error(`Request to ${apiUrl} failed with status ${response.status}`);
  }

  return response;
};