# World Snapshot - Global Crisis & News Monitoring Platform

A real-time geopolitical intelligence dashboard that aggregates, categorizes, and visualizes global news, conflicts, disasters, and mortality statistics. Built with React, Node.js, and D3.js.

## Overview

World Snapshot provides a comprehensive overview of global events by:
- **Automatically fetching** news from GNews API across 7 categories
- **Categorizing content** using intelligent keyword analysis (Military, Disasters, Politics, Economy, Health, Science, Popular)
- **Analyzing sentiment** and calculating event intensity scores
- **Visualizing global tensions** on an interactive world map
- **Tracking real-time mortality statistics** from worldpopulationreview.com
- **Providing admin controls** for manual content management

## Features

###  Smart News Categorization
- Automatic categorization using weighted keyword matching
- Sports content filtering (ignores football, basketball, etc.)
- Sentiment analysis (-100 to +100 scale)
- Intensity scoring (0-100%) based on category and urgency keywords
- 7 distinct categories with priority-based sorting

###  Interactive World Map
- D3.js geo-map with color-coded tension levels:
  - 🔴 **War** - Active armed conflicts
  - 🟠 **High Tension** - Elevated geopolitical stress
  - 🟡 **Protests** - Civil unrest demonstrations
  - 🔵 **Eco Crisis** - Environmental disasters
  - 🟢 **Stable** - Normal conditions
  - ⚪ **No Data** - Information unavailable

###  Mortality Tracker
- Real-time global death statistics (daily/hourly/minute/second)
- Country-specific mortality data
- Year-over-year trend analysis
- Data sourced from worldpopulationreview.com

### ⚡ Lightning Brief
- Curated headlines from globalissues.org
- 30-minute cache with manual refresh capability
- Quick-access news summaries

###  Admin Panel
- **Country Editor** - Modify country status, descriptions, and metrics
- **Events Editor** - Add/remove custom news events
- **Metrics Editor** - Override global statistics
- **Brief Editor** - Manually refresh lightning brief
- Secure token-based authentication

##  Architecture
```bash
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ React Frontend  │────▶│ Node.js Server  │────▶│ External APIs   │
│ (Vite + TS)     │◀────│ (Express)       │◀────│ - GNews         │
└─────────────────┘     └─────────────────┘     │ - Global Issues │
        │                       │               │ - Population    │
        │                       │               │ Review          │
        ▼                       ▼               └─────────────────┘
┌─────────────────┐     ┌─────────────────┐
│ Local Storage   │     │ JSON Database   │
│ (User prefs)    │     │ (events.json)   │
└─────────────────┘     └─────────────────┘
```

### Tech Stack

**Frontend:**
- React 19 with TypeScript
- Vite for blazing-fast builds
- D3.js for map visualizations
- Tailwind CSS for styling
- React Router for navigation

**Backend:**
- Node.js with Express
- node-cron for scheduled tasks (12:00 & 00:00 NY time)
- Cheerio for web scraping
- TopoJSON for map data processing

**Data Sources:**
- GNews API (news aggregation)
- globalissues.org (lightning brief)
- worldpopulationreview.com (mortality stats)

## 📦 Installation

### Prerequisites
- Node.js 18+
- GNews API key ([get it here](https://gnews.io/))

### Setup

```bash
# Clone repository
git clone https://github.com/Khamit/world_snapshot.git
cd world_snapshot

# Install dependencies
npm install

# Configure environment
cp .env.example .env        # Server variables
cp .env.example .env.local  # Frontend variables

# Edit .env with your keys:
# ADMIN_TOKEN=your_secret_token
# GNEWS_API_KEY=your_api_key
# FRONTEND_URL=http://localhost:5173

# Start development servers
npm run dev          # Frontend: http://localhost:5173
node server/index.js # Backend: http://localhost:3000
```

## Deploy to Render
- Push code to GitHub
- Create new Web Service on Render
- Connect your repository
- Configure:
Build Command: npm install && npm run build
Start Command: node server/index.js
- Add environment variables:
ADMIN_TOKEN
GNEWS_API_KEY
FRONTEND_URL (your Render URL)

```bash
world_snapshot/
├── server/
│   ├── index.js           # Express API server
│   └── analyzer_new.js    # Sentiment & categorization engine
├── src/
│   ├── admin/             # Admin panel components
│   ├── components/        # Reusable UI components
│   │   ├── world_map.tsx  # D3 map visualization
│   │   ├── summary_cards.tsx
│   │   ├── country_panel.tsx
│   │   └── LightningBrief.tsx
│   ├── data/
│   │   └── countries.ts   # Static country database
│   ├── hooks/
│   │   └── useGlobalData.ts
│   ├── types/
│   │   └── index.ts       # TypeScript definitions
│   ├── app.tsx            # Main app with routing
│   └── main.tsx           # Entry point
├── public/
├── .env.example           # Environment template
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

### Category System

| Category   | Weight | Priority | Keywords Example                              |
|------------|--------|----------|-----------------------------------------------|
| Military   | 2.0    | 1        | war, conflict, attack, drone, missile         |
| Disasters  | 2.0    | 1        | earthquake, flood, hurricane, fire            |
| Economy    | 1.8    | 2        | inflation, stock market, recession            |
| Health     | 1.8    | 2        | pandemic, vaccine, hospital                   |
| Politics   | 1.5    | 2        | election, protest, government                 |
| Science    | 1.5    | 3        | space, research, discovery                    |
| Popular    | 1.0    | 4        | viral, trending, celebrity                    |

> Sports content is automatically filtered out (football, NBA, NFL, UFC, etc.)

### Admin Authentication
The admin panel uses token-based authentication:
User enters token in login form
Token sent via x-admin-token header
Server compares with ADMIN_TOKEN env variable
Token stored in localStorage for session persistence

### Scheduled Tasks
News Fetch: Every 12 hours (8 AM/8 PM New York time)
Lightning Brief: Every 30 minutes (cooldown)
Death Statistics: On each news fetch

### Data Flow
Server fetches news from GNews API (7 parallel queries)
Each article analyzed for category, sentiment, intensity
Sports content filtered out
Death statistics scraped from worldpopulationreview.com
Lightning brief fetched from globalissues.org
All data merged and saved to JSON files
Frontend requests /api/snapshot endpoint
React components render interactive visualizations

### Security Features
CORS configured with specific origin
Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
Admin token validation on all protected routes
No sensitive data exposed to frontend
Input validation on API endpoints

### Contributing
Contributions welcome! Please ensure:
TypeScript types are properly defined
New categories follow existing pattern
API keys remain in .env (never committed)
Sports filtering expanded as needed

Project Link: https://github.com/Khamit/world_snapshot