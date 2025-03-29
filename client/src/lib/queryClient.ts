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
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Convert API URL if needed
  const apiUrl = getApiUrl(url);
  
  console.log(`Making ${method} request to ${apiUrl}`);
  
  try {
    const res = await fetch(apiUrl, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    console.log(`Response status from ${apiUrl}: ${res.status}`);
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API request failed to ${apiUrl}:`, error);
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
      staleTime: Infinity,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});
