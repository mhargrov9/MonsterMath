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
  url: string,
  options: ApiRequestOptions = {},
): Promise<Response> => {
  const { method = 'GET', data, headers: customHeaders } = options;

  const apiUrl = url;

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