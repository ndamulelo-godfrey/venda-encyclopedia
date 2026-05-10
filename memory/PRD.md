# Evenda — Tshivenda Heritage Encyclopedia

## Original Problem Statement
Build a heritage-preservation website for the Tshivenda language and Venda culture — like Wikipedia but focused on Tshivenda. Homepage with site name, welcome and a search bar. Search results page with a sort/filter feature across words, proverbs, idioms, plants, animals (and more). A contribution template for adding new entries.

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB), JWT auth via httpOnly cookies (bcrypt-hashed passwords, PyJWT). All routes prefixed `/api`.
- **Frontend**: React 19 + React Router 7 + Tailwind + Shadcn UI primitives, custom design system inspired by Venda minwenda colours (terracotta / forest green), Cormorant Garamond + Work Sans typography.
- **Database**: MongoDB. Collections: `users`, `entries`. UUID string `id` field; Mongo `_id` excluded from all responses.

## User Personas
- **Visitor / Researcher** — searches and reads (no account needed).
- **Contributor** — creates an account to publish words, proverbs, plants, animals, etc.
- **Admin** — seeded automatically; future moderation surface.

## Core Requirements (static)
- Public homepage with massive search bar over Baobab hero.
- Public search results page with category filter (9 categories) and sort (A→Z, Newest, By Category).
- Public entry detail page with full editorial typography + pronunciation playback.
- Contribute form (login required) with template fields: term, translation, pronunciation, category, meaning, example, region, image_url, audio_url.
- Login / Register flows.
- Initial seed of 15 sample Tshivenda entries.

## What's Been Implemented (2026-02-10)
- ✅ FastAPI backend: auth (register/login/logout/me), entries (list/get/create), categories endpoint, startup seeding (admin + 15 entries), MongoDB indexes.
- ✅ JWT cookie auth with bcrypt, 7-day access tokens, samesite=none + secure cookies for cross-origin preview.
- ✅ React frontend with 6 routes: `/`, `/search`, `/entry/:id`, `/contribute`, `/login`, `/register`.
- ✅ Auth context with `withCredentials` axios.
- ✅ Browser pronunciation playback via `audio_url` or `speechSynthesis` fallback.
- ✅ 18/18 backend tests + 9/9 frontend flows passing in testing agent.

## Prioritised Backlog
- **P1**: Audio recording in the contribute form (currently URL-only).
- **P1**: Admin moderation page (approve / unpublish entries).
- **P1**: User profile page with their contributions.
- **P2**: Image upload (currently URL-only) — wire object storage integration.
- **P2**: Brute-force lockout on login + rate limiting.
- **P2**: Edit / delete own entries.
- **P3**: Multi-language toggle (English ↔ Tshivenda UI).
- **P3**: Open API for researchers; CSV export.
- **P3**: SEO + sitemap + Open Graph for shareable entries.

## Test Credentials
See `/app/memory/test_credentials.md`.
