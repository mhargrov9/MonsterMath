import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient();

interface ApiRequestOptions {
  method?: string;
  data?: unknown;
  headers?: Record<string, string>;
}

export const apiRequest = async (
  url: string,
  options: ApiRequestOptions = {}
): Promise<Response> => {
  const { method = 'GET', data, headers: customHeaders } = options;

  const headers = new Headers({
    'Content-Type': 'application/json',
    ...customHeaders,
  });

  const config: RequestInit = {
    method,
    headers,
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('API Request Failed:', errorBody);
    throw new Error(`Request to ${url} failed with status ${response.status}`);
  }

  return response;
};