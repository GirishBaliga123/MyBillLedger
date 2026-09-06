# MyBillLedger

MyBillLedger is a local-first expense tracker for managing income, recurring bills, budgets, and monthly spending.

## Local setup

1. Copy `.env.example` to `.env`
2. Add your Google OAuth client ID in `VITE_GOOGLE_CLIENT_ID`
3. Install dependencies:

   npm install

4. Run the app:

   npm run dev

## Google OAuth setup

1. Go to Google Cloud Console
2. Create a new project or use an existing one
3. Enable Google Identity Services / OAuth Client
4. Create an OAuth client ID for a web application
5. Add your local origin, such as:
   - http://localhost:5173
6. Copy the generated client ID into `.env` as:

   VITE_GOOGLE_CLIENT_ID=your_client_id_here

## Vercel deployment

This project is ready to deploy to Vercel as a Vite React app.

1. Import the GitHub repository into Vercel
2. Set the framework as Vite automatically
3. Add the environment variable in the project settings:
   - VITE_GOOGLE_CLIENT_ID
4. Deploy the project

For local build validation, use:

   npm run build

## Features

- dashboard overview
- transaction add/edit/delete
- search, filters, and date range filters
- category management
- recurring bills
- CSV export
- PDF print export
- monthly budget tracking
- guest mode
