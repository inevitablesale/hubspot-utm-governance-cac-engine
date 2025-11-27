import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { metricsService } from '../services/metrics.js';
import { attributionService, type AttributionModel } from '../services/attribution.js';

const router = Router();

/**
 * GET /api/metrics
 * Get overall metrics for a date range
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to last 30 days if not specified
    const end = typeof endDate === 'string' ? endDate : new Date().toISOString().split('T')[0];
    const start = typeof startDate === 'string' 
      ? startDate 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const overallMetrics = metricsService.getOverallMetrics({ startDate: start, endDate: end });
    const channelMetrics = metricsService.getChannelMetrics({ startDate: start, endDate: end });

    res.json({
      success: true,
      period: { startDate: start, endDate: end },
      overall: overallMetrics,
      channels: channelMetrics,
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/metrics/channel/:channel
 * Get metrics for a specific channel
 */
router.get('/channel/:channel', (req: Request, res: Response) => {
  try {
    const { channel } = req.params;
    const { startDate, endDate } = req.query;

    const end = typeof endDate === 'string' ? endDate : new Date().toISOString().split('T')[0];
    const start = typeof startDate === 'string' 
      ? startDate 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const options = { startDate: start, endDate: end, channel };

    res.json({
      success: true,
      channel,
      period: { startDate: start, endDate: end },
      metrics: {
        cac: metricsService.calculateCAC(options),
        roi: metricsService.calculateROI(options),
        roas: metricsService.calculateROAS(options),
      },
    });
  } catch (error) {
    console.error('Error fetching channel metrics:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/metrics/contact/:contactId
 * Get metrics for a specific contact
 */
router.get('/contact/:contactId', (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const contactMetrics = metricsService.getContactMetrics(contactId);

    res.json({
      success: true,
      contactId,
      ...contactMetrics,
    });
  } catch (error) {
    console.error('Error fetching contact metrics:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/metrics/attribution
 * Create attribution events for a conversion
 */
router.post('/attribution', (req: Request, res: Response) => {
  try {
    const AttributionRequestSchema = z.object({
      contactId: z.string(),
      dealId: z.string().optional(),
      revenue: z.number(),
      model: z.enum(['first_touch', 'last_touch', 'linear', 'time_decay']).default('last_touch'),
      timeDecayHalfLife: z.number().optional(),
    });

    const parseResult = AttributionRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
      return;
    }

    const { contactId, dealId, revenue, model, timeDecayHalfLife } = parseResult.data;

    const events = attributionService.createAttribution(
      contactId,
      dealId,
      revenue,
      { model: model as AttributionModel, timeDecayHalfLife }
    );

    res.status(201).json({
      success: true,
      events,
      count: events.length,
    });
  } catch (error) {
    console.error('Error creating attribution:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/metrics/attribution/:contactId
 * Get attribution events for a contact
 */
router.get('/attribution/:contactId', (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const events = attributionService.getContactAttribution(contactId);

    res.json({
      success: true,
      contactId,
      events,
      count: events.length,
    });
  } catch (error) {
    console.error('Error fetching attribution:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
