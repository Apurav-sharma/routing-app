# Spotter: Weather-Aware Truck Routing Web App

A production-ready full-stack application built with **React** and **Django** that helps commercial truck drivers and fleet dispatchers choose the safest, most efficient routes based on real-time weather forecasts, load weight vulnerability, and travel time.

![Telemetry Dashboard Preview](frontend/src/assets/hero-preview.png)

---

## 🌟 Key Features

1. **Executive Home & Landing Portal**:
   - High-impact landing page introducing the freight safety platform, architecture, and live system telemetry.
   - **One-Click Freight Corridor Analysis**: Instant launcher cards for major US trucking corridors (*I-80 Midwest*, *Rockies Mountain Pass*, *South Central Arterial*, *Midwest-Southeast Express*).
   - **Interactive Safety Matrix**: Clear presentation of the 5 weather risk tiers, payload vulnerability blowover rules, and the 4-tier recommendation hierarchy.
   - Seamless navigation between the **Home Overview** and the **Interactive Dispatch Dashboard**.

2. **3-Route Alternative Generation**:
   - Generates 3 distinct route options using the Open Source Routing Machine (OSRM) highway network engine.
   - Decodes full geometries and calculates distances and driving durations.

2. **Equidistant Weather Sampling (10 / 25 / 50 miles)**:
   - Resamples polyline coordinates at exact spatial intervals selected by the driver.
   - Computes estimated arrival times (ETA) at every checkpoint along the trip corridor.

3. **Zero-Paid API Architecture**:
   - **Routing**: Open Source Routing Machine (OSRM) driving API (Zero cost, no API keys).
   - **Weather**: [Open-Meteo API](https://open-meteo.com) (Free open-access hourly forecasts: wind speed at 10m, precipitation rate, and snowfall).
   - **Geocoding**: OpenStreetMap Nominatim with local hub caching.

4. **Exact Risk & Load Weight Vulnerability Engine**:
   - Classifies weather into 5 tiers: **Low**, **Moderate**, **High**, **Severe**, and **No Travel**.
   - Applies critical truck payload safety overrides:
     - $\ge 55\text{ mph}$ wind $\rightarrow$ **No Travel** for *any* load.
     - $45–54\text{ mph}$ wind $+ >30,000\text{ lb}$ load $\rightarrow$ **No Travel** (blowover hazard).
     - $35–44\text{ mph}$ wind $+ >40,000\text{ lb}$ load $\rightarrow$ **Severe** (crosswind steering hazard).

5. **4-Tier Route Recommendation Hierarchy**:
   - **Priority 1**: Fewest Severe miles (including No Travel miles)
   - **Priority 2**: Fewest High miles
   - **Priority 3**: Lowest average risk score
   - **Priority 4**: Shortest travel times

6. **Interactive Map & Corridor Weather Heatmap**:
   - Leaflet map rendering 3 routes, selected route highlighted in cyan, and circular checkpoint pins color-coded by severity.
   - Clickable checkpoint popups showing Mile Marker, ETA, Wind (mph), Rain (in/hr), Snow (in/hr), Temperature (°F), and active load warnings.
   - **0–48 Hour Forecast Scrubber Slider**: dynamic weather density heatmap along the trip corridor with automated animation playback and layer toggling (Risk, Wind, Rain, Snow).
   - Collapsible **Checkpoint Telemetry Log** table for turn-by-turn inspection.

---

## 📊 Weather Risk & Load Thresholds

### Base Condition Thresholds
| Condition | Low (1) | Moderate (2) | High (3) | Severe (4) | No Travel (5) |
|---|---|---|---|---|---|
| **Wind** | $<25\text{ mph}$ | $25–34\text{ mph}$ | $35–44\text{ mph}$ | $45–54\text{ mph}$ | $\ge 55\text{ mph}$ |
| **Rain** | $<0.10\text{ in/hr}$ | $0.10–0.25\text{ in/hr}$ | $0.25–0.50\text{ in/hr}$ | $0.50–1.00\text{ in/hr}$ | $>1.00\text{ in/hr}$ |
| **Snow** | $<0.5\text{ in/hr}$ | $0.5–1.0\text{ in/hr}$ | $1.0–2.0\text{ in/hr}$ | $2.0–3.0\text{ in/hr}$ | $>3.0\text{ in/hr}$ |

### Load Vulnerability Rules
- $\ge 55\text{ mph} \rightarrow$ **No Travel** for any load
- $45–54\text{ mph} + >30,000\text{ lb} \rightarrow$ **No Travel**
- $35–44\text{ mph} + >40,000\text{ lb} \rightarrow$ **Severe**

---

## 🛠️ Tech Stack & Directory Structure

```
spotter_ai_fullstackdev/
├── backend/                  # Django project configuration & settings
│   ├── settings.py           # CORS, REST Framework, Apps
│   └── urls.py               # API route routing
├── routing_core/             # Core routing and risk application
│   ├── services/
│   │   ├── geocoding_service.py # Nominatim OSM & freight hub caching
│   │   ├── routing_service.py   # OSRM 3-route generator with fallback
│   │   ├── sampling_service.py  # Equidistant 10/25/50 mi sampling & ETA
│   │   ├── weather_service.py   # Open-Meteo batch hourly forecast client
│   │   └── risk_engine.py       # Weather risk matrix, load rules, ranking
│   ├── views.py              # REST API endpoints
│   ├── urls.py               # API endpoint definitions
│   └── tests.py              # Comprehensive automated test suite
├── frontend/                 # React + Vite application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx           # App branding & status badges
│   │   │   ├── TripForm.jsx         # Inputs, weight slider, interval pills
│   │   │   ├── RouteComparison.jsx  # 3 route cards, recommendation banner
│   │   │   ├── TruckMap.jsx         # Leaflet map, pins, popups, heatmap
│   │   │   ├── ForecastSlider.jsx   # 0-48h forecast scrubber & play loop
│   │   │   └── CheckpointDrawer.jsx # Turn-by-turn checkpoint telemetry table
│   │   ├── App.jsx                  # Main dashboard controller
│   │   └── index.css                # Modern logistics telemetry dark theme
├── requirements.txt          # Python dependencies
├── start.bat                 # 1-click Windows runner
├── start.sh                  # 1-click Linux/macOS runner
└── README.md
```

---

## 🚀 Quickstart Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup
```bash
# From workspace root
python -m venv venv

# Activate venv:
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start backend server (port 8000)
python manage.py runserver 127.0.0.1:8000
```

### 2. Frontend Setup
```bash
# In a new terminal
cd frontend
npm install
npm run dev
```
Open **[http://127.0.0.1:5173/](http://127.0.0.1:5173/)** in your browser.

Or simply double-click `start.bat` on Windows!

---

## 🧪 Testing & Verification

The project includes unit and integration tests covering:
- Base wind, rain, and snow risk thresholds
- Truck payload rules ($\ge 55$ mph, $>30$k lbs, $>40$k lbs)
- Recommendation priority ordering (1. Fewest Severe miles, 2. Fewest High miles, 3. Lowest average risk, 4. Shortest travel time)
- Spatial sampling at 10, 25, 50 miles with ETA progression
- End-to-end API pipeline between Chicago, IL and Denver, CO

Run the test suite:
```bash
.\venv\Scripts\python manage.py test routing_core
```

Verify frontend bundle compilation:
```bash
cd frontend && npm run build
```