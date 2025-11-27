import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { dataStore } from './models/store.js';
import { hubspotService } from './hubspot/service.js';
import utmRoutes from './routes/utm.js';
import normalizationRulesRoutes from './routes/normalizationRules.js';
import sourceMappingRoutes from './routes/sourceMapping.js';
import channelCostsRoutes from './routes/channelCosts.js';
import metricsRoutes from './routes/metrics.js';
import crmCardRoutes from './routes/crmCard.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/utm', utmRoutes);
app.use('/api/normalization-rules', normalizationRulesRoutes);
app.use('/api/source-mapping', sourceMappingRoutes);
app.use('/api/channel-costs', channelCostsRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/crm-card', crmCardRoutes);

// HubSpot OAuth callback (placeholder for OAuth flow)
app.get('/oauth/callback', (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    res.status(400).json({ error: 'Missing authorization code' });
    return;
  }
  
  // In production, exchange code for access token
  // and initialize HubSpot service
  res.json({ 
    message: 'OAuth callback received. Implement token exchange in production.',
    code,
  });
});

// Initialize HubSpot if access token is provided
const hubspotAccessToken = process.env.HUBSPOT_ACCESS_TOKEN;
if (hubspotAccessToken) {
  hubspotService.initialize(hubspotAccessToken);
  console.log('HubSpot client initialized');
}

// Seed default data
dataStore.seedDefaults();
console.log('Default normalization rules and source mappings loaded');

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 HubSpot UTM Governance & CAC Engine running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 API endpoints:`);
  console.log(`   - POST /api/utm - Ingest UTM data`);
  console.log(`   - GET/POST /api/normalization-rules - Manage normalization rules`);
  console.log(`   - GET/POST /api/source-mapping - Manage source mappings`);
  console.log(`   - GET/POST /api/channel-costs - Manage channel costs`);
  console.log(`   - GET /api/metrics - Get CAC/ROI metrics`);
  console.log(`   - GET /api/crm-card - HubSpot CRM card endpoint`);
});

export default app;
