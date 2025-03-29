/**
 * Environment configuration for the application
 */

// Determine if we're in production or development
const isProd = import.meta.env.PROD;

// Get the current domain for production
const getDomain = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

// API URL will be different depending on environment
export const API_URL = isProd 
  ? `${getDomain()}/api` // Production API URL (absolute path)
  : '/api'; // Development API URL

// Export other environment variables as needed
export const getApiUrl = (path: string | unknown[]): string => {
  // Handle array path or string path in queryKey
  if (Array.isArray(path)) {
    const pathStr = path[0];
    if (typeof pathStr === 'string') {
      return getApiUrl(pathStr);
    }
    return String(path);
  }
  
  // Now we know path is a string
  const pathStr = path as string;
  
  // If the path already starts with the API URL, return it as is
  if (pathStr.startsWith(API_URL)) {
    return pathStr;
  }
  
  // If path already starts with /api, replace it with the appropriate API URL
  if (pathStr.startsWith('/api')) {
    return pathStr.replace('/api', API_URL);
  }
  
  // Handle client-side routes for events and venues to point to API
  if (pathStr.startsWith('/events/') && !pathStr.includes('edit')) {
    return `${API_URL}/events${pathStr.substring(7)}`;
  }
  
  if (pathStr.startsWith('/venues/') && !pathStr.includes('edit')) {
    return `${API_URL}/venues${pathStr.substring(7)}`;
  }
  
  // Otherwise, concatenate the API URL and path
  return `${API_URL}${pathStr.startsWith('/') ? pathStr : `/${pathStr}`}`;
};