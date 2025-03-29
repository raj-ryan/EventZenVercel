// This file helps Vercel identify the project structure
// It's not used directly but helps with deployment
export default function handler(req, res) {
  // Redirect to the homepage
  res.statusCode = 302;
  res.setHeader('Location', '/');
  res.end();
} 