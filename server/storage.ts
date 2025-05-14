import { 
  users, entries, supervisors, 
  type User, type InsertUser, 
  type Entry, type InsertEntry,
  type Supervisor, type InsertSupervisor 
} from "@shared/schema";

import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Entry methods
  getEntries(userId: number): Promise<Entry[]>;
  getEntry(id: number): Promise<Entry | undefined>;
  getEntryByVerificationToken(token: string): Promise<Entry | undefined>;
  createEntry(entry: InsertEntry): Promise<Entry>;
  verifyEntry(id: number, verifiedBy: string): Promise<Entry>;
  
  // Supervisor methods
  getSupervisors(userId: number): Promise<Supervisor[]>;
  getSupervisor(id: number): Promise<Supervisor | undefined>;
  createSupervisor(supervisor: InsertSupervisor): Promise<Supervisor>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Entry methods
  async getEntries(userId: number): Promise<Entry[]> {
    return await db
      .select()
      .from(entries)
      .where(eq(entries.userId, userId))
      .orderBy(desc(entries.date));
  }

  async getEntry(id: number): Promise<Entry | undefined> {
    const [entry] = await db.select().from(entries).where(eq(entries.id, id));
    return entry;
  }

  async getEntryByVerificationToken(token: string): Promise<Entry | undefined> {
    const [entry] = await db
      .select()
      .from(entries)
      .where(eq(entries.verificationToken, token));
    return entry;
  }

  async createEntry(entry: InsertEntry): Promise<Entry> {
    const verificationToken = uuidv4();
    const [newEntry] = await db
      .insert(entries)
      .values({ ...entry, verificationToken })
      .returning();
    return newEntry;
  }

  async verifyEntry(id: number, verifiedBy: string): Promise<Entry> {
    const [entry] = await db
      .update(entries)
      .set({ 
        verified: true, 
        verifiedBy, 
        verifiedAt: new Date() 
      })
      .where(eq(entries.id, id))
      .returning();
    return entry;
  }

  // Supervisor methods
  async getSupervisors(userId: number): Promise<Supervisor[]> {
    return await db
      .select()
      .from(supervisors)
      .where(eq(supervisors.userId, userId));
  }

  async getSupervisor(id: number): Promise<Supervisor | undefined> {
    const [supervisor] = await db
      .select()
      .from(supervisors)
      .where(eq(supervisors.id, id));
    return supervisor;
  }

  async createSupervisor(supervisor: InsertSupervisor): Promise<Supervisor> {
    const [newSupervisor] = await db
      .insert(supervisors)
      .values(supervisor)
      .returning();
    return newSupervisor;
  }
}

export const storage = new DatabaseStorage();
