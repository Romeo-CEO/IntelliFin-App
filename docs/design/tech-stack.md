**`CURRENT_TECH_STACK`**: This outlines all the current technology choices for the frontend, backend, database, queue system, caching, file storage, CDN, cloud platform, and analytics.
    *   <CURRENT_TECH_STACK>
        Frontend: Next.js (React) with TypeScript.
        Backend: NestJS with TypeScript.
        Database: PostgreSQL with Prisma ORM, utilizing a multi-schema architecture for multi-tenancy (likely schema-per-tenant).
        Queue System: Bull (or BullMQ) for background job processing (e.g., MoMo sync, ZRA submissions).
        Caching: Redis for session management and application caching.
        File Storage: Azure Blob Storage for documents like receipts and generated PDFs.
        CDN: Azure CDN for static asset delivery.
        Cloud Platform: Primary deployment target is Microsoft Azure.
        Analytics: PostHog for product analytics.
    </CURRENT_TECH_STACK>