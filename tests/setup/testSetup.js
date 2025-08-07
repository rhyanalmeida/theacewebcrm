const path = require('path');

// Load test environment variables
require('dotenv').config({
  path: path.join(__dirname, '../../.env.test')
});

// Set test timeout for all tests
jest.setTimeout(10000);

// Mock external services by default
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Mocked AI response'
            }
          }]
        })
      }
    }
  }))
}));

jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn()
    },
    calendar: jest.fn()
  }
}));

jest.mock('twilio', () => () => ({
  messages: {
    create: jest.fn().mockResolvedValue({
      sid: 'mocked-message-sid',
      status: 'sent'
    })
  }
}));

jest.mock('nodemailer', () => ({
  createTransporter: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'mocked-message-id',
      response: '250 Message sent'
    })
  })
}));

// Global test utilities
global.testUtils = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  generateRandomEmail: () => {
    const timestamp = Date.now();
    return `test-${timestamp}@example.com`;
  },
  
  generateRandomString: (length = 10) => {
    return Math.random().toString(36).substring(2, length + 2);
  }
};