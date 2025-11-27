# HubSpot UTM Governance & CAC Engine

A HubSpot app that enforces UTM hygiene, auto-normalizes Source/Source Detail, calculates channel-level CAC & ROI, and pushes performance metrics into HubSpot dashboards.

## Features

- **UTM Hygiene Enforcement**: Validate and normalize UTM parameters to ensure data consistency
- **Source/Detail Mapping**: Automatically map UTM source/medium to standardized channels
- **CAC/ROI Calculations**: Real-time Customer Acquisition Cost and Return on Investment metrics
- **Multi-touch Attribution**: Support for first-touch, last-touch, linear, and time-decay models
- **HubSpot Integration**: Sync metrics to contact properties and display via CRM cards
- **Channel Cost Tracking**: Track marketing spend per channel for accurate ROI calculations

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- HubSpot developer account (for full integration)

### Installation

```bash
# Clone the repository
git clone https://github.com/inevitablesale/hubspot-utm-governance-cac-engine.git
cd hubspot-utm-governance-cac-engine

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Build the application
npm run build

# Start the server
npm start
```

### Development

```bash
# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Type checking
npm run lint
```

## API Endpoints

### UTM Data Ingestion

```
POST /api/utm
```

Ingest UTM data with automatic normalization and source mapping.

**Request Body:**
```json
{
  "contactId": "12345",
  "dealId": "67890",
  "params": {
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "summer_sale"
  },
  "revenue": 1000
}
```

### Normalization Rules

```
GET  /api/normalization-rules     # List all rules
POST /api/normalization-rules     # Create a new rule
PUT  /api/normalization-rules/:id # Update a rule
DELETE /api/normalization-rules/:id # Delete a rule
```

**Example Rule:**
```json
{
  "field": "utm_source",
  "matchType": "exact",
  "matchValue": "fb",
  "normalizedValue": "facebook",
  "priority": 10,
  "isActive": true
}
```

### Source Mapping

```
GET  /api/source-mapping          # List all mappings
POST /api/source-mapping          # Create a mapping
GET  /api/source-mapping/channels # Get available channels
```

**Example Mapping:**
```json
{
  "utmSource": "google",
  "utmMedium": "cpc",
  "source": "Google Ads",
  "sourceDetail": "Search",
  "channel": "Paid Search"
}
```

### Channel Costs

```
GET  /api/channel-costs           # List all costs
POST /api/channel-costs           # Add channel cost
POST /api/channel-costs/batch     # Batch add costs
```

**Example Cost:**
```json
{
  "channel": "Paid Search",
  "source": "Google Ads",
  "cost": 5000,
  "period": "monthly",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "currency": "USD"
}
```

### Metrics & Attribution

```
GET  /api/metrics                      # Overall metrics
GET  /api/metrics/channel/:channel     # Channel-specific metrics
GET  /api/metrics/contact/:contactId   # Contact metrics
POST /api/metrics/attribution          # Create attribution event
GET  /api/metrics/attribution/:contactId # Get contact attribution
```

**Create Attribution:**
```json
{
  "contactId": "12345",
  "dealId": "67890",
  "revenue": 5000,
  "model": "linear"
}
```

### CRM Card

```
GET /api/crm-card?associatedObjectId={contactId}&associatedObjectType=CONTACT
```

Returns formatted data for HubSpot CRM card display.

## HubSpot Integration

### Setting Up the CRM Card

1. Create a HubSpot developer account and app
2. Configure the CRM card in your app settings:
   - Target URL: `https://your-domain.com/api/crm-card`
   - Object types: Contacts
3. Add the required scopes to your app
4. Install the app in your HubSpot portal

### Required Scopes

- `crm.objects.contacts.read`
- `crm.objects.contacts.write`
- `crm.objects.deals.read`
- `crm.objects.deals.write`
- `timeline`

### Contact Properties Created

The app will create the following custom properties:

| Property | Description |
|----------|-------------|
| `utm_first_touch_source` | First touch source |
| `utm_first_touch_channel` | First touch channel |
| `utm_first_touch_campaign` | First touch campaign |
| `utm_first_touch_date` | First touch timestamp |
| `utm_last_touch_source` | Last touch source |
| `utm_last_touch_channel` | Last touch channel |
| `utm_last_touch_campaign` | Last touch campaign |
| `utm_last_touch_date` | Last touch timestamp |
| `total_touchpoints` | Number of marketing touchpoints |
| `attributed_revenue` | Revenue attributed to marketing |
| `attributed_cac` | Customer acquisition cost |

## Attribution Models

| Model | Description |
|-------|-------------|
| `first_touch` | 100% credit to first touchpoint |
| `last_touch` | 100% credit to last touchpoint |
| `linear` | Equal credit to all touchpoints |
| `time_decay` | More credit to recent touchpoints |

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `HUBSPOT_CLIENT_ID` | HubSpot OAuth client ID | For OAuth |
| `HUBSPOT_CLIENT_SECRET` | HubSpot OAuth client secret | For OAuth |
| `HUBSPOT_ACCESS_TOKEN` | HubSpot private app access token | For API |
| `BASE_URL` | Public URL for webhooks/OAuth | For HubSpot |

## Architecture

```
src/
├── index.ts              # Application entry point
├── models/
│   ├── types.ts          # Zod schemas and TypeScript types
│   └── store.ts          # In-memory data store
├── services/
│   ├── normalization.ts  # UTM normalization logic
│   ├── sourceMapping.ts  # Source/channel mapping
│   ├── metrics.ts        # CAC/ROI calculations
│   └── attribution.ts    # Multi-touch attribution
├── hubspot/
│   └── service.ts        # HubSpot API integration
└── routes/
    ├── utm.ts            # UTM ingestion endpoints
    ├── normalizationRules.ts
    ├── sourceMapping.ts
    ├── channelCosts.ts
    ├── metrics.ts
    └── crmCard.ts        # CRM card endpoint
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## License

ISC
