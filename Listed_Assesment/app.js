const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const { google } = require('googleapis');
dotenv.config();

// Setting up OAuth2 client
const oAuth2Client = new OAuth2Client(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);
oAuth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN
});

// Setting up Gmail API client
const gmail = google.gmail({
  version: 'v1',
  auth: oAuth2Client
});

// Setting up nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.GMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
    accessToken: oAuth2Client.getAccessToken(),
  }
});

// It will Check for new emails and respond
async function respondToEmails() {
  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread -from:me'
    });
    const messages = response.data.messages || [];

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full'
      });

      // It will Check if any emails in the thread have been sent by the user
      const thread = fullMessage.data.threadId;
      const threadMessages = fullMessage.data.payload.headers;
      let hasReplied = false;
      for (let j = 0; j < threadMessages.length; j++) {
        const header = threadMessages[j];
        if (header.name === 'From' && header.value.includes(process.env.GMAIL_USER)) {
          hasReplied = true;
          break;
        }
      }

      if (!hasReplied) {
        // Send reply email
        const mailOptions = {
          from: process.env.GMAIL_USER,
          to: fullMessage.data.payload.headers.find(header => header.name === 'From').value,
          subject: 'Auto-reply: Out of office',
          text: 'Thank you for your email. I am currently out of the office for Vacation and will respond when I return.',
          threadId: thread
        };