# Supabase setup

This directory contains versioned database migrations.

Apply migrations in filename order before deploying application changes. The security-rate-limits migration adds a shared PostgreSQL-backed limiter used by authentication, payment, and administrative operations, plus unique provider-payment indexes used for payment idempotency. Its RPC is service-role-only; do not expose the service-role key to the browser.

Phase 1 includes identity, protected admin membership, and database-driven exam and section configuration only.

Before running migrations, create a Supabase project and copy its URL and publishable key into `.env.local` using `.env.example` as the template.

Question, test, attempt, answer-key, and demo-test tables will be added in later phases after the foundation is approved and verified.
