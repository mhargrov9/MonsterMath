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
  options: ApiRequestOptions = {}
): Promise<Response> => {
  const { method = 'GET', data, headers: customHeaders } = options;

  // Auto-upgrade legacy endpoints to v1
  let apiUrl = url;
  if (url.startsWith('/api/') && !url.startsWith('/api/v1/')) {
    // Map legacy endpoints to new ones
    const legacyMappings: Record<string, string> = {
      '/api/auth/user': '/api/v1/auth/user',
      '/api/monster-lab-data': '/api/v1/monster-lab-data',
      '/api/user/battle-slots': '/api/v1/user/battle-slots',
    };

    apiUrl = legacyMappings[url] || url;
  }

  const headers = new Headers({
    'Content-Type': 'application/json',
    ...customHeaders,
  });

  const config: RequestInit = {
    method,
    headers,
    credentials: 'include', // Important for session cookies
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(apiUrl, config);

  // Don't throw on 4xx errors, let the caller handle them
  if (response.status >= 500) {
    const errorBody = await response.text();
    console.error('API Request Failed:', errorBody);
    throw new Error(`Request to ${apiUrl} failed with status ${response.status}`);
  }

  return response;
};