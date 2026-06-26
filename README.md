# Site Progress Reporting System — Glory Simon Interiors

A professional, role-based daily status tracking application built for interior design project operations.

## Features

1.  **Sleek, Rich Aesthetics**: Clean typography (Plus Jakarta Sans & Playfair Display), sophisticated color schemes (charcoal, slate, champagne gold accents), glassmorphic elements, dynamic state badges, and a responsive grid layout.
2.  **Flexible Database Connector**: Attempts connection to MySQL database, but automatically cascades to a local SQLite database (`gsi_reports.db`) and seeds tables with sample projects, reports, and accounts if MySQL is offline.
3.  **Role-Based Operations**: Integrates different views/access based on user privileges (Admin, Interior Designer, Project Manager, Site Engineer, Client).
4.  **Interactive Progress Form**: Includes:
    *   Dynamic, interactive task lists (add/remove tasks list constructor).
    *   Snag/issue reporting (automatically marks reports as *Action Required*).
    *   Interactive photo dropzone supporting local image previews and sample photo generation.
5.  **Project Performance Dashboard**: Includes KPI cards tracking total reports, open snags, and completed tasks, status and date filtering controls, and a manual refresh toggle.
6.  **Timeline Navigation**: Detail view links all daily updates for a project together in an interactive sidebar timeline. Clicking a historical item instantly loads its details.

---

## File Structure

```text
site progress report system/
│
├── schema.sql              # MySQL Database Schema & Mock Inserts
├── app.py                  # Python Flask Backend API (endpoints for auth, list, details, create)
├── requirements.txt        # Python backend package dependencies
├── README.md               # Setup and Operations Guide (this file)
│
└── frontend/               # Vite React Frontend App
    ├── index.html          # HTML5 Canvas Wrapper
    ├── package.json        # Frontend NPM Dependencies
    ├── vite.config.js      # Vite Configuration
    └── src/
        ├── main.jsx        # App entry point
        ├── App.jsx         # View router & auth state management
        ├── App.css         # Styling system & custom UI components
        ├── index.css       # Clean stylesheet reset
        ├── Login.jsx       # Auth Card, Role selection, autofill helpers
        ├── Dashboard.jsx   # Operations KPI metrics, filterable lists, refresh controls
        ├── ReportForm.jsx  # Daily logs form, task manager, dropzone previews
        └── DetailView.jsx  # Inspector, photo gallery, historical project timeline
```

---

## Getting Started

### 1. Backend Setup

Prerequisites: Python 3.8+ installed.

1.  Open a terminal inside the project root folder.
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Launch the backend server:
    ```bash
    python app.py
    ```
    *Note: The console will print `Database: MySQL connection failed... Falling back to SQLite...` if MySQL is not currently running. The app will automatically generate `gsi_reports.db` locally and seed it with all credentials.*

#### MySQL Setup (Optional)
If you wish to use a local MySQL server:
1. Ensure your MySQL server is running.
2. Run the `schema.sql` file against your server to create the database:
   ```bash
   mysql -u root -p < schema.sql
   ```
3. Adjust the MySQL connection string in `app.py` line 14 if you have a password:
   `MYSQL_URI = "mysql+pymysql://username:password@localhost/glory_simon_interiors"`

### 2. Frontend Setup

Prerequisites: Node.js (v18+) installed.

1.  Open a terminal in the `frontend` folder.
2.  Install packages:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open the URL shown in the terminal (usually `http://localhost:5173`) in your browser.

---

## Mock Access Accounts

You can log into the system using the following credentials:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@glorysimon.com` | `password123` |
| **Interior Designer** | `designer@glorysimon.com` | `password123` |
| **Project Manager** | `pm@glorysimon.com` | `password123` |
| **Site Engineer** | `engineer@glorysimon.com` | `password123` |
| **Client** | `client@gmail.com` | `password123` |

*Tip: The Login card includes convenient **Quick Access Autofill Buttons** to easily switch between user views during validation.*
