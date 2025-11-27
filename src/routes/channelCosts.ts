import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { CreateChannelCostRequestSchema, type ChannelCost } from '../models/types.js';
import { dataStore } from '../models/store.js';

const router = Router();

/**
 * POST /api/channel-costs
 * Create a new channel cost entry
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const parseResult = CreateChannelCostRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
      return;
    }

    const cost: ChannelCost = {
      id: randomUUID(),
      ...parseResult.data,
    };

    dataStore.addChannelCost(cost);

    res.status(201).json({
      success: true,
      cost,
    });
  } catch (error) {
    console.error('Error creating channel cost:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/channel-costs
 * Get all channel costs
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { channel, startDate, endDate } = req.query;

    let costs: ChannelCost[];

    if (typeof channel === 'string') {
      costs = dataStore.getChannelCostsByChannel(channel);
    } else if (typeof startDate === 'string' && typeof endDate === 'string') {
      costs = dataStore.getChannelCostsInRange(startDate, endDate);
    } else {
      costs = dataStore.getAllChannelCosts();
    }

    res.json({
      success: true,
      costs,
      count: costs.length,
    });
  } catch (error) {
    console.error('Error fetching channel costs:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/channel-costs/:id
 * Get a specific channel cost entry
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cost = dataStore.getChannelCost(id);

    if (!cost) {
      res.status(404).json({
        error: 'Not found',
        message: `Channel cost with id ${id} not found`,
      });
      return;
    }

    res.json({
      success: true,
      cost,
    });
  } catch (error) {
    console.error('Error fetching channel cost:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/channel-costs/:id
 * Update a channel cost entry
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = CreateChannelCostRequestSchema.partial().safeParse(req.body);
    
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
      return;
    }

    const updated = dataStore.updateChannelCost(id, parseResult.data);

    if (!updated) {
      res.status(404).json({
        error: 'Not found',
        message: `Channel cost with id ${id} not found`,
      });
      return;
    }

    res.json({
      success: true,
      cost: updated,
    });
  } catch (error) {
    console.error('Error updating channel cost:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/channel-costs/:id
 * Delete a channel cost entry
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = dataStore.deleteChannelCost(id);

    if (!deleted) {
      res.status(404).json({
        error: 'Not found',
        message: `Channel cost with id ${id} not found`,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Channel cost deleted',
    });
  } catch (error) {
    console.error('Error deleting channel cost:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/channel-costs/batch
 * Create multiple channel cost entries
 */
router.post('/batch', (req: Request, res: Response) => {
  try {
    const BatchRequestSchema = z.object({
      costs: z.array(CreateChannelCostRequestSchema),
    });

    const parseResult = BatchRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
      return;
    }

    const results: ChannelCost[] = [];

    for (const costData of parseResult.data.costs) {
      const cost: ChannelCost = {
        id: randomUUID(),
        ...costData,
      };
      dataStore.addChannelCost(cost);
      results.push(cost);
    }

    res.status(201).json({
      success: true,
      costs: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Error batch creating channel costs:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
