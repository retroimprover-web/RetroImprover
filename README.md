# RetroImprover

AI-powered vintage photo restoration and animation web application.

## 🚀 Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **AI**: Google Gemini API
- **Auth**: JWT + OAuth (Google, Facebook, Apple)

## 📁 Project Structure

```
RetroImprover/
├── backend/          # Backend API (Express)
│   ├── src/
│   ├── prisma/
│   └── package.json
├── services/         # Frontend API client
├── App.tsx          # Main React component
└── package.json     # Frontend dependencies
```

## 🛠️ Local Development

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Backend runs on `http://localhost:3000`

### Frontend

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## 🌐 Deployment

See `DEPLOY_STEPS.md` for detailed deployment instructions.

**Quick deploy:**
- Backend: Railway
- Frontend: Vercel

## 📝 Environment Variables

### Backend (.env)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `GOOGLE_GENAI_API_KEY` - Google Gemini API key
- `FRONTEND_URL` - Frontend URL for CORS
- OAuth credentials (optional)

### Frontend (.env)
- `VITE_API_URL` - Backend API URL

## 📚 Documentation

- `DEPLOY_STEPS.md` - Step-by-step deployment guide
- `DEPLOY_NOW.md` - Detailed deployment instructions
- `GOOGLE_OAUTH_SETUP_GUIDE.md` - OAuth setup guide
- `backend/README.md` - Backend documentation

## 📄 License

ISC
