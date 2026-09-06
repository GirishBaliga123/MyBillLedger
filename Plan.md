# MyBillLedger

## 1. Application name
MyBillLedger

## 2. Problem statement
Daily and monthly expenses often get scattered across rent, groceries, electricity bills, mobile recharges, OTT subscriptions, entertainment, and other routine spending. People usually struggle to know exactly where their money is going, which bills are due, and how much they are spending each month. MyBillLedger is designed to help users record daily transactions, track recurring expenses, monitor budgets, and review monthly spending in a simple and organized way.

## 3. Target users
- Individuals managing household and personal expenses
- Working professionals tracking bills and subscriptions
- Small families managing shared budgets
- Students and young adults learning to budget
- Users who want a simple expense tracker without complex accounting tools
- Initial target: 50 users

## 4. Main features
- Proper and polished UI with a modern card-based layout
- Navigation bar/sidebar for easy screen switching
- Daily transaction entry and tracking
- Income and expense management
- Category-wise spending tracking
- Monthly expense summaries
- Dashboard with financial overview
- Recurring bill tracking
- Bill payment reminders
- Search, filter, and sorting
- Expense reports and PDF export
- Budget monitoring and alerts
- Forms and input fields for structured data entry
- Client-side validation for required fields and invalid values
- Success and error messaging for actions like save, update, delete, and validation
- Data display for tables, lists, totals, and charts
- Basic responsive layout for desktop, tablet, and mobile
- Useful business logic such as monthly total calculation, category totals, budget warnings, and recurring bill logic
- Gmail OAuth login integration for secure sign-in
- Guest login option for quick demo access without creating an account

## 5. Authentication and access model
### Primary login options
- Google OAuth login using Gmail account
- Guest user access for quick demo/testing without signup

### Auth flow
- User lands on landing/login screen
- User selects either "Continue with Google" or "Continue as Guest"
- Guest mode uses local demo data and no account setup
- Google sign-in stores user profile and uses persistent user data in a cloud-backed database in the future

### MVP auth approach
- For local development: Google OAuth via Google Identity Services, configured with a Vite environment variable
- For guest mode: local storage-based mock session or temporary demo profile
- For production: Vercel frontend + backend/auth provider for secure authentication

### Current auth readiness status
- Google sign-in button is scaffolded and ready for a client ID
- `.env.example` includes `VITE_GOOGLE_CLIENT_ID`
- App supports guest login and local demo flow when no client ID is present
- Production deployment should include the same environment variable in Vercel project settings

## 6. Pages/screens required
### Landing / Auth Screen
- Brand header and app intro
- Login with Google button
- Continue as Guest button

### Dashboard
- Total monthly spend
- Total income
- Remaining budget
- Top spending categories
- Monthly chart overview
- Recent transactions
- Upcoming bills
- Clear navigation to other pages
- Responsive summary cards and visual sections

### Today’s Transactions
- Add transaction form with proper input fields
- Date-wise transaction list
- Edit and delete actions
- Daily sum totals
- Validation and inline error handling
- Success/error toast or alert messages

### Monthly Spends
- Monthly total spend
- Category-wise monthly breakdown
- Comparison with previous month
- Trend visualization
- Data summaries and spending insights

### Reports
- Monthly summary report
- Category-wise financial report
- PDF export option
- Print-friendly layout
- Clear report table and chart presentation

### Categories / Settings
- Add and manage categories
- Edit categories and labels
- UI for monthly budget settings
- Preference and theme settings

### Optional additional screens
- Recurring bills page
- Profile page
- Notification screen

### UI and UX requirements
- Navigation menu or sidebar
- Consistent design system and spacing
- Forms with labels and placeholders
- Validation messages for incorrect inputs
- Success/error notifications after actions
- Empty states for no transactions or no reports
- Responsive layout across device sizes

## 7. Technology stack
### Recommended stack
- Frontend: ReactJS
- Build tool: Vite
- Language: JavaScript
- Styling: Tailwind CSS or CSS Modules
- Routing: React Router
- State management: React Context or Zustand
- Charts: Recharts or Chart.js
- PDF export: jsPDF + html2canvas or react-to-print
- Date handling: date-fns or dayjs
- Storage: LocalStorage for MVP
- Deployment: Vercel or Netlify
- Authentication: Firebase Auth or Supabase Auth for Google OAuth

### Good future upgrade path
- Backend: Node.js + Express
- Database: MongoDB or PostgreSQL
- Authentication: Firebase or JWT
- Cloud sync and multi-user support

## 8. Project folder structure
MyBillLedger/
├── public/
├── src/
│   ├── api/
│   │   ├── mockData.js
│   │   └── storage.js
│   ├── assets/
│   │   ├── icons/
│   │   └── images/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Header.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── dashboard/
│   │   │   ├── SummaryCard.jsx
│   │   │   ├── ExpenseChart.jsx
│   │   │   ├── CategoryBreakdown.jsx
│   │   │   └── RecentTransactions.jsx
│   │   ├── transactions/
│   │   │   ├── TransactionForm.jsx
│   │   │   ├── TransactionTable.jsx
│   │   │   └── FilterBar.jsx
│   │   ├── auth/
│   │   │   ├── LoginCard.jsx
│   │   │   └── GuestLoginButton.jsx
│   │   └── reports/
│   │       ├── MonthlyReport.jsx
│   │       └── ExportButton.jsx
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── AppContext.jsx
│   ├── hooks/
│   │   ├── useTransactions.js
│   │   ├── useReports.js
│   │   └── useAuth.js
│   ├── pages/
│   │   ├── LandingPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── TodayTransactionsPage.jsx
│   │   ├── MonthlySpendsPage.jsx
│   │   └── ReportsPage.jsx
│   ├── routes/
│   │   └── AppRoutes.jsx
│   ├── services/
│   │   ├── transactionService.js
│   │   ├── reportService.js
│   │   └── authService.js
│   ├── styles/
│   │   ├── globals.css
│   │   └── variables.css
│   ├── utils/
│   │   ├── currency.js
│   │   ├── dateHelpers.js
│   │   └── categoryColors.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env
├── package.json
├── vite.config.js
├── README.md
├── .gitignore
└── Plan.md

## 9. Data that needs to be stored
### Users
- userId
- name
- email
- provider (google/guest)
- createdAt

### Transactions
- transactionId
- userId
- date
- amount
