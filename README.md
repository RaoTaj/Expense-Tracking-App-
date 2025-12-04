# Expense Tracker

A lightweight personal expense tracker with a modern React/Tailwind frontend, an Express.js backend using SQLite for storage, and optional React Native (Expo) mobile client. Designed for easy local development and simple deployment (Vercel for frontend; any Node host or tunnel for backend).

## Features
- Register / login users
- Add, edit, delete expenses
- Custom categories per user
- Monthly budget tracking
- Bulk import/export of expenses
- Daily-rotating structured logs with RRN for traceability

## Tech Stack
- Frontend: React (CRA) + Tailwind CSS
- Backend: Node.js + Express
- Database: SQLite (file-based, in `server/data.sqlite`)
- Logging: Winston + daily-rotate-file
- Mobile (optional): React Native + Expo

## Quickstart (Local)
1. Clone
   ```bash
   git clone <your-repo-url>
   cd expense-tracker

## Backend
cd server
npm install
npm start
# Backend listens on http://localhost:4000

## Frontend
cd ..
npm install
npm start
# Open http://localhost:3000

