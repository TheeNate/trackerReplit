import nodemailer from 'nodemailer';
import { Entry, User, Supervisor } from '@shared/schema';

// Configure email transport
const createTransport = () => {
  // In production, use an actual email service
  // For development, use ethereal.email
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  
  // Create testing account for development
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: 'ethereal.user@ethereal.email',
      pass: 'ethereal.pass',
    },
  });
};

const transport = createTransport();

// Get base URL for links
const getBaseUrl = () => {
  const domain = process.env.REPLIT_DOMAINS ? 
    process.env.REPLIT_DOMAINS.split(',')[0] : 
    'localhost:5000';
  
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return `${protocol}://${domain}`;
};

// Send magic link email
export const sendMagicLink = async (
  email: string, 
  token: string
): Promise<void> => {
  const baseUrl = getBaseUrl();
  const loginUrl = `${baseUrl}/login?token=${token}`;
  
  await transport.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@ojtlogger.app',
    to: email,
    subject: 'Login to OJT Hours Tracker',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Login to OJT Hours Tracker</h2>
        <p>Click the link below to log in to your account:</p>
        <p>
          <a 
            href="${loginUrl}" 
            style="display: inline-block; padding: 10px 20px; background-color: #0062ff; color: white; text-decoration: none; border-radius: 4px;"
          >
            Login to your account
          </a>
        </p>
        <p>Or copy and paste this URL into your browser:</p>
        <p>${loginUrl}</p>
        <p>This link will expire in 15 minutes.</p>
      </div>
    `,
  });
};

// Send verification request email
export const sendVerificationRequest = async (
  supervisor: Supervisor,
  user: User,
  entry: Entry
): Promise<void> => {
  const baseUrl = getBaseUrl();
  const verifyUrl = `${baseUrl}/verify/${entry.verificationToken}`;
  
  // Format the method for display
  let displayMethod = entry.method;
  if (displayMethod === 'UT_THK') {
    displayMethod = 'UT Thk.';
  }
  
  await transport.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@ojtlogger.app',
    to: supervisor.email,
    subject: `Verification Request for OJT Hours from ${user.name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>OJT Hours Verification Request</h2>
        <p>${user.name} (Employee #: ${user.employeeNumber}) has requested your verification for the following OJT hours:</p>
        
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p><strong>Date:</strong> ${new Date(entry.date).toLocaleDateString()}</p>
          <p><strong>Location:</strong> ${entry.location}</p>
          <p><strong>Method:</strong> ${displayMethod}</p>
          <p><strong>Hours:</strong> ${entry.hours}</p>
        </div>
        
        <p>Please click the button below to verify these hours:</p>
        <p>
          <a 
            href="${verifyUrl}" 
            style="display: inline-block; padding: 10px 20px; background-color: #42be65; color: white; text-decoration: none; border-radius: 4px;"
          >
            Verify Hours
          </a>
        </p>
        <p>Or copy and paste this URL into your browser:</p>
        <p>${verifyUrl}</p>
      </div>
    `,
  });
};

// Notify user that their hours were verified
export const sendVerificationConfirmation = async (
  user: User,
  entry: Entry,
  supervisorName: string
): Promise<void> => {
  // Format the method for display
  let displayMethod = entry.method;
  if (displayMethod === 'UT_THK') {
    displayMethod = 'UT Thk.';
  }
  
  await transport.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@ojtlogger.app',
    to: user.email,
    subject: 'OJT Hours Verified',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your OJT Hours Have Been Verified</h2>
        <p>Great news! ${supervisorName} has verified your OJT hours.</p>
        
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p><strong>Date:</strong> ${new Date(entry.date).toLocaleDateString()}</p>
          <p><strong>Location:</strong> ${entry.location}</p>
          <p><strong>Method:</strong> ${displayMethod}</p>
          <p><strong>Hours:</strong> ${entry.hours}</p>
        </div>
        
        <p>These hours have been added to your verified OJT log.</p>
      </div>
    `,
  });
};
