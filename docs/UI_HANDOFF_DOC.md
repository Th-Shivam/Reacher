# REACHER - UI/UX Handoff & Design Specification Document

**Project:** Reacher (Automated Cold Outreach & AI Job Search Platform)  
**Target Audience:** Job Seekers, Software Engineers, Early-Career Professionals  
**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Motion (Framer Motion), Clerk Auth, Spline 3D  

---

## 1. Executive Summary & Vision

Reacher is an automated cold outreach assistant designed to help job seekers turn job descriptions into highly personalized outreach emails and automatically save them as Gmail drafts.

### Current Pain Point
The existing frontend has functional forms (Profile, Outreach, Landing Page) but requires a cohesive, modern, production-grade UI/UX design. It needs a unified design system, refined micro-interactions, responsive layouts, and a clean dashboard feel for authenticated users.

### Design Goal
Create a futuristic yet clean **Dark Mode aesthetic** (Glassmorphism, subtle glowing gradients, smooth micro-animations, high contrast, clean typography) that feels like a top-tier SaaS platform (e.g., Vercel, Linear, Raycast style).

---

## 2. Design System & Style Guidelines

### Color Palette
- **Background Core:** `#0b0f19` / `#07090e` (Deep Obsidian / Midnight Dark)
- **Card / Surface:** `rgba(255, 255, 255, 0.03)` with `backdrop-blur` and border `rgba(255, 255, 255, 0.08)`
- **Primary Accent:** Purple / Indigo Gradient (`#6366f1` to `#8b5cf6` / `#ec4899`)
- **Success Accent:** Emerald Green (`#10b981`) for Gmail Connection & Success states
- **Text Primary:** `#f9fafb` (High contrast crisp white)
- **Text Secondary:** `#9ca3af` (Muted gray)

### Typography & Structure
- **Font Family:** Inter / Plus Jakarta Sans / System Sans-Serif
- **Inputs & Buttons:** Rounded corners (`rounded-xl` or `rounded-2xl`), crisp hover states, focus rings with subtle outer glow (`focus:ring-2 focus:ring-indigo-500/50`).

---

## 3. Page Structure & Layout Architecture

```
Reacher App Breakdown
│
├── 🌐 Public Landing Page (Unauthenticated)
│   ├── Navigation Bar (Logo, Auth CTA buttons)
│   ├── Spline 3D Hero Section (Centered typography, dynamic 3D elements)
│   ├── Key Features Grid (Bento Grid layout recommended)
│   └── Call-to-Action / Footer Section
│
└── 🔒 Application Dashboard (Authenticated)
    ├── Top Navigation Header (Brand logo, User profile/Clerk UserButton, Gmail Status indicator)
    └── Main Content Grid / Tabs:
        ├── 👤 Section 1: Candidate Profile & Resume Management
        └── ✉️ Section 2: AI Outreach Email Generator
```

---

## 4. Detailed Component & Form Specifications

### 4.1 Candidate Profile Form (`ProfileForm.tsx`)

**Purpose:** Captures background details of the job seeker to train the AI agents.

#### Form Fields:
1. **Target Roles** *(Input Tags / Chip List)*: e.g., "Full Stack Engineer, Backend Developer"
2. **Key Skills** *(Input Tags / Chip List)*: e.g., "React, FastAPI, Python, MongoDB, System Design"
3. **Years of Experience** *(Number / Select)*: e.g., "2 years"
4. **Summary / Bio** *(Textarea)*: Brief background or elevator pitch.
5. **Resume Upload / Raw Text** *(File Upload Dropzone + Textarea)*: Pasting resume text or uploading PDF.

#### Expected UI Improvements:
- Card-like Container with clean section dividers.
- Auto-saving state indicator or a prominent "Save Profile" button with loading spinners (`Framer Motion` state changes).
- Tag input components for Skills and Target Roles instead of raw comma-separated text.

---

### 4.2 AI Outreach Generator Form & Workspace (`OutreachForm.tsx`)

**Purpose:** Core workflow page where users input job details and trigger the Multi-Agent AI generation.

#### Step 1: Input & Context Collection
- **Company Name** *(Text Input)*: e.g., "Google", "Stripe"
- **Job Title** *(Text Input)*: e.g., "Senior Software Engineer"
- **Recipient Email** *(Email Input)*: Target hiring manager or recruiter email.
- **Job Description (JD)** *(Rich Textarea)*: Full text of the target position.
- **Tone & Style Selector** *(Radio Cards / Pills)*:
  - `Professional & Concise` (Default)
  - `Confident & Direct`
  - `Warm & Conversational`

#### Step 2: Gmail OAuth Connection Banner
- **Status Indicator:**
  - 🟢 **Connected:** Shows connected Gmail address with a "Save as Draft" status.
  - 🔴 **Disconnected:** Shows a prominent CTA button: **"Connect Gmail to Auto-Save Drafts"** with Google Icon.

#### Step 3: Multi-Agent AI Execution Pipeline (Visual Progress UX)
When user clicks **"Generate Outreach Email"**, show a step-by-step agent workflow animation:
1. `[1/3] JD Analyzer`: Extracting core requirements...
2. `[2/3] Candidate Profiler`: Matching user skills with JD...
3. `[3/3] Pitch Reviewer`: Crafting personalized pitch...

#### Step 4: Generated Email Output & Actions
Once generated, display the output in an interactive email preview card:
- **Subject Line:** Readonly input with a "Copy Subject" button.
- **Email Body:** Editable rich textarea or preview formatted block.
- **Action Buttons:**
  - 📥 **"Save to Gmail Drafts"** (Triggers API, shows success toast notification)
  - 📋 **"Copy to Clipboard"**
  - 🔄 **"Regenerate / Refine Pitch"**

---

### 4.3 Public Landing Page (`LandingPage.tsx`)

#### Key UI Sections needed:
1. **Hero Section:** Centered high-impact headline (*"Automate your job outreach with agentic AI"*), Spline 3D interactive background/canvas, CTA buttons (*"Get Started Free"*, *"View Demo"*).
2. **Feature Highlights (Bento Grid):**
   - **Multi-Agent Engine:** Visualizing JD analysis and skill matching.
   - **1-Click Gmail Draft Sync:** Instant draft creation inside user's inbox.
   - **Smart Personalization:** AI pitches tailored to candidate accomplishments.
3. **Interactive Demo Preview:** A mock visual of the Outreach generator in action.

---

## 5. UI/UX Deliverables Requested from the Designer

1. **Design System / UI Kit:** Colors, Typography, Buttons, Inputs, Cards, Badges, Toast alerts.
2. **Figma / Wireframes:**
   - Landing Page (Desktop & Mobile view)
   - Authenticated User Dashboard (Profile setup + Outreach Workspace)
   - Active States (Loading animation for AI agents, Modal dialogs, Gmail OAuth status states)
3. **Micro-interactions & Animation guidelines:** Smooth tab transitions, button hover/press states, progress bar for multi-agent generation.

---

## 6. Technical Stack Context for Implementation

- **CSS Framework:** Tailwind CSS v4
- **Icons:** Tabler Icons (`@tabler/icons-react`) or Lucide React
- **Animations:** Motion (`motion/react`)
- **Authentication Components:** Clerk UI (`@clerk/react`)
