# IntelliFin Technical Specifications

## Table of Contents
1. [File System Structure](#file-system-structure)
2. [Feature Specifications](#feature-specifications)
   - [User Authentication & Onboarding](#user-authentication--onboarding)
   - [Airtel Mobile Money Integration](#airtel-mobile-money-integration)
   - [Invoice Management](#invoice-management)
   - [Expense Management](#expense-management)
   - [Financial Dashboard & Reporting](#financial-dashboard--reporting)

## File System Structure

### Frontend Structure (Next.js)
```
/intellifin-frontend
├── .github                    # GitHub workflows and CI/CD configurations
├── .next                      # Next.js build output (gitignored)
├── public                     # Static assets
│   ├── favicon.ico
│   ├── logo.svg
│   └── images/
├── src
│   ├── app                    # App router pages and layouts
│   │   ├── (auth)             # Authentication routes group
│   │   │   ├── login
│   │   │   ├── register
│   │   │   └── forgot-password
│   │   ├── (dashboard)        # Protected dashboard routes group
│   │   │   ├── layout.tsx     # Dashboard layout with sidebar/header
│   │   │   ├── page.tsx       # Main dashboard page
│   │   │   ├── invoices/      # Invoice management pages
│   │   │   ├── expenses/      # Expense management pages
│   │   │   ├── transactions/  # Transaction management pages
│   │   │   ├── reports/       # Financial reports pages
│   │   │   └── settings/      # User and organization settings
│   │   ├── api                # API routes for client-side operations
│   │   └── layout.tsx         # Root layout
│   ├── components             # Reusable UI components
│   │   ├── ui                 # Basic UI components (buttons, inputs, etc.)
│   │   ├── forms              # Form components and validation
│   │   ├── layout             # Layout components (sidebar, header, etc.)
│   │   ├── dashboard          # Dashboard-specific components
│   │   ├── invoices           # Invoice-related components
│   │   ├── expenses           # Expense-related components
│   │   ├── transactions       # Transaction-related components
│   │   └── reports            # Reporting and chart components
│   ├── hooks                  # Custom React hooks
│   ├── lib                    # Utility functions and libraries
│   │   ├── api.ts             # API client setup
│   │   ├── auth.ts            # Authentication utilities
│   │   ├── date-utils.ts      # Date formatting and manipulation
│   │   └── currency-utils.ts  # Currency formatting and calculations
│   ├── providers              # React context providers
│   │   ├── auth-provider.tsx  # Authentication context
│   │   └── theme-provider.tsx # Theme context for dark/light mode
│   ├── store                  # Global state management (if needed)
│   ├── styles                 # Global styles and theme configuration
│   └── types                  # TypeScript type definitions
├── .env.local                 # Local environment variables (gitignored)
├── .eslintrc.js               # ESLint configuration
├── .gitignore                 # Git ignore file
├── next.config.js             # Next.js configuration
├── package.json               # NPM dependencies and scripts
├── postcss.config.js          # PostCSS configuration
├── tailwind.config.js         # Tailwind CSS configuration
└── tsconfig.json              # TypeScript configuration
```

### Backend Structure (NestJS)
```
/intellifin-backend
├── .github                    # GitHub workflows and CI/CD configurations
├── dist                       # Compiled output (gitignored)
├── node_modules               # Dependencies (gitignored)
├── src
│   ├── main.ts                # Application entry point
│   ├── app.module.ts          # Root application module
│   ├── config                 # Configuration modules
│   │   ├── database.config.ts # Database configuration
│   │   ├── auth.config.ts     # Authentication configuration
│   │   └── app.config.ts      # Application configuration
│   ├── common                 # Common utilities and helpers
│   │   ├── decorators/        # Custom decorators
│   │   ├── filters/           # Exception filters
│   │   ├── guards/            # Route guards
│   │   ├── interceptors/      # Request/response interceptors
│   │   ├── middleware/        # HTTP middleware
│   │   └── utils/             # Utility functions
│   ├── modules                # Feature modules
│   │   ├── auth               # Authentication module
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/    # Passport strategies
│   │   │   └── dto/           # Data transfer objects
│   │   ├── users              # User management module
│   │   ├── organizations      # Organization management module
│   │   ├── mobile-money       # Mobile money integration module
│   │   ├── invoices           # Invoice management module
│   │   ├── expenses           # Expense management module
│   │   ├── transactions       # Transaction management module
│   │   ├── reports            # Financial reporting module
│   │   └── dashboard          # Dashboard data module
│   ├── database               # Database related code
│   │   ├── migrations/        # Database migrations
│   │   ├── seeds/             # Database seeders
│   │   └── entities/          # TypeORM entities
│   └── integrations           # Third-party integrations
│       ├── airtel/            # Airtel Money API integration
│       ├── zra/               # ZRA Smart Invoice API integration
│       ├── storage/           # Azure Blob Storage integration
│       └── email/             # Email service integration
├── test                       # Test files
│   ├── e2e/                   # End-to-end tests
│   └── unit/                  # Unit tests
├── .env                       # Environment variables (gitignored)
├── .eslintrc.js               # ESLint configuration
├── .gitignore                 # Git ignore file
├── .prettierrc                # Prettier configuration
├── nest-cli.json              # NestJS CLI configuration
├── package.json               # NPM dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── tsconfig.build.json        # TypeScript build configuration
```

## Feature Specifications

Each feature specification includes:
- Clear goals and objectives
- API relationships and dependencies
- Detailed requirements
- Database schema
- Implementation guides with pseudocode
- API endpoints
- Frontend components
- Background jobs
- Security considerations
- Testing strategy
- Error handling
- Logging and monitoring
- Key edge cases

For complete details on each feature, please refer to the individual specification documents:

- [User Authentication & Onboarding](/intellifin-tech-specs-auth.md)
- [Airtel Mobile Money Integration](/intellifin-tech-specs-airtel.md)
- [Invoice Management](/intellifin-tech-specs-invoice.md)
- [Expense Management](/intellifin-tech-specs-expense.md)
- [Financial Dashboard & Reporting](/intellifin-tech-specs-dashboard.md)
