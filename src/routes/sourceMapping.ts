import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { CreateSourceMappingRequestSchema, type SourceMapping } from '../models/types.js';
import { dataStore } from '../models/store.js';
import { sourceMappingService } from '../services/sourceMapping.js';

const router = Router();

/**
 * POST /api/source-mapping
 * Create a new source mapping
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const parseResult = CreateSourceMappingRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
      return;
    }

    const mapping: SourceMapping = {
      id: randomUUID(),
      ...parseResult.data,
    };

    dataStore.addSourceMapping(mapping);

    res.status(201).json({
      success: true,
      mapping,
    });
  } catch (error) {
    console.error('Error creating source mapping:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/source-mapping
 * Get all source mappings
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const mappings = dataStore.getAllSourceMappings();

    res.json({
      success: true,
      mappings,
      count: mappings.length,
    });
  } catch (error) {
    console.error('Error fetching source mappings:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/source-mapping/channels
 * Get all available channels
 */
router.get('/channels', (req: Request, res: Response) => {
  try {
    const channels = sourceMappingService.getAvailableChannels();

    res.json({
      success: true,
      channels,
    });
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/source-mapping/:id
 * Get a specific source mapping
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mapping = dataStore.getSourceMapping(id);

    if (!mapping) {
      res.status(404).json({
        error: 'Not found',
        message: `Source mapping with id ${id} not found`,
      });
      return;
    }

    res.json({
      success: true,
      mapping,
    });
  } catch (error) {
    console.error('Error fetching source mapping:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/source-mapping/:id
 * Update a source mapping
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = CreateSourceMappingRequestSchema.partial().safeParse(req.body);
    
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
      return;
    }

    const updated = dataStore.updateSourceMapping(id, parseResult.data);

    if (!updated) {
      res.status(404).json({
        error: 'Not found',
        message: `Source mapping with id ${id} not found`,
      });
      return;
    }

    res.json({
      success: true,
      mapping: updated,
    });
  } catch (error) {
    console.error('Error updating source mapping:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/source-mapping/:id
 * Delete a source mapping
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = dataStore.deleteSourceMapping(id);

    if (!deleted) {
      res.status(404).json({
        error: 'Not found',
        message: `Source mapping with id ${id} not found`,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Source mapping deleted',
    });
  } catch (error) {
    console.error('Error deleting source mapping:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
