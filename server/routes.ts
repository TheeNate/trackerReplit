import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { randomBytes } from "crypto";
import session from "express-session";
import PgStore from "connect-pg-simple";
import { pool } from "./db";
import { db } from "./db";
import { users, entries, supervisors, type User } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sendMagicLink, sendVerificationRequest, sendVerificationConfirmation } from "./email";
import { insertEntrySchema, insertSupervisorSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";

// Extend express-session types
declare module "express-session" {
  interface SessionData {
    userId?: number;
    magicLinkToken?: string;
    magicLinkEmail?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session
  const PgSession = PgStore(session);
  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );

  // Authentication middleware
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Authentication routes
  app.post("/api/auth/request-magic-link", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Find or create user
      let user = await storage.getUserByEmail(email);
      if (!user) {
        // Create new user with just email
        const newUserData = insertUserSchema.parse({ email });
        user = await storage.createUser(newUserData);
      }

      // Generate token
      const token = randomBytes(32).toString("hex");
      
      // Store token in session (in a real app, store in database with expiration)
      req.session.magicLinkToken = token;
      req.session.magicLinkEmail = email;
      
      try {
        // Send magic link email
        await sendMagicLink(email, token);
        res.json({ message: "Magic link sent" });
      } catch (error) {
        console.error("Failed to send magic link email:", error);
        
        // For development: generate direct link for testing
        const baseUrl = process.env.REPLIT_DOMAINS ? 
          `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 
          'http://localhost:5000';
        const loginUrl = `${baseUrl}/login?token=${token}`;
        
        // Return the link directly for development purposes
        res.json({ 
          message: "Email delivery failed, but you can use this direct link:", 
          loginUrl: loginUrl 
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error sending magic link" });
    }
  });

  app.get("/api/auth/verify-magic-link", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Invalid token" });
      }
      
      // Verify the token matches and hasn't expired
      if (
        !req.session.magicLinkToken ||
        req.session.magicLinkToken !== token
      ) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      
      // Get user by email
      const email = req.session.magicLinkEmail;
      if (!email) {
        return res.status(401).json({ message: "Invalid session" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Log the user in
      req.session.userId = user.id;
      delete req.session.magicLinkToken;
      delete req.session.magicLinkEmail;
      
      res.json({ 
        message: "Authentication successful", 
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          employeeNumber: user.employeeNumber
        } 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error verifying magic link" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // User routes
  app.get("/api/user", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        employeeNumber: user.employeeNumber
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching user" });
    }
  });

  app.patch("/api/user", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update name and employeeNumber if provided
      const updateSchema = z.object({
        name: z.string().optional(),
        employeeNumber: z.string().optional(),
      });
      
      const { name, employeeNumber } = updateSchema.parse(req.body);
      
      // Update user in database
      const updatedUser = await db
        .update(users)
        .set({ 
          name: name || user.name, 
          employeeNumber: employeeNumber || user.employeeNumber 
        })
        .where(eq(users.id, user.id))
        .returning();
      
      res.json({
        id: updatedUser[0].id,
        email: updatedUser[0].email,
        name: updatedUser[0].name,
        employeeNumber: updatedUser[0].employeeNumber
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error updating user" });
    }
  });

  // Entry routes
  app.get("/api/entries", requireAuth, async (req, res) => {
    try {
      const entries = await storage.getEntries(req.session.userId!);
      res.json(entries);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching entries" });
    }
  });

  app.post("/api/entries", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Handle single entry or array of entries
      if (Array.isArray(req.body)) {
        const entriesData = req.body.map(entry => ({
          ...entry,
          userId
        }));
        
        const createdEntries = [];
        for (const entryData of entriesData) {
          const parsedData = insertEntrySchema.parse(entryData);
          const newEntry = await storage.createEntry(parsedData);
          createdEntries.push(newEntry);
        }
        
        res.status(201).json(createdEntries);
      } else {
        const entryData = {
          ...req.body,
          userId
        };
        
        const parsedData = insertEntrySchema.parse(entryData);
        const newEntry = await storage.createEntry(parsedData);
        
        res.status(201).json(newEntry);
      }
    } catch (error) {
      console.error(error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid entry data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error creating entry" });
    }
  });

  // Supervisor routes
  app.get("/api/supervisors", requireAuth, async (req, res) => {
    try {
      const supervisors = await storage.getSupervisors(req.session.userId!);
      res.json(supervisors);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching supervisors" });
    }
  });

  app.post("/api/supervisors", requireAuth, async (req, res) => {
    try {
      const supervisorData = {
        ...req.body,
        userId: req.session.userId!
      };
      
      const parsedData = insertSupervisorSchema.parse(supervisorData);
      const newSupervisor = await storage.createSupervisor(parsedData);
      
      res.status(201).json(newSupervisor);
    } catch (error) {
      console.error(error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid supervisor data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error creating supervisor" });
    }
  });

  // Verification process routes
  app.post("/api/verify-request/:entryId", requireAuth, async (req, res) => {
    try {
      const entryId = parseInt(req.params.entryId);
      if (isNaN(entryId)) {
        return res.status(400).json({ message: "Invalid entry ID" });
      }
      
      const entry = await storage.getEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      if (entry.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      if (entry.verified) {
        return res.status(400).json({ message: "Entry already verified" });
      }
      
      // Get supervisor data
      const { supervisorId } = req.body;
      
      let supervisor;
      if (supervisorId) {
        supervisor = await storage.getSupervisor(supervisorId);
        if (!supervisor) {
          return res.status(404).json({ message: "Supervisor not found" });
        }
      } else {
        // Create new supervisor
        const supervisorData = {
          ...req.body,
          userId: req.session.userId!
        };
        
        const parsedData = insertSupervisorSchema.parse(supervisorData);
        supervisor = await storage.createSupervisor(parsedData);
      }
      
      // Get user
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Send verification email
      await sendVerificationRequest(supervisor, user, entry);
      
      res.json({ 
        message: "Verification request sent", 
        supervisor,
        entry
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error sending verification request" });
    }
  });

  // Public verification endpoint (no auth required)
  app.get("/api/verify/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const entry = await storage.getEntryByVerificationToken(token);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found or already verified" });
      }
      
      if (entry.verified) {
        return res.status(400).json({ message: "Entry already verified" });
      }
      
      // Get user for the response
      const user = await storage.getUser(entry.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        entry,
        user: {
          name: user.name,
          employeeNumber: user.employeeNumber
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching verification details" });
    }
  });

  app.post("/api/verify/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { verifierName } = req.body;
      
      if (!verifierName) {
        return res.status(400).json({ message: "Verifier name is required" });
      }
      
      const entry = await storage.getEntryByVerificationToken(token);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found or already verified" });
      }
      
      if (entry.verified) {
        return res.status(400).json({ message: "Entry already verified" });
      }
      
      // Verify the entry
      const verifiedEntry = await storage.verifyEntry(entry.id, verifierName);
      
      // Get user to send confirmation email
      const user = await storage.getUser(entry.userId);
      if (user) {
        await sendVerificationConfirmation(user, verifiedEntry, verifierName);
      }
      
      res.json({ 
        message: "Entry verified successfully",
        entry: verifiedEntry
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error verifying entry" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
