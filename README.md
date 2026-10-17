# Student Portal OTP Authentication App

A secure, responsive Two-Factor Authentication (2FA) Student Portal web application powered by Express and the **MiniMoth OTP API** (supporting WhatsApp and SMS delivery).

## Features
- **MiniMoth Live API Integration**: Sends and validates 6-digit OTP codes via WhatsApp & SMS.
- **Glassmorphism UI**: Built with modern CSS design standards, ambient lighting, and fluid micro-animations.
- **Student Profile Previews**: Fast switching between demo student accounts (rolls, course enrollments, GPA).
- **Live Gateway Telemetry**: Real-time console logs and instant code generation preview for swift testing.
- **Academic Dashboard**: Unlocked upon successful OTP verification, displaying GPA, attendance records, course modules, and campus notifications.

## Project Structure
```
├── public/
│   ├── index.html     # Frontend HTML
│   ├── style.css      # CSS styling & animations
│   └── app.js         # Client OTP interaction & dashboard logic
├── server.js          # Express server with MiniMoth API routes
├── package.json
└── .env               # API credentials & configuration
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   ```env
   MINIMOTH_API_KEY=your_minimoth_api_key_here
   PORT=3000
   ```

3. Start the application:
   ```bash
   node server.js
   ```

4. Open your browser at:
   ```
   http://localhost:3000
   ```
