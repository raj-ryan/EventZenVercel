/**
 * Environment configuration for the application
 */

import { QueryKey } from '@tanstack/react-query';

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
export const getApiUrl = (path: QueryKey | string): string => {
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
  
  // Remove any duplicate /api/ prefixes
  let cleanPath = pathStr.replace(/^\/api\//, '/');
  
  // Also remove /events/ or /venues/ prefixes for detail routes
  const isEventDetail = cleanPath.match(/^\/events\/(\d+)$/);
  const isVenueDetail = cleanPath.match(/^\/venues\/(\d+)$/);
  
  if (isEventDetail) {
    cleanPath = `/api/events/${isEventDetail[1]}`;
    const url = `${getDomain()}${cleanPath}`;
    console.log(`Direct event detail path: ${cleanPath} -> ${url}`);
    return url;
  }
  
  if (isVenueDetail) {
    cleanPath = `/api/venues/${isVenueDetail[1]}`;
    const url = `${getDomain()}${cleanPath}`;
    console.log(`Direct venue detail path: ${cleanPath} -> ${url}`);
    return url;
  }
  
  // For all other paths, ensure single /api/ prefix
  const finalUrl = `${getDomain()}/api${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
  console.log(`Final API URL: ${cleanPath} -> ${finalUrl}`);
  return finalUrl;
};