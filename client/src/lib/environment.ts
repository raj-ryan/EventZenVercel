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
export const API_URL = isProd ? `${getDomain()}/api` : `${getDomain()}/api`;

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
  
  // For all other API routes, use the domain directly
  if (pathStr.startsWith('/api/')) {
    const url = `${getDomain()}${pathStr}`;
    console.log(`API path: ${pathStr} -> ${url}`);
    return url;
  }
  
  // Handle client-side routes for events and venues to point to API
  if (pathStr.startsWith('/events/') && !pathStr.includes('edit')) {
    const eventId = pathStr.substring(8); // Remove '/events/'
    const url = `${getDomain()}/api/events/${eventId}`;
    console.log(`Converted events path: ${pathStr} -> ${url}`);
    return url;
  }
  
  if (pathStr.startsWith('/venues/') && !pathStr.includes('edit')) {
    const venueId = pathStr.substring(8); // Remove '/venues/'
    const url = `${getDomain()}/api/venues/${venueId}`;
    console.log(`Converted venues path: ${pathStr} -> ${url}`);
    return url;
  }
  
  // Otherwise, use the domain with api prefix
  const finalUrl = `${getDomain()}/api${pathStr.startsWith('/') ? pathStr : `/${pathStr}`}`;
  console.log(`Final API URL: ${pathStr} -> ${finalUrl}`);
  return finalUrl;
};