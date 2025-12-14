# Product Requirements Document (PRD): SaloneFix

> **Role for AI Assistant:** You are an expert Full-Stack Developer and UI/UX Designer participating in a high-stakes 12-hour hackathon. Your goal is to build a "Vibe Coding" solution that is fast, visually stunning, and technically functional. Use this document as the Single Source of Truth for all code generation.

---

## 1. Core Concept
* **Product Name:** SaloneFix
* **Tagline:** Don't Shout into the Void. Snap, Send, Solved.
* **Problem:** Citizens see environmental hazards (trash, potholes, blocked drains) but don't know which government office to call. Reporting is tedious, and feedback is non-existent.
* **Solution:** A mobile-first web app where users upload a photo. AI (Computer Vision) automatically analyzes the image, categorizes the hazard, geo-tags it, and routes it to a government dashboard.

## 2. Target Users
1.  **The Citizen (Mobile User):**
    * **Context:** Low bandwidth, mobile device, on the go.
    * **Need:** Wants to report a problem in < 10 seconds. No complex forms.
2.  **The Government Admin (Desktop User):**
    * **Context:** Ministry office (Health, Works, EPA).
    * **Need:** A visual dashboard to see where problems are clustering and manage status.

## 3. Technical Stack & Architecture
* **Frontend:** React (Vite), Tailwind CSS, Lucide React (Icons).
* **Backend / Database:** Supabase (PostgreSQL, Auth, Storage).
* **AI Integration:** Gemini (Vision) or similar for image analysis.
* **Maps:** Leaflet (react-leaflet) or Mapbox GL.
* **Hosting:** Vercel

## 4. Features & User Stories

### A. Citizen Interface (Public - Mobile First)
* **Landing Page:**
    * Hero section with a massive, pulsing "Report Issue Now" button.
    * "How it works" section (3 simple steps).
    * Latest Report Submission from your community with filter capabilities
* **Report Flow:**
    * **Camera Input:** Opens native camera `capture="environment"`.
    * **Geolocation:** Automatically grabs `navigator.geolocation`.
    * **AI Analysis (The "Magic"):** User uploads photo -> System analyzes it -> System auto-fills "Category" and "Description".
    * **Submission:** User confirms details and hits submit.
* **Public Feed:**
    * A list of recent reports showing: Photo, Category Badge, Status Badge (Pending/Fixed).

### B. Admin Dashboard (Private - Desktop)
* **Map View:** Interactive map with pins.
    * Red Pin = High Severity / Danger.
    * Yellow Pin = Medium / Sanitation.
    * Green Pin = Resolved.
* **Triage List:** Sidebar list of reports.
* **Actions:** Admin can change status from `Pending` -> `In Progress` -> `Resolved`.

## 5. Database Schema (Supabase)

**Table:** `reports`

| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key, default `gen_random_uuid()` |
| `created_at` | `timestamptz` | Default `now()` |
| `image_url` | `text` | URL from Supabase Storage |
| `latitude` | `float` | GPS Latitude |
| `longitude` | `float` | GPS Longitude |
| `category` | `text` | Auto-detected (e.g., 'Sanitation', 'Roads') |
| `description` | `text` | AI-generated summary of the image |
| `severity` | `text` | 'Low', 'Medium', 'High' |
| `status` | `text` | Default: 'Pending'. Options: 'In Progress', 'Resolved' |
| `reporter_id` | `uuid` | (Optional) Nullable if anonymous reporting allowed |

## 6. API Requirements (AI Analysis)

**Endpoint:** `/api/analyze-image`
* **Input:** Image File or Base64 string.
* **Process:** Send to OpenAI Vision API with system prompt: *"Identify the civic issue in this image (e.g., pothole, trash, broken street light). Return JSON with: category, severity (low/med/high), and a 1-sentence description."*
* **Output:** JSON Object `{ category, severity, description }`.

## 7. Design Guidelines (UI/UX)
* **Color Palette:** Inspired by Sierra Leone (Green, White, Blue) but modernized.
    * *Primary:* Emerald Green (Success/Action).
    * *Secondary:* Deep Blue (Headers/Trust).
    * *Background:* Clean White/Light Gray.
* **Accessibility:** Large buttons (thumb-friendly), high contrast text.
* **Vibe:** Efficient, Civic, Modern, "Action-Oriented".

## 8. Success Metrics (Hackathon Goals)
* **Speed:** Time from "Landing Page" to "Submitted Report" < 30 seconds.
* **Innovation:** AI successfully categorizes a random image during the live demo.
* **Clarity:** The Admin Map clearly shows "Hotspots" of trouble.