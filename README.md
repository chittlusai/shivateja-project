# Hotel Guest ID Management System

MVP with separate backend and frontend folders.

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

The API runs at `http://localhost:5000`.

Default development login:

- Username: `admin`
- Password: `123456`

## PostgreSQL with pgAdmin

1. Open pgAdmin.
2. Create a database named `hotel_guest_db`.
3. In `backend`, copy `.env.example` to `.env`.
4. Update the password in `DATABASE_URL`.

Example `backend/.env`:

```env
SECRET_KEY=change-this-secret-key
JWT_SECRET_KEY=change-this-jwt-secret
DEFAULT_ADMIN_PASSWORD=123456
DEFAULT_PROPERTY_NAME=Hotel Swapna Grand
DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/hotel_guest_db
FRONTEND_ORIGIN=http://localhost:5173
```

Flask will create the `users` and `guests` tables automatically on startup.

Then start the backend:

```powershell
cd backend
python app.py
```

If `DATABASE_URL` is not set, the backend falls back to SQLite at `backend/hotel_guest.db`.

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

The app runs at the Vite URL shown in the terminal, normally `http://localhost:5173`.

If the backend URL changes, set:

```powershell
$env:VITE_API_BASE_URL="http://localhost:5000"
npm run dev
```

## API

- `POST /api/login`
- `POST /api/guest`
- `GET /api/guest/search`
- `GET /api/guest/<id>`

Guest images are stored under `backend/uploads`.
