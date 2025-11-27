import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { IngestUTMRequestSchema, type UTMRecord } from '../models/types.js';
import { dataStore } from '../models/store.js';
import { normalizationService } from '../services/normalization.js';
import { sourceMappingService } from '../services/sourceMapping.js';
import { hubspotService } from '../hubspot/service.js';

const router = Router();

/**
 * POST /api/utm
 * Ingest a UTM record, normalize it, and map to source/channel
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const parseResult = IngestUTMRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
      return;
    }

    const { contactId, dealId, params, timestamp, revenue } = parseResult.data;

    // Validate UTM parameters
    const validation = normalizationService.validateParams(params);
    if (!validation.isValid) {
      // Log issues but continue processing
      console.warn('UTM validation issues:', validation.issues);
    }

    // Normalize UTM parameters
    const normalizedParams = normalizationService.normalize(params);

    // Map to source/channel
    const mapping = sourceMappingService.mapToSource(normalizedParams);

    // Create UTM record
    const record: UTMRecord = {
      id: randomUUID(),
      contactId,
      dealId,
      originalParams: params,
      normalizedParams,
      source: mapping.source,
      sourceDetail: mapping.sourceDetail,
      channel: mapping.channel,
      timestamp: timestamp || new Date().toISOString(),
      revenue: revenue || 0,
    };

    // Store the record
    dataStore.addUTMRecord(record);

    // Try to sync to HubSpot if initialized and contactId provided
    if (hubspotService.isInitialized() && contactId) {
      try {
        await hubspotService.syncContactProperties(contactId);
      } catch (error) {
        console.error('Failed to sync to HubSpot:', error);
      }
    }

    res.status(201).json({
      success: true,
      record,
      validation: validation.issues.length > 0 ? validation : undefined,
    });
  } catch (error) {
    console.error('Error ingesting UTM:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/utm
 * Get all UTM records
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { contactId, channel } = req.query;

    let records = dataStore.getAllUTMRecords();

    if (typeof contactId === 'string') {
      records = dataStore.getUTMRecordsByContact(contactId);
    } else if (typeof channel === 'string') {
      records = dataStore.getUTMRecordsByChannel(channel);
    }

    res.json({
      success: true,
      records,
      count: records.length,
    });
  } catch (error) {
    console.error('Error fetching UTM records:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/utm/:id
 * Get a specific UTM record
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const record = dataStore.getUTMRecord(id);

    if (!record) {
      res.status(404).json({
        error: 'Not found',
        message: `UTM record with id ${id} not found`,
      });
      return;
    }

    res.json({
      success: true,
      record,
    });
  } catch (error) {
    console.error('Error fetching UTM record:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/utm/batch
 * Ingest multiple UTM records at once
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const BatchRequestSchema = z.object({
      records: z.array(IngestUTMRequestSchema),
    });

    const parseResult = BatchRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
      return;
    }

    const results: UTMRecord[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < parseResult.data.records.length; i++) {
      const { contactId, dealId, params, timestamp, revenue } = parseResult.data.records[i];

      try {
        const normalizedParams = normalizationService.normalize(params);
        const mapping = sourceMappingService.mapToSource(normalizedParams);

        const record: UTMRecord = {
          id: randomUUID(),
          contactId,
          dealId,
          originalParams: params,
          normalizedParams,
          source: mapping.source,
          sourceDetail: mapping.sourceDetail,
          channel: mapping.channel,
          timestamp: timestamp || new Date().toISOString(),
          revenue: revenue || 0,
        };

        dataStore.addUTMRecord(record);
        results.push(record);
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.status(201).json({
      success: true,
      records: results,
      count: results.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error batch ingesting UTM:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
