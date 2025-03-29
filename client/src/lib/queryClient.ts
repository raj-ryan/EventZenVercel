import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getApiUrl } from "./environment";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Try to parse as JSON first
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        throw new Error(`${res.status}: ${JSON.stringify(errorData)}`);
      } else {
        // Otherwise get as text
        const text = await res.text();
        throw new Error(`${res.status}: ${text || res.statusText}`);
      }
    } catch (parseError) {
      // If parsing fails, just use status text
      throw new Error(`${res.status}: ${res.statusText}`);
    }
  }
}

export async function apiRequest(
  method: string,
  endpoint: string,
  data?: any,
  customHeaders?: Record<string, string>
) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  console.log('Making API request to:', url);

  try {
    const response = await fetch(url, {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...customHeaders,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    // Log response status and headers
    console.log('API Response Status:', response.status);
    console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));

    // Check content type
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    // Handle non-200 responses
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      try {
        if (isJson) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } else {
          const text = await response.text();
          console.error('Non-JSON error response:', text);
          errorMessage = `Server error: ${text.slice(0, 200)}...`;
        }
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
      }
      
      throw new Error(errorMessage);
    }

    // Handle successful response
    if (isJson) {
      try {
        const jsonData = await response.json();
        console.log('API Response Data:', jsonData);
        return jsonData;
      } catch (error) {
        console.error('Error parsing JSON response:', error);
        throw new Error('Invalid JSON response from server');
      }
    } else {
      const text = await response.text();
      console.error('Unexpected non-JSON response:', text);
      throw new Error('Server returned non-JSON response');
    }
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Convert API URL if needed
    const url = getApiUrl(queryKey);
    
    console.log(`Query function fetching from ${url}`);
    
    try {
      const res = await fetch(url, {
        credentials: "include",
      });

      console.log(`Query response from ${url}: ${res.status}`);
      
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log("Unauthorized access - returning null as configured");
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      console.log(`Data received from ${url}:`, data);
      return data;
    } catch (error) {
      console.error(`Query failed for ${url}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

// Helper function to invalidate queries
export function invalidateQueries(queryKey: string | readonly unknown[]) {
  return queryClient.invalidateQueries({ queryKey: queryKey as readonly unknown[] });
}
