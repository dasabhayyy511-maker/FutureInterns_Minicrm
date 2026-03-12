# Mini CRM - Client Lead Management System

A simple Client Lead Management System built for Future Interns Task 2. This project helps businesses capture website leads, manage their status, add follow-up notes, and review everything from a secure admin dashboard.

## Features

- Public lead capture form
- Secure admin login with session-based access
- Lead listing with name, email, company, source, and message
- Lead status updates: `new`, `contacted`, `converted`
- Follow-up notes for every lead
- Lead search/filter by name, email, company, or source
- Dashboard summary cards for total leads and conversions
- File-backed JSON data storage for easy local setup

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Auth: express-session, bcryptjs
- Data Storage: JSON files inside `/data`

## Project Structure

```text
mini-crm/
|-- data/
|   |-- leads.json
|   |-- users.json
|-- public/
|   |-- index.html
|   |-- styles.css
|   |-- app.js
|-- server.js
|-- package.json
|-- README.md
```

## How It Works

### 1. Lead Capture
A business lead fills the public form on the page. The frontend sends that data to the backend using `POST /api/leads`.

### 2. Backend Processing
The Express server validates the request, creates a lead object, and stores it in `data/leads.json`.

### 3. Admin Login
Only an admin can manage leads. The admin logs in using `POST /api/auth/login`. Once authenticated, a session is stored on the server.

### 4. Dashboard Management
After login, the dashboard loads all leads using `GET /api/leads`. The admin can:
- update the lead status
- add follow-up notes
- search through existing leads

### 5. Data Storage
This project uses JSON files as a beginner-friendly local database so the full CRM can run without installing MongoDB or MySQL. It still teaches the same frontend -> backend -> storage -> dashboard workflow.

## Default Admin Login

- Username: `admin`
- Password: `admin123`

## Installation

1. Open the project folder.
2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
```

4. Open the app in your browser:

```text
http://localhost:3000
```

## Core API Routes

- `POST /api/auth/login` -> admin login
- `POST /api/auth/logout` -> admin logout
- `GET /api/auth/session` -> check login session
- `GET /api/leads` -> fetch all leads and summary data
- `POST /api/leads` -> create a new lead from the public form
- `PATCH /api/leads/:id/status` -> update lead status
- `POST /api/leads/:id/notes` -> add a follow-up note

## Why This Project Matters

This project demonstrates:
- CRUD operations
- backend API design
- session-based authentication
- storing business data
- frontend and backend integration
- how real businesses manage sales leads

## Next Improvements

- Move storage from JSON files to MongoDB
- Add separate admin and public pages
- Add timestamps for last follow-up action
- Add analytics charts for conversions
- Add pagination for large numbers of leads
