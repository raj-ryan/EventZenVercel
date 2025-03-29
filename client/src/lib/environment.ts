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
  
  return window.location.origin;
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
  
  // Log the incoming path for debugging
  console.log(`Converting path: ${pathStr}`);
  
  // If the path already starts with the API URL, return it as is
  if (pathStr.startsWith(API_URL)) {
    console.log(`Path already has API_URL: ${pathStr}`);
    return pathStr;
  }
  
  // Add explicit handling for direct API endpoints
  if (pathStr === '/api/events') {
    const url = `${getDomain()}/api/events`;
    console.log(`Direct events endpoint: ${url}`);
    return url;
  }
  
  if (pathStr === '/api/venues') {
    const url = `${getDomain()}/api/venues`;
    console.log(`Direct venues endpoint: ${url}`);
    return url;
  }
  
  // If path already starts with /api, replace it with the appropriate API URL
  if (pathStr.startsWith('/api')) {
    const url = pathStr.replace('/api', API_URL);
    console.log(`Converted API path: ${pathStr} -> ${url}`);
    return url;
  }
  
  // Handle client-side routes for events and venues to point to API
  if (pathStr.startsWith('/events/') && !pathStr.includes('edit')) {
    const eventId = pathStr.substring(8); // Remove '/events/'
    const url = `${API_URL}/events/${eventId}`;
    console.log(`Converted events path: ${pathStr} -> ${url}`);
    return url;
  }
  
  if (pathStr.startsWith('/venues/') && !pathStr.includes('edit')) {
    const venueId = pathStr.substring(8); // Remove '/venues/'
    const url = `${API_URL}/venues/${venueId}`;
    console.log(`Converted venues path: ${pathStr} -> ${url}`);
    return url;
  }
  
  // Otherwise, concatenate the API URL and path
  const finalUrl = `${API_URL}${pathStr.startsWith('/') ? pathStr : `/${pathStr}`}`;
  console.log(`Final API URL: ${pathStr} -> ${finalUrl}`);
  return finalUrl;
};