# Supabase setup

This directory contains local, versioned database migrations for the IIITH platform.

## Project isolation

The IIITH platform must use a new, dedicated Supabase project. The existing school-management Supabase project is unrelated and must not be connected to this application or receive these migrations.

Do not run migrations yet. Keep them local until the dedicated project has been created, its URL and publishable key have been verified, and the database target has been explicitly confirmed.

When the dedicated project is ready, copy its values into `.env.local` using `.env.example` as the template. Never commit `.env.local` or service-role credentials.

Phase 1 includes identity, protected admin membership, and database-driven exam and section configuration only.

Question, test, attempt, answer-key, and demo-test tables will be added in later phases after the foundation is approved and verified.
