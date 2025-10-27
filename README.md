# Day-Care Rotation System

A web application for visualizing and managing day-care rotation schedules with role-based access for parents and staff.

## Features

- **Role-Based Access Control**
  - Parents: Read-only view of schedules and their children's attendance status
  - Staff: Full management capabilities for children, groups, and schedules

- **Daily Rotation Management**
  - Four groups (A, B, C, D) with customizable daily priority order
  - Dynamic capacity control based on staff availability
  - Visual indicators for attending vs. staying home

- **Registration System**
  - Staff generates unique registration codes for children
  - Parents register with codes to link accounts
  - Multiple parents can link to same child

- **Main Features**
  - Date selector for viewing different days
  - Four group lists showing children in daily priority order
  - Parent status indicator for child attendance
  - Staff capacity slider (0-4 groups)
  - Child management dashboard (staff only)

## Technology Stack

- **Frontend**: React 18 with Material UI
- **Backend**: Node.js with Express
- **Database**: MariaDB 10.6 MySQL (hosted on himalia.uberspace.de)
- **Authentication**: JWT tokens
- **Date Handling**: date-fns

## Project Structure

```
.
├── backend/
│   ├── config/
│   │   └── database.js          # Database connection
│   ├── database/
│   │   └── schema.sql            # Database schema
│   ├── middleware/
│   │   └── auth.js               # Authentication middleware
│   ├── routes/
│   │   ├── auth.js               # Login/registration endpoints
│   │   ├── children.js           # Child management endpoints
│   │   └── schedules.js          # Schedule management endpoints
│   ├── .env.example              # Environment variables template
│   ├── package.json
│   └── server.js                 # Express server
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── contexts/
│   │   │   └── AuthContext.js    # Authentication context
│   │   ├── pages/
│   │   │   ├── Login.js          # Login page
│   │   │   ├── Register.js       # Parent registration
│   │   │   ├── MainSchedule.js   # Main entry page
│   │   │   └── StaffDashboard.js # Staff management
│   │   ├── services/
│   │   │   └── api.js            # API service layer
│   │   ├── App.js
│   │   └── index.js
│   ├── .env.example              # Environment variables template
│   └── package.json
│
└── .github/
    └── copilot-instructions.md   # AI coding agent guidelines
```

## Setup Instructions

### Prerequisites

- Node.js 16+ and npm
- MariaDB 10.6 MySQL database access
- Database credentials for himalia.uberspace.de

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from template:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and fill in your database credentials:
   ```
   DB_HOST=himalia.uberspace.de
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=your_database
   JWT_SECRET=your_secret_key
   ```

5. Initialize database:
   ```bash
   # Connect to your MariaDB database and run:
   mysql -h himalia.uberspace.de -u your_username -p your_database < database/schema.sql
   ```

6. Start the server:
   ```bash
   npm run dev  # Development mode with nodemon
   # or
   npm start    # Production mode
   ```

   Server runs on http://localhost:5000

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from template:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` if needed (default points to localhost:5000):
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   ```

5. Start the development server:
   ```bash
   npm start
   ```

   Application opens at http://localhost:3000

## Initial Usage

### Creating Staff Account

Since the first staff account needs to be created directly in the database:

```sql
-- Connect to your database
INSERT INTO users (email, password, first_name, last_name, role) 
VALUES ('staff@daycare.com', '$2b$10$HASHED_PASSWORD', 'Admin', 'User', 'staff');
```

Use a bcrypt hash for the password. You can generate one using:
```javascript
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('your_password', 10);
console.log(hash);
```

### Staff Workflow

1. Login with staff credentials
2. Navigate to Staff Dashboard (settings icon)
3. Add children and assign to groups (A, B, C, D)
4. Copy registration codes to share with parents
5. Use main page to:
   - View daily group order
   - Adjust capacity slider based on staff availability
   - See which groups are attending

### Parent Workflow

1. Go to registration page
2. Enter registration code provided by staff
3. Fill in personal details and create password
4. Login with email and password
5. View main schedule to see:
   - Child's attendance status for selected date
   - All groups and children (read-only)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Parent registration with code
- `POST /api/auth/login` - Login (parents and staff)
- `GET /api/auth/me` - Get current user info

### Children
- `GET /api/children` - Get all children (staff only)
- `GET /api/children/group/:group` - Get children by group
- `GET /api/children/my-children` - Get parent's children
- `POST /api/children` - Create child (staff only)
- `PUT /api/children/:id` - Update child (staff only)
- `DELETE /api/children/:id` - Delete child (staff only)

### Schedules
- `GET /api/schedules/date/:date` - Get schedule for date
- `GET /api/schedules/range` - Get schedules for date range
- `POST /api/schedules/date/:date` - Create/update schedule (staff only)
- `PATCH /api/schedules/date/:date/capacity` - Update capacity (staff only)
- `GET /api/schedules/date/:date/children` - Get children grouped by attendance

## Database Schema

See `backend/database/schema.sql` for complete schema including:
- `users` - Parent and staff accounts
- `children` - Children with group assignments
- `user_child_links` - Many-to-many parent-child relationships
- `daily_schedules` - Daily group order and capacity
- `attendance` - Historical tracking (future use)

## Development

### Running in Development

Backend (with auto-reload):
```bash
cd backend
npm run dev
```

Frontend (with hot reload):
```bash
cd frontend
npm start
```

### Building for Production

Frontend:
```bash
cd frontend
npm run build
```

The build folder contains optimized production files.

## Key Business Rules

- Daily group order must be fetched from database, never calculated
- Parents have read-only access to schedules
- Staff can edit all data and manage capacity
- Capacity cuts groups from end of daily priority order
- Registration codes can be reused for multiple parents per child
- All users can see children names in groups

## License

ISC
