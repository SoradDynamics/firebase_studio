// config/appwrite.js
const { Client, Users, ID, Storage } = require('node-appwrite');

const dotenv = require('dotenv');
dotenv.config();

// --- Appwrite Client Initialization ---
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'DEFAULT_ENDPOINT') // Provide defaults or throw error if missing
    .setProject(process.env.APPWRITE_PROJECT_ID || 'DEFAULT_PROJECT_ID')
    .setKey(process.env.APPWRITE_API_KEY || 'DEFAULT_API_KEY'); // Use API Key for backend admin operations

// Basic check for essential env vars
if (!process.env.APPWRITE_ENDPOINT || !process.env.APPWRITE_PROJECT_ID || !process.env.APPWRITE_API_KEY) {
    console.error('Error: Missing required Appwrite environment variables in .env file.');
    process.exit(1); // Exit if configuration is incomplete
}

// --- Appwrite Service Initialization ---
const users = new Users(client);
const storage = new Storage(client);

// Export Appwrite services and unique ID generator
module.exports = {
    client,
    users,
    ID, // Export ID for use in controllers
    storage
};