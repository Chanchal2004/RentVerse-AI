# Rentily — PRD

## Original problem statement
Additionally, implement Owner KYC verification to improve trust and security, a Visit Booking Calendar that allows tenants to request and schedule property visits directly through the platform, and ensure that every newly submitted property remains in a Pending state until it passes AI verification or receives admin approval. The admin should have complete control to approve, reject, suspend, or request additional information for any listing so that only genuine and trustworthy properties are published. The property listing process should be simple and user-friendly (essential fields only + optional details later to improve ranking). Once a tenant unlocks a property's contact through a successful Razorpay payment, the unlocked contact should remain permanently available in the tenant's account, while Premium subscribers should automatically unlock all eligible property contacts during their active subscription. No placeholder pages, no dummy buttons, no mock APIs — every feature connected to a working backend, DB, auth, payment, chat, and admin panel.

## Architecture
- **Backend**: FastAPI (server.py, routes_*.py) + Motor MongoDB, JWT auth (bcrypt), Claude Sonnet 4.5 via `emergentintegrations` for AI listing verification, `razorpay` SDK, Emergent Object Storage (modular `storage.py`).
- **Frontend**: React 19 (CRA + Craco), TailwindCSS, Shadcn UI, `sonner` toasts, `axios`, Razorpay Checkout embedded via CDN script.
- **DB collections**: users, properties, kyc, files, unlocks, payments, subscriptions, visits, chat_messages.

## User personas
- **Tenant**: signs up, searches, books visits, unlocks contacts (₹29 one-off) or subscribes to Premium for unlimited.
- **Owner**: signs up, submits KYC, lists properties (AI-verified + admin-moderated), manages visit requests.
- **Admin**: seeded (admin@rentily.in / Admin@12345). Full moderation panel — properties, KYC, users, payments.

## Core requirements (static)
1. Property status lifecycle: Pending → AI verdict → Approved / Rejected / Suspended / Needs-info.
2. Owner KYC: pending → approved/rejected. Approved owners get a "KYC Verified" badge on listings.
3. Visit booking calendar (tenant requests slot, owner confirms/rejects/completes).
4. Razorpay payments — ₹29 unlock (lifetime for that property), ₹99/mo, ₹249/3mo, ₹799/yr Premium (unlimited).
5. Permanent unlocked contacts stored per-tenant in `unlocks`.
6. Chat threads between tenant and owner scoped to shared property.
7. File uploads via Emergent Object Storage (modular — swap to S3/Cloudinary by replacing `storage.py`).

## What's implemented (2026-02-07)
- JWT auth (register/login/me), roles tenant/owner/admin, admin seeded on startup.
- Property CRUD + AI verification (Claude Sonnet 4.5) with `pending/approved/rejected/suspended/needs_info` lifecycle.
- Listing wizard (3 steps: essentials, photos, optional details).
- KYC submission (ID + selfie + optional ownership proof) with admin approval flow.
- Owner dashboard (listings, visit requests, KYC), Tenant dashboard (unlocks, visits, chat).
- Razorpay integration: order creation, signature verification, webhook handler — reads keys from env at call-time (add keys later without code changes; returns 503 with clear message when unconfigured).
- Premium subscription (monthly/quarterly/yearly) — extends `premium_until`, auto-unlocks all eligible contacts.
- Permanent per-property unlocks stored in `unlocks` collection.
- Admin panel: stats, listings moderation (approve/reject/suspend/request-info), KYC review, users, payments.
- Chat module (threads + messages, read receipts).
- Visit booking with date/time picker + owner confirm/reject/complete.
- Object storage abstraction (Emergent) with modular provider swap.
- Fully tested end-to-end (30/30 backend tests, all critical UI flows).

## Prioritized backlog
- **P1** — Google Maps embed inside property detail (currently just an external link).
- **P1** — Owner earnings dashboard (visitors, conversion, revenue-share if we add that later).
- **P2** — Email/SMS notifications for visit confirmations & unlocks (SendGrid + Twilio).
- **P2** — Advanced search: draw-on-map polygon, distance from work, commute time.
- **P2** — Property boost (paid promotion) for owners.
- **P3** — In-app rent agreement generator (PDF) + e-sign.
- **P3** — Reviews & ratings on completed rentals.

## Next tasks
1. User adds real Razorpay keys → live payments (no code change needed).
2. Optional: swap Emergent storage → Cloudinary/S3 by re-implementing `storage.py` (interface stays the same).
