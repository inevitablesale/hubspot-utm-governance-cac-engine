import { z } from 'zod';

// UTM Parameters Schema
export const UTMParamsSchema = z.object({
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
});

export type UTMParams = z.infer<typeof UTMParamsSchema>;

// Normalized UTM Record with tracking data
export const UTMRecordSchema = z.object({
  id: z.string(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  originalParams: UTMParamsSchema,
  normalizedParams: UTMParamsSchema,
  source: z.string(),
  sourceDetail: z.string(),
  channel: z.string(),
  timestamp: z.string().datetime(),
  revenue: z.number().default(0),
});

export type UTMRecord = z.infer<typeof UTMRecordSchema>;

// Normalization Rule - defines how to clean/standardize UTM values
export const NormalizationRuleSchema = z.object({
  id: z.string(),
  field: z.enum(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']),
  matchType: z.enum(['exact', 'contains', 'regex', 'startsWith', 'endsWith']),
  matchValue: z.string(),
  normalizedValue: z.string(),
  priority: z.number().default(0),
  isActive: z.boolean().default(true),
});

export type NormalizationRule = z.infer<typeof NormalizationRuleSchema>;

// Source Mapping - maps UTM source/medium combinations to channels
export const SourceMappingSchema = z.object({
  id: z.string(),
  utmSource: z.string(),
  utmMedium: z.string().optional(),
  source: z.string(),
  sourceDetail: z.string(),
  channel: z.string(),
  priority: z.number().default(0),
  isActive: z.boolean().default(true),
});

export type SourceMapping = z.infer<typeof SourceMappingSchema>;

// Channel Cost Entry - tracks spend per channel over time
export const ChannelCostSchema = z.object({
  id: z.string(),
  channel: z.string(),
  source: z.string().optional(),
  sourceDetail: z.string().optional(),
  cost: z.number(),
  period: z.enum(['daily', 'weekly', 'monthly']),
  startDate: z.string(),
  endDate: z.string(),
  currency: z.string().default('USD'),
});

export type ChannelCost = z.infer<typeof ChannelCostSchema>;

// Attribution Event - when a conversion is attributed to a channel
export const AttributionEventSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  dealId: z.string().optional(),
  utmRecordId: z.string(),
  channel: z.string(),
  source: z.string(),
  sourceDetail: z.string(),
  attributionModel: z.enum(['first_touch', 'last_touch', 'linear', 'time_decay']),
  attributionWeight: z.number().min(0).max(1),
  revenue: z.number().default(0),
  timestamp: z.string().datetime(),
});

export type AttributionEvent = z.infer<typeof AttributionEventSchema>;

// CAC/ROI Metrics per channel
export const ChannelMetricsSchema = z.object({
  channel: z.string(),
  source: z.string().optional(),
  sourceDetail: z.string().optional(),
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
  totalCost: z.number(),
  totalRevenue: z.number(),
  conversions: z.number(),
  cac: z.number(), // Cost per Acquisition
  roi: z.number(), // Return on Investment percentage
  roas: z.number(), // Return on Ad Spend
});

export type ChannelMetrics = z.infer<typeof ChannelMetricsSchema>;

// CRM Card Data Response
export const CRMCardDataSchema = z.object({
  contactId: z.string(),
  touchpoints: z.array(z.object({
    channel: z.string(),
    source: z.string(),
    sourceDetail: z.string(),
    timestamp: z.string(),
    utmCampaign: z.string().optional(),
  })),
  channelMetrics: z.array(ChannelMetricsSchema),
  overallMetrics: z.object({
    totalCAC: z.number(),
    averageROI: z.number(),
    totalRevenue: z.number(),
    totalCost: z.number(),
  }),
});

export type CRMCardData = z.infer<typeof CRMCardDataSchema>;

// API Request/Response schemas
export const CreateNormalizationRuleRequestSchema = NormalizationRuleSchema.omit({ id: true });
export const CreateSourceMappingRequestSchema = SourceMappingSchema.omit({ id: true });
export const CreateChannelCostRequestSchema = ChannelCostSchema.omit({ id: true });
export const IngestUTMRequestSchema = z.object({
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  params: UTMParamsSchema,
  timestamp: z.string().datetime().optional(),
  revenue: z.number().optional(),
});

export type CreateNormalizationRuleRequest = z.infer<typeof CreateNormalizationRuleRequestSchema>;
export type CreateSourceMappingRequest = z.infer<typeof CreateSourceMappingRequestSchema>;
export type CreateChannelCostRequest = z.infer<typeof CreateChannelCostRequestSchema>;
export type IngestUTMRequest = z.infer<typeof IngestUTMRequestSchema>;
