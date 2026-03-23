# Tenzu (formerly Tenzu) Project Summary

## Overview

Tenzu is an AI-powered advertising management platform designed to democratize ad creation and management for Nigerian SMEs. It simplifies the complex Meta Ads interface into a chat-driven, mobile-first experience, addressing local challenges like payment friction and creative design.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database & Auth**: Supabase (PostgreSQL, Realtime, Auth)
- **State Management**: TanStack Query (Server), Zustand (Client)
- **UI/Styling**: Tailwind CSS, Shadcn UI, Framer Motion
- **AI**: OpenAI (Strategy/Copy), Flux (Image Generation)

## Key Features

### 1. AI Campaign Wizard

- **Chat-First Interface**: Users build campaigns by chatting with an AI marketing expert.
- **Non-Linear Navigation**: Flexible workflow allowing users to jump between Goal, Audience, and Creative steps.
- **Context-Aware ("Assume + Confirm")**: Employs an "Assume + Confirm" AI model to proactively infer strategy (copy, targeting, creatives) from business data, rather than interrogating the user. Allows one-click harmonization if the user changes campaign goals.
- **Simplified Structure**: Enforces a strict 1 Campaign -> 1 Ad Set -> 1 Ad architecture for manageability.

### 2. Creative Studio

- **Generative AI**: Built-in text-to-image generation using restricted Flux models via Fal.ai.
- **Intelligent Aspect Ratio & Editing**: Automatically defaults the creative aspect ratio based on selected Meta sub-placements (e.g., 9:16 for Reels, 4:5 for Explore, 1:1 for Feed), alongside manual cropping and filtering.
- **Asset Library**: "My Creations" gallery for storing and reusing ad creatives.
- **Ephemeral Uploads**: Temporary storage for reference images during generation.

### 3. Localization & Compliance

- **Nigerian Context**: Optimized for Naira payments and WhatsApp-focused objectives.
- **Billing**: Integration with Paystack for subscription management (Prepaid Access).
- **Tenzu Guard & Guardrails**: Robust error handling wrapper around fragile Meta APIs. Includes pre-launch intelligence guardrails to enforce budget controls for new Nigerian accounts and check ad copy for Meta policy compliance (preventing bans).

### 4. Attribution & ROI Tracking (Phase 1)

**Core Infrastructure:**

- **Smart Links**: Universal redirects (`tenzu.africa/l/[token]`) for both WhatsApp and Website destinations.
- **Tenzu Pixel**: Lightweight 1x1 GIF pixel (`/api/pixel`) for tracking website views and purchases.
- **Database Schema**: `attribution_links` (tokens), `link_clicks` (analytics), `whatsapp_sales` (manual records).
- **Campaign Data**: Now includes `sales_count`, `revenue_ngn`, and split click counters (`whatsapp_clicks` vs `website_clicks`).

**User Features:**

- **Pixel Snippet Card**: One-click copy UI for the tracking script in campaign details.
- **Mark as Sold**: Manual sales recording button for offline/WhatsApp conversions.
- **ROI Dashboard**: Real-time view of Spend vs. Revenue (Auto-calculated from Pixel + Manual Sales + Meta Spend).

## Primary User Flows

### Onboarding Flow

1.  **Sign Up/Login**: Magic link or Social Auth via Supabase.
2.  **Business Context**: Collects comprehensive onboarding data (industry, selling method, price tier, target gender) to power AI smart defaults.
3.  **Connect Ad Platform**: OAuth flow to link Meta/Facebook Ad Accounts.
4.  **Subscription**: Select plan and pay via Paystack (Gatekeeper for features).

### Non-Linear Campaign Flow

1.  **Revenue-Centric Objective Selection**: User selects tailored, revenue-focused goals (e.g., "WhatsApp Sales") and Platform.
2.  **AI Consultation (Assume + Confirm)**: Chat interface uses aggressive inference to propose a complete strategy, only asking for confirmation or minor refinements.
3.  **Creative Generation/Selection**:
    - **Smart Skip**: Skip creative step if using existing posts.
    - **Studio**: Generate or editing visuals.
4.  **Review & Launch**: User reviews ad preview and launches directly to Meta.

### AI Creative Generation Flow

1.  **Prompt Input**: User enters a text prompt or uploads up to 4 reference images (stored temporarily in ephemeral storage).
2.  **Context Injection**: System injects campaign context (product name, target audience) into the prompt to ensure relevance.
3.  **Generation**: Tenzu calls Flux.1 via Fal.ai to generate variations (Square/Portrait/Landscape) based on the "Simplicity" or "Creative" advantage.
4.  **Selection & Edit**: User views generated images in chat. Options: "Use as is" or "Edit in Studio".
5.  **Studio Editing**: User crops images to standard ratios (1:1 for Feed, 9:16 for Stories/Reels) and applies filters.
6.  **Persistence**: Final image is uploaded to Supabase Storage (`creatives` bucket) and linked to the user's "My Creations" library for future use.

### Campaign Launch Process

1.  **Pre-Flight Check & Guardrails**: System validates budget, ad account status, user subscription (Gatekeeper check), and flags potentially policy-violating ad copy.
2.  **Structure Assembly**: Constructs the nested JSON payload following the **1:1:1 Rule** (1 Campaign -> 1 Ad Set -> 1 Ad).
3.  **Token Decryption**: Retrieves and decrypts the stored Meta access token (AES-256-CBC) securely on the server.
4.  **API Execution**: Posts to Meta Marketing API in sequence:
    - **Create Campaign**: Objective mapped to the correct Meta objective dynamically (e.g., `OUTCOME_SALES` for Website and WhatsApp campaigns).
    - **Create Ad Set**: Budget and targeting defined here. (`is_adset_budget_sharing_enabled: false`). Dynamically injects the correct `optimization_goal` (e.g., `CONVERSATIONS` for WhatsApp, `LINK_CLICKS` for Website).
    - **Create Ad Creative**: Uploads image hash and text copy.
    - **Create Ad**: Links creative to Ad Set.
5.  **Synchronization**: On success, saves Meta IDs to Supabase `campaigns` table and triggers an immediate "Sync" to fetch live status (Active/In Review).

### Attribution & ROI Flow

1.  **Link Injection**: At campaign launch, the destination URL (WhatsApp link or Website URL) is wrapped in a Tenzu smart link.
2.  **User Click**:
    - User clicks the ad → hits `tenzu.africa/l/[token]`.
    - System records: Device (Mobile/Desktop), OS, Country, Referrer.
    - System increments: `total_link_clicks` and destination-specific counters (`whatsapp_clicks` or `website_clicks`).
    - Redirect: 302 redirect to the actual destination.
3.  **Website Tracking (Pixel)**:
    - For websites, a script tag loads the pixel (`/api/pixel`).
    - **View**: Fires on page load.
    - **Purchase**: Fires when a purchase is confirmed, passing the value.
    - **Auto-Credit**: Valid purchases automatically update the campaign's `sales_count` and `revenue_ngn`.
4.  **WhatsApp Sales (Manual)**:
    - Merchant chats with lead on WhatsApp.
    - Lead pays via transfer/cash.
    - Merchant clicks "Sold! 🎉" in Tenzu dashboard to manually record the sale and revenue.
