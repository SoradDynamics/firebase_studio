// server.js
require('dotenv').config(); 
const express = require('express');
const cors = require('cors');

// Import API routes
const userRoutes = require('./routes/userRoutes'); 
const calendarRoutes = require('./routes/calendarRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors()); 
app.use(express.json());

// --- API Routes ---
app.use('/api/users', userRoutes); 
app.use('/api/calendar', calendarRoutes)

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error(err.stack || err); // Log error details
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  if (!process.env.APPWRITE_ENDPOINT || !process.env.APPWRITE_PROJECT_ID || !process.env.APPWRITE_API_KEY) {
      console.warn("WARN: Check Appwrite environment variables in .env!");
  }
});