# SmartCalc

SmartCalc is a full-stack scientific calculator built with a React + TypeScript frontend, a Flask REST API, and a SQLAlchemy-backed SQLite database. It supports standard arithmetic, scientific functions, memory operations, angle modes, and calculation history while gracefully falling back to local calculations when the backend is unavailable.

## Features

- Standard calculator operations with correct operator precedence
- Scientific mode with trigonometric and logarithmic functions
- DEG / RAD / GRAD angle switching
- Memory controls (MC, MR, M+, M-, MS)
- Persistent calculation history
- Local theme switcher (light and dark)
- Keyboard shortcuts for common operations
- Safe expression parsing without `eval()`
- Responsive interface for desktop, tablet, and mobile
- Backend API for calculation and history management
- GitHub Actions for frontend and backend verification

## Technology stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Python, Flask, Flask-CORS, SQLAlchemy
- Database: SQLite for local development
- Testing: Vitest, React Testing Library, pytest
- Deployment: GitHub Pages for frontend, Flask hosting for backend

## Architecture

React frontend
      ↓
Flask REST API
      ↓
SQLAlchemy
      ↓
SQLite

## Project structure

```text
smart-calculator/
├── .devcontainer/
│   └── devcontainer.json
├── .github/
│   └── workflows/
│       ├── backend.yml
│       └── frontend.yml
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── extensions.py
│   │   └── __init__.py
│   ├── tests/
│   ├── config.py
│   ├── requirements.txt
│   ├── run.py
│   └── calculator.db (local, not committed)
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── README.md
├── .env.example
├── .gitignore
├── LICENSE
├── README.md
└── .git
```

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd calculator
   ```
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```
4. Install backend dependencies:
   ```bash
   cd ../backend
   python -m venv .venv
   source .venv/bin/activate  # Linux/macOS
   # or .\.venv\Scripts\Activate.ps1 on Windows PowerShell
   pip install -r requirements.txt
   ```

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on:
```text
http://localhost:5173
```

## Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python run.py
```

The backend runs on:
```text
http://localhost:5000
```

## Environment variables

The root `.env.example` contains:

```dotenv
VITE_API_URL=http://localhost:5000/api
DATABASE_URL=sqlite:///calculator.db
FRONTEND_URL=http://localhost:5173
```

- `VITE_API_URL` tells the React frontend where the backend lives.
- `DATABASE_URL` configures the SQLite database for local development.
- `FRONTEND_URL` allows the Flask app to manage CORS for the frontend during development.

## Running locally

Open two terminals:

```bash
# Terminal 1 (frontend)
cd frontend
npm run dev
```

```bash
# Terminal 2 (backend)
cd backend
source .venv/bin/activate
python run.py
```

## Testing

### Frontend

```bash
cd frontend
npm test -- --run
```

### Backend

```bash
cd backend
source .venv/bin/activate
pytest -q
```

## GitHub Pages deployment

The frontend workflow in `.github/workflows/frontend.yml` builds the app and deploys it to GitHub Pages using the official Pages actions. In GitHub, enable the Pages source as `GitHub Actions` in the repository settings. The Vite config uses `base: './'` so it works cleanly when hosted in a repository subpath.

## Backend deployment

The Flask backend is intentionally separate from GitHub Pages because GitHub Pages cannot host a Python Flask service. Deploy the backend to a Python-compatible platform such as Render, Railway, PythonAnywhere, or another WSGI-capable host and set the production `VITE_API_URL` to the deployed backend URL.

## API documentation

### Health check

```http
GET /api/health
```

Returns:
```json
{
  "status": "ok"
}
```

### Calculate

```http
POST /api/calculate
```

Request body:
```json
{
  "expression": "25 + 35 * 2",
  "angle_mode": "DEG"
}
```

Successful response:
```json
{
  "success": true,
  "expression": "25 + 35 * 2",
  "result": 95,
  "angle_mode": "DEG"
}
```

Error response:
```json
{
  "success": false,
  "error": "Cannot divide by zero"
}
```

### History endpoints

```http
GET /api/history
GET /api/history/<id>
DELETE /api/history/<id>
DELETE /api/history
```

## Troubleshooting

- Frontend cannot reach backend: confirm `VITE_API_URL` in `.env` and the Flask server is running.
- Database errors: remove the local SQLite file and let the app recreate it.
- JavaScript build errors: run `npm install` in the frontend and verify the Node version is 18+.
- Python dependency issues: create a fresh virtual environment and reinstall dependencies from `backend/requirements.txt`.

## Contributing

1. Create a branch for your change.
2. Run the relevant tests before finishing.
3. Submit a pull request with a concise explanation of the work.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
