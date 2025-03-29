import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { setupWebSockets } from "./websocket";
import { z } from "zod";
import Stripe from "stripe";
import { admin } from "./auth/firebase-admin";
import { insertUserSchema } from "@shared/schema";
import { eq } from "drizzle-orm";

const stripeKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = new Stripe(stripeKey, {
  apiVersion: "2023-10-16" as any,
});

// Default demo user ID for non-authenticated requests
let DEFAULT_DEMO_USER_ID = 0;

// Function to ensure we have a default user for demo purposes
async function ensureDefaultDemoUser() {
  try {
    // Check if default user exists
    const existingUser = await storage.getUserByEmail("demo@eventzen.com");
    
    if (existingUser) {
      // If user exists, use their ID
      DEFAULT_DEMO_USER_ID = existingUser.id;
      console.log(`Using existing demo user with ID: ${DEFAULT_DEMO_USER_ID}`);
      return existingUser;
    }
    
    // Create a new default user if none exists
    const demoUser = await storage.createUser({
      username: "demo_user",
      email: "demo@eventzen.com",
      password: "password_hash", // Doesn't matter since we're not using passwords
      role: "admin", // Make it admin so it can do everything
      firstName: "Demo",
      lastName: "User",
      uid: "demo_uid_" + Date.now(),
    });
    
    DEFAULT_DEMO_USER_ID = demoUser.id;
    console.log(`Created new demo user with ID: ${DEFAULT_DEMO_USER_ID}`);
    return demoUser;
  } catch (error) {
    console.error("Error ensuring default user:", error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Express> {
  // Simple ping endpoint for deployment testing
  app.get("/api/ping", async (req, res) => {
    try {
      // Test database connection
      const testQuery = await storage.getUsers(1);
      
      res.json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        version: "1.0",
        database: "connected",
        testQuery: testQuery ? "success" : "no results"
      });
    } catch (error) {
      console.error("Database test failed:", error);
      res.status(500).json({
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        database: "disconnected"
      });
    }
  });
  
  // Forward client routes to API routes (for direct URL access)
  app.get("/events/:id", (req, res, next) => {
    const id = req.params.id;
    // Check if the request is from the API call or a direct browser access
    const acceptHeader = req.headers.accept || '';
    
    // If the request is from API call (expects JSON), redirect to API route
    if (acceptHeader.includes('application/json')) {
      console.log(`Redirecting API request from /events/${id} to /api/events/${id}`);
      res.redirect(`/api/events/${id}`);
    } else {
      // If it's a browser request for the page, pass control to the next handler
      // which will serve the client app
      next();
    }
  });
  
  app.get("/venues/:id", (req, res, next) => {
    const id = req.params.id;
    // Check if the request is from the API call or a direct browser access
    const acceptHeader = req.headers.accept || '';
    
    // If the request is from API call (expects JSON), redirect to API route
    if (acceptHeader.includes('application/json')) {
      console.log(`Redirecting API request from /venues/${id} to /api/venues/${id}`);
      res.redirect(`/api/venues/${id}`);
    } else {
      // If it's a browser request for the page, pass control to the next handler
      // which will serve the client app
      next();
    }
  });
  
  // Database setup endpoint for Netlify deployment
  app.get("/api/setup-database", async (req, res) => {
    try {
      // Create a default admin user
      const adminUser = await ensureDefaultDemoUser();
      
      // Create some example venues if none exist
      const venues = await storage.getVenues(1);
      let venueResults = [];
      
      if (venues.length === 0) {
        const venueData = [
          {
            name: "Grand Conference Center",
            address: "123 Main Street, Metropolis",
            city: "Metropolis",
            state: "NY",
            zipCode: "10001",
            capacity: 500,
            description: "A modern conference center in the heart of the city with state-of-the-art facilities.",
            amenities: ["Wi-Fi", "Projector", "Sound System", "Catering"],
            image: "https://example.com/venue1.jpg",
            price: 250,
            createdBy: adminUser.id
          }
        ];
        
        for (const venue of venueData) {
          try {
            const result = await storage.createVenue(venue);
            venueResults.push(result);
          } catch (error) {
            console.error("Error creating sample venue:", error);
          }
        }
      }
      
      res.json({
        status: "Database setup complete",
        message: "Database schema has been initialized successfully",
        adminUser,
        venues: venueResults
      });
    } catch (error) {
      console.error("Database setup error:", error);
      res.status(500).json({ 
        status: "error",
        message: "Failed to set up database",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Set up authentication routes
  setupAuth(app);
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Check if we're running in a Netlify Function environment
  const isNetlifyFunction = process.env.NETLIFY || process.env.CONTEXT === 'production' || process.env.CONTEXT === 'deploy-preview';
  
  // Set up WebSockets only if we're not in a Netlify Function environment
  // because Netlify Functions have a separate WebSocket handler
  const ws = isNetlifyFunction 
    ? {
        // Provide dummy methods that do nothing when running in Netlify
        sendNotification: () => {},
        broadcastEventUpdate: () => {}
      }
    : setupWebSockets(httpServer);
  
  // Create default demo user for non-authenticated requests
  await ensureDefaultDemoUser();
  
  // Firebase Authentication Routes
  app.post("/api/auth/verify-token", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      
      // Verify the Firebase token
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Get or create user in our database
      let user = await storage.getUserByFirebaseUid(decodedToken.uid);
      
      // If user doesn't exist, create a new one
      if (!user) {
        // Get Firebase user details
        const firebaseUser = await admin.auth().getUser(decodedToken.uid);
        
        // Create new user in our database
        const userData = {
          uid: decodedToken.uid,
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || `user_${Date.now()}`,
          email: firebaseUser.email || '',
          password: 'firebase-auth-user', // Firebase users don't need a password in our DB
          firstName: firebaseUser.displayName?.split(' ')[0] || '',
          lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
          photoURL: firebaseUser.photoURL || '',
          role: 'user' // Default role
        };
        
        const validatedUserData = insertUserSchema.parse(userData);
        user = await storage.createUser(validatedUserData);
      }
      
      // Login the user using session-based authentication
      // Type assertion to solve type compatibility issues
      req.login(user as Express.User, (err) => {
        if (err) {
          return res.status(500).json({ message: "Authentication error" });
        }
        res.json(user);
      });
    } catch (error) {
      console.error("Token verification error:", error);
      res.status(401).json({ 
        message: "Invalid token",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.get("/api/users/firebase/:uid", async (req, res) => {
    try {
      const { uid } = req.params;
      const user = await storage.getUserByFirebaseUid(uid);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user" });
    }
  });
  
  // User registration endpoint
  app.post("/api/users", async (req, res) => {
    try {
      const { username, email, password, firstName, lastName } = req.body;

      // Basic validation
      if (!username || !email) {
        return res.status(400).json({
          message: "Username and email are required",
          requiredFields: ["username", "email"]
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          message: "User with this email already exists"
        });
      }

      // Create new user
      const newUser = await storage.createUser({
        username,
        email,
        password: password || 'default_password', // In a real app, you'd hash this
        firstName: firstName || '',
        lastName: lastName || '',
        role: 'user',
        uid: `user_${Date.now()}` // Generate a simple UID
      });

      // Create a notification for the new user
      await storage.createNotification({
        userId: newUser.id,
        message: `Welcome to EventZen, ${newUser.username}!`,
        type: "success",
        read: false,
        entityType: "user",
        entityId: newUser.id
      });

      // Return the created user (excluding sensitive info)
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);

    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({
        message: "Error creating user",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get user by ID endpoint
  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove sensitive information
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);

    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({
        message: "Error fetching user",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get all users endpoint (with pagination)
  app.get("/api/users", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const users = await storage.getUsers(limit, offset);
      res.json(users);

    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({
        message: "Error fetching users",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email) {
        return res.status(400).json({
          message: "Email is required",
          requiredFields: ["email"]
        });
      }

      // Find user by email
      let user = await storage.getUserByEmail(email);

      // If user doesn't exist, create a new one
      if (!user) {
        user = await storage.createUser({
          username: email.split('@')[0],
          email,
          password: password || 'default_password',
          role: 'user',
          uid: `user_${Date.now()}`
        });
      }

      // In a real app, you'd verify the password here
      // For this demo, we'll just log them in

      // Set user in session
      if (req.session) {
        req.session.userId = user.id;
      }

      // Remove sensitive information
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        message: "Login successful",
        user: userWithoutPassword
      });

    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({
        message: "Error during login",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get current user endpoint
  app.get("/api/auth/me", async (req, res) => {
    try {
      // If user is authenticated, use their ID, otherwise use demo user
      const userId = req.session?.userId || DEFAULT_DEMO_USER_ID;
      
      const user = await storage.getUser(userId);
      if (!user) {
        // If no user found, create/get demo user
        const demoUser = await ensureDefaultDemoUser();
        const { password: _, ...demoUserWithoutPassword } = demoUser;
        return res.json(demoUserWithoutPassword);
      }

      // Remove sensitive information
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);

    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({
        message: "Error fetching current user",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Event routes
  app.get("/api/events", async (req, res) => {
    try {
      console.log("Fetching events...");
      const events = await storage.getEvents();
      console.log(`Successfully fetched ${events.length} events`);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ error: "Failed to fetch events", details: error.message });
    }
  });
  
  // Get single event
  app.get("/api/events/:id", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      console.log(`Looking for event with ID: ${eventId}`);
      
      // Set JSON content type header
      res.setHeader('Content-Type', 'application/json');
      
      // Get event with venue
      const event = await storage.getEvent(eventId);
      console.log("Found event:", JSON.stringify(event));
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Get venue details
      const venue = await storage.getVenue(event.venueId);
      console.log("Event has venue:", JSON.stringify(venue));
      
      // Format dates as ISO strings
      const formattedEvent = {
        ...event,
        date: event.date.toISOString(),
        endDate: event.endDate?.toISOString() || null,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        venue: venue || null
      };
      
      return res.json(formattedEvent);
    } catch (error) {
      console.error("Error getting event:", error);
      return res.status(500).json({ 
        message: "Error getting event", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.post("/api/events", async (req, res) => {
    // Temporarily bypassing authentication check for demo purposes
    // if (!req.isAuthenticated()) {
    //   return res.status(401).json({ message: "Not authenticated" });
    // }
    
    try {
      // If user is authenticated, use their ID, otherwise use the default demo user ID
      let userId = req.isAuthenticated() ? req.user?.id : DEFAULT_DEMO_USER_ID;
      console.log(`Creating event with user ID: ${userId} (DEFAULT_DEMO_USER_ID = ${DEFAULT_DEMO_USER_ID})`);
      
      // Verify the user exists
      const user = await storage.getUser(userId);
      if (!user) {
        console.error(`User with ID ${userId} not found. Falling back to demo user.`);
        // Try creating/getting demo user again
        const demoUser = await ensureDefaultDemoUser();
        if (!demoUser) {
          return res.status(400).json({ message: "Could not create or find demo user" });
        }
        
        // Use the demo user ID
        userId = demoUser.id;
        console.log(`Now using demo user with ID: ${userId}`);
      } else {
        console.log(`Found user: ${JSON.stringify(user)}`);
      }
      
      // Log the incoming data for debugging
      console.log("Event data:", JSON.stringify(req.body, null, 2));
      
      // Process date fields to ensure they're in proper format
      let date = req.body.date;
      if (date && typeof date === 'string') {
        date = new Date(date);
      }
      
      let endDate = req.body.endDate;
      if (endDate && typeof endDate === 'string') {
        endDate = new Date(endDate);
      } else if (!endDate) {
        endDate = null;
      }
      
      // Make sure required fields are present
      const eventData = {
        ...req.body,
        date: date,
        endDate: endDate,
        createdBy: userId,
        status: req.body.status || 'upcoming',
        isPublished: req.body.isPublished !== undefined ? req.body.isPublished : true,
        capacity: parseInt(req.body.capacity) || 100,
        price: parseFloat(req.body.price) || 0,
        category: req.body.category || 'other' // Add a default category if missing
      };
      
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ 
        message: "Error creating event",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.put("/api/events/:id", async (req, res) => {
    // Temporarily bypassing authentication check for demo purposes
    // if (!req.isAuthenticated()) {
    //   return res.status(401).json({ message: "Not authenticated" });
    // }
    
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Temporarily bypassing permission check for demo purposes
      // Only the creator or admin can update the event
      // if (event.createdBy !== req.user.id && req.user.role !== "admin") {
      //   return res.status(403).json({ message: "Forbidden" });
      // }
      
      const updatedEvent = await storage.updateEvent(eventId, req.body);
      res.json(updatedEvent);
      
      // Broadcast event update via WebSockets
      ws.broadcastEventUpdate(eventId, updatedEvent);
    } catch (error) {
      res.status(500).json({ message: "Error updating event" });
    }
  });
  
  app.delete("/api/events/:id", async (req, res) => {
    // Temporarily bypassing authentication check for demo purposes
    // if (!req.isAuthenticated()) {
    //   return res.status(401).json({ message: "Not authenticated" });
    // }
    
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Temporarily bypassing permission check for demo purposes
      // Only the creator or admin can delete the event
      // if (event.createdBy !== req.user.id && req.user.role !== "admin") {
      //   return res.status(403).json({ message: "Forbidden" });
      // }
      
      await storage.deleteEvent(eventId);
      res.status(204).end();
      
      // Broadcast event deletion via WebSockets
      ws.broadcastEventUpdate(eventId, { deleted: true });
    } catch (error) {
      res.status(500).json({ message: "Error deleting event" });
    }
  });
  
  // Venue routes
  app.get("/api/venues", async (req, res) => {
    try {
      console.log("Fetching venues...");
      const venues = await storage.getVenues();
      console.log(`Successfully fetched ${venues.length} venues`);
      res.json(venues);
    } catch (error) {
      console.error("Error fetching venues:", error);
      res.status(500).json({ error: "Failed to fetch venues", details: error.message });
    }
  });
  
  // Get single venue
  app.get("/api/venues/:id", async (req, res) => {
    try {
      const venueId = parseInt(req.params.id);
      console.log(`Looking for venue with ID: ${venueId}`);
      
      // Set JSON content type header
      res.setHeader('Content-Type', 'application/json');
      
      // Get venue
      const venue = await storage.getVenue(venueId);
      console.log("Found venue:", JSON.stringify(venue));
      
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }
      
      return res.json(venue);
    } catch (error) {
      console.error("Error getting venue:", error);
      return res.status(500).json({ 
        message: "Error getting venue", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  app.post("/api/venues", async (req, res) => {
    // For development purposes, bypassing auth checks temporarily
    // if (!req.isAuthenticated()) {
    //   return res.status(401).json({ message: "Not authenticated" });
    // }
    
    // Only admins can create venues (bypassing for development)
    // if (req.user.role !== "admin") {
    //   return res.status(403).json({ message: "Forbidden" });
    // }
    
    try {
      const venue = await storage.createVenue(req.body);
      res.status(201).json(venue);
    } catch (error) {
      res.status(500).json({ message: "Error creating venue" });
    }
  });
  
  app.put("/api/venues/:id", async (req, res) => {
    // For development purposes, bypassing auth checks temporarily
    // if (!req.isAuthenticated()) {
    //   return res.status(401).json({ message: "Not authenticated" });
    // }
    
    // Only admins can update venues (bypassing for development)
    // if (req.user.role !== "admin") {
    //   return res.status(403).json({ message: "Forbidden" });
    // }
    
    try {
      const venueId = parseInt(req.params.id);
      const venue = await storage.getVenue(venueId);
      
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }
      
      const updatedVenue = await storage.updateVenue(venueId, req.body);
      res.json(updatedVenue);
    } catch (error) {
      res.status(500).json({ message: "Error updating venue" });
    }
  });
  
  app.delete("/api/venues/:id", async (req, res) => {
    // For development purposes, bypassing auth checks temporarily
    // if (!req.isAuthenticated()) {
    //   return res.status(401).json({ message: "Not authenticated" });
    // }
    
    // Only admins can delete venues (bypassing for development)
    // if (req.user.role !== "admin") {
    //   return res.status(403).json({ message: "Forbidden" });
    // }
    
    try {
      const venueId = parseInt(req.params.id);
      const venue = await storage.getVenue(venueId);
      
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }
      
      // Check if venue has associated events
      const events = await storage.getEventsByVenue(venueId);
      if (events.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete venue with associated events. Remove all events first." 
        });
      }
      
      await storage.deleteVenue(venueId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Error deleting venue" });
    }
  });
  
  // Booking routes
  app.get("/api/bookings", async (req, res) => {
    // Temporarily bypassing authentication check for demo purposes
    // if (!req.isAuthenticated()) {
    //   return res.status(401).json({ message: "Not authenticated" });
    // }
    
    try {
      // If user is authenticated, use their ID, otherwise use a default ID of 1
      const userId = req.isAuthenticated() ? req.user.id : DEFAULT_DEMO_USER_ID;
      const bookings = await storage.getBookingsByUser(userId);
      
      // Enhance bookings with event and venue details
      const enhancedBookings = await Promise.all(bookings.map(async (booking) => {
        let enhancedBooking: any = { ...booking };
        
        // Add event details if it's an event booking
        if (booking.eventId) {
          const event = await storage.getEvent(booking.eventId);
          if (event) {
            enhancedBooking.event = event;
            
            // Add venue details to event if applicable
            if (event.venueId) {
              const venue = await storage.getVenue(event.venueId);
              if (venue) {
                enhancedBooking.event.venue = venue;
              }
            }
          }
        }
        
        // Add venue details if it's a direct venue booking
        if (booking.venueId) {
          const venue = await storage.getVenue(booking.venueId);
          if (venue) {
            enhancedBooking.venue = venue;
          }
        }
        
        return enhancedBooking;
      }));
      
      res.json(enhancedBookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Error fetching bookings" });
    }
  });
  
  app.post("/api/venue-bookings", async (req, res) => {
    try {
      // If user is authenticated, use their ID, otherwise use the default demo user ID 
      let userId = req.isAuthenticated() ? req.user.id : DEFAULT_DEMO_USER_ID;
      console.log(`Creating venue booking with user ID: ${userId} (DEFAULT_DEMO_USER_ID = ${DEFAULT_DEMO_USER_ID})`);
      
      // Verify the user exists
      const user = await storage.getUser(userId);
      if (!user) {
        console.error(`User with ID ${userId} not found. Falling back to demo user.`);
        // Try creating/getting demo user again
        const demoUser = await ensureDefaultDemoUser();
        if (!demoUser) {
          return res.status(400).json({ message: "Could not create or find demo user" });
        }
        
        // Use the demo user ID
        userId = demoUser.id;
        console.log(`Now using demo user with ID: ${userId}`);
      } else {
        console.log(`Found user: ${JSON.stringify(user)}`);
      }
      
      // Log the incoming data for debugging
      console.log("Venue booking request body:", JSON.stringify(req.body, null, 2));
      
      const { venueId, bookingDate, bookingDuration, attendeeCount } = req.body;
      
      // Ensure venueId is a number and exists in the request
      if (!venueId && venueId !== 0) {
        console.error("Venue ID is missing from request");
        return res.status(400).json({ message: "Venue ID is required" });
      }
      
      const parsedVenueId = typeof venueId === 'number' ? venueId : parseInt(String(venueId));
      if (isNaN(parsedVenueId)) {
        console.error(`Invalid venue ID: ${venueId} (type: ${typeof venueId})`);
        return res.status(400).json({ message: "Invalid venue ID" });
      }
      
      console.log(`Looking for venue with ID: ${parsedVenueId}`);
      
      // Fetch venue to calculate total amount
      const venue = await storage.getVenue(parsedVenueId);
      if (!venue) {
        console.error(`Venue with ID ${parsedVenueId} not found`);
        return res.status(404).json({ message: "Venue not found" });
      }
      
      console.log(`Found venue: ${JSON.stringify(venue)}`);
      
      // Calculate total amount (price per hour * duration)
      const calculatedTotalAmount = venue.price * bookingDuration;
      
      // Create booking with venue info
      const booking = await storage.createBooking({
        userId,
        venueId: parsedVenueId,
        eventId: null, // Explicitly set to null for venue bookings
        bookingDate: new Date(bookingDate),
        bookingDuration,
        attendeeCount,
        totalAmount: calculatedTotalAmount,
        ticketCount: 1,
        status: "pending",
        paymentStatus: "pending"
      });
      
      console.log(`Created booking: ${JSON.stringify(booking)}`);
      
      res.status(201).json(booking);
      
      // Create a notification for the user
      const notification = await storage.createNotification({
        userId,
        message: `Your venue booking for ${venue.name} has been created.`,
        type: "info",
        read: false,
        entityType: "venue_booking",
        entityId: booking.id
      });
      
      // Send real-time notification
      ws.sendNotification(userId, notification);
    } catch (error) {
      console.error("Error creating venue booking:", error);
      res.status(500).json({ 
        message: "Error creating venue booking",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.post("/api/bookings", async (req, res) => {
    // Temporarily bypassing authentication check for demo purposes
    // if (!req.isAuthenticated()) {
    //   return res.status(401).json({ message: "Not authenticated" });
    // }
    
    try {
      // If user is authenticated, use their ID, otherwise use the default demo user ID
      let userId = req.isAuthenticated() ? req.user.id : DEFAULT_DEMO_USER_ID;
      console.log(`Creating event booking with user ID: ${userId} (DEFAULT_DEMO_USER_ID = ${DEFAULT_DEMO_USER_ID})`);
      
      // Verify the user exists
      const user = await storage.getUser(userId);
      if (!user) {
        console.error(`User with ID ${userId} not found. Falling back to demo user.`);
        // Try creating/getting demo user again
        const demoUser = await ensureDefaultDemoUser();
        if (!demoUser) {
          return res.status(400).json({ message: "Could not create or find demo user" });
        }
        
        // Use the demo user ID
        userId = demoUser.id;
        console.log(`Now using demo user with ID: ${userId}`);
      } else {
        console.log(`Found user: ${JSON.stringify(user)}`);
      }
      
      // Log the incoming data for debugging
      console.log("Event booking data:", JSON.stringify(req.body, null, 2));
      
      // Process date fields to ensure they're in proper format
      let bookingDate = req.body.bookingDate || new Date();
      if (bookingDate && typeof bookingDate === 'string') {
        bookingDate = new Date(bookingDate);
      }
      
      // Ensure eventId is a number
      const eventId = parseInt(req.body.eventId);
      if (isNaN(eventId)) {
        console.error(`Invalid event ID: ${req.body.eventId}`);
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      console.log(`Looking for event with ID: ${eventId}`);
      
      // List all events for debugging
      const allEvents = await storage.getEvents(100);
      console.log(`Available events: ${JSON.stringify(allEvents.map(e => ({ id: e.id, name: e.name })))}`);
      
      // Fetch event to calculate total amount
      const event = await storage.getEvent(eventId);
      if (!event) {
        console.error(`Event with ID ${eventId} not found`);
        return res.status(404).json({ message: "Event not found" });
      }
      
      console.log(`Found event for booking: ${JSON.stringify(event)}`);
      
      // Calculate total amount
      const ticketCount = parseInt(req.body.ticketCount) || 1;
      const totalAmount = event.price * ticketCount;
      
      // Create booking
      const booking = await storage.createBooking({
        userId,
        eventId,
        venueId: null, // Explicitly set to null for event bookings
        bookingDate,
        ticketCount,
        totalAmount,
        status: req.body.status || "pending",
        paymentStatus: req.body.paymentStatus || "pending"
      });
      
      console.log(`Created booking: ${JSON.stringify(booking)}`);
      res.status(201).json(booking);
      
      // Create a notification for the user
      const notification = await storage.createNotification({
        userId,
        message: `Your booking for ${event.name} has been created.`,
        type: "info",
        read: false,
        entityType: "booking",
        entityId: booking.id
      });
      
      // Send real-time notification
      ws.sendNotification(userId, notification);
    } catch (error) {
      console.error("Error creating event booking:", error);
      res.status(500).json({ 
        message: "Error creating booking",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Payment routes
  app.post("/api/create-payment-intent", async (req, res) => {
    // Temporarily bypassing authentication check for demo purposes
    // if (!req.isAuthenticated()) {
    //   return res.status(401).json({ message: "Not authenticated" });
    // }
    
    try {
      const { bookingId } = req.body;
      
      // Get booking details
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Skip user check for demo purposes
      // if (booking.userId !== req.user.id) {
      //   return res.status(403).json({ message: "Forbidden" });
      // }
      
      // Create a PaymentIntent with the booking amount
      // Use booking's userId if user is not authenticated
      const userId = req.isAuthenticated() ? req.user.id : booking.userId;
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(booking.totalAmount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          bookingId: bookingId.toString(),
          userId: userId.toString()
        }
      });
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      res.status(500).json({
        message: "Error creating payment intent",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.post("/api/process-payment", async (req, res) => {
    // Temporarily bypassing authentication check for demo purposes
    // if (!req.isAuthenticated()) {
    //   return res.status(401).json({ message: "Not authenticated" });
    // }
    
    try {
      const { bookingId, stripePaymentId } = req.body;
      
      // Get booking details
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Skip user check for demo purposes
      // if (booking.userId !== req.user.id) {
      //   return res.status(403).json({ message: "Forbidden" });
      // }
      
      // Use booking's userId if user is not authenticated
      const userId = req.isAuthenticated() ? req.user.id : booking.userId;
      
      // Create payment record
      const payment = await storage.createPayment({
        userId,
        bookingId,
        amount: booking.totalAmount,
        status: "completed",
        stripePaymentId
      });
      
      // Update booking status
      await storage.updateBooking(bookingId, {
        paymentStatus: "completed",
        status: "confirmed"
      });
      
      res.status(201).json(payment);
      
      // Create a notification for the user
      const notification = await storage.createNotification({
        userId,
        message: `Your payment for booking #${bookingId} has been processed successfully.`,
        type: "payment_processed",
        read: false
      });
      
      // Send real-time notification
      ws.sendNotification(userId, notification);
    } catch (error) {
      res.status(500).json({
        message: "Error processing payment",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    // Temporarily bypassing authentication check for demo purposes
    // if (!req.isAuthenticated()) {
    //   return res.status(401).json({ message: "Not authenticated" });
    // }
    
    try {
      // If user is authenticated, use their ID, otherwise use a default ID of 1
      const userId = req.isAuthenticated() ? req.user?.id : DEFAULT_DEMO_USER_ID;
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Error fetching notifications" });
    }
  });
  
  app.put("/api/notifications/:id/read", async (req, res) => {
    // Temporarily bypassing authentication check for demo purposes
    // if (!req.isAuthenticated()) {
    //   return res.status(401).json({ message: "Not authenticated" });
    // }
    
    try {
      const notificationId = parseInt(req.params.id);
      const updatedNotification = await storage.markNotificationAsRead(notificationId);
      
      if (!updatedNotification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json(updatedNotification);
    } catch (error) {
      res.status(500).json({ message: "Error updating notification" });
    }
  });
  
  return app;
}
