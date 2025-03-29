/**
 * Environment configuration for the application
 */

// Determine if we're in production or development
const isProd = import.meta.env.PROD;

// Get the current domain for production
export function getDomain() {
  if (typeof window === 'undefined') {
    return '';
  }
  
  const isProduction = window.location.hostname !== 'localhost' && 
                       window.location.hostname !== '127.0.0.1';
  return isProduction ? window.location.origin : 'http://localhost:5000';
}

// Log the environment for debugging
console.log("Environment:", isProd ? "Production" : "Development");

// API URL will be different depending on environment
export const API_URL = `${getDomain()}/api`;

// Log the API URL for debugging
console.log("API URL:", API_URL);

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
    const eventId = pathStr.substring(8); // Remove '/events/'
    return `${API_URL}/events/${eventId}`;
  }
  
  if (pathStr.startsWith('/venues/') && !pathStr.includes('edit')) {
    const venueId = pathStr.substring(8); // Remove '/venues/'
    return `${API_URL}/venues/${venueId}`;
  }
  
  // Otherwise, concatenate the API URL and path
  const finalUrl = `${API_URL}${pathStr.startsWith('/') ? pathStr : `/${pathStr}`}`;
  console.log("API Request URL:", finalUrl);
  return finalUrl;
};