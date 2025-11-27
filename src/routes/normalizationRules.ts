import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { CreateNormalizationRuleRequestSchema, type NormalizationRule } from '../models/types.js';
import { dataStore } from '../models/store.js';

const router = Router();

/**
 * POST /api/normalization-rules
 * Create a new normalization rule
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const parseResult = CreateNormalizationRuleRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
      return;
    }

    const rule: NormalizationRule = {
      id: randomUUID(),
      ...parseResult.data,
    };

    dataStore.addNormalizationRule(rule);

    res.status(201).json({
      success: true,
      rule,
    });
  } catch (error) {
    console.error('Error creating normalization rule:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/normalization-rules
 * Get all normalization rules
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const rules = dataStore.getAllNormalizationRules();

    res.json({
      success: true,
      rules,
      count: rules.length,
    });
  } catch (error) {
    console.error('Error fetching normalization rules:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/normalization-rules/:id
 * Get a specific normalization rule
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rule = dataStore.getNormalizationRule(id);

    if (!rule) {
      res.status(404).json({
        error: 'Not found',
        message: `Normalization rule with id ${id} not found`,
      });
      return;
    }

    res.json({
      success: true,
      rule,
    });
  } catch (error) {
    console.error('Error fetching normalization rule:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/normalization-rules/:id
 * Update a normalization rule
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = CreateNormalizationRuleRequestSchema.partial().safeParse(req.body);
    
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
      return;
    }

    const updated = dataStore.updateNormalizationRule(id, parseResult.data);

    if (!updated) {
      res.status(404).json({
        error: 'Not found',
        message: `Normalization rule with id ${id} not found`,
      });
      return;
    }

    res.json({
      success: true,
      rule: updated,
    });
  } catch (error) {
    console.error('Error updating normalization rule:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/normalization-rules/:id
 * Delete a normalization rule
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = dataStore.deleteNormalizationRule(id);

    if (!deleted) {
      res.status(404).json({
        error: 'Not found',
        message: `Normalization rule with id ${id} not found`,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Normalization rule deleted',
    });
  } catch (error) {
    console.error('Error deleting normalization rule:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
