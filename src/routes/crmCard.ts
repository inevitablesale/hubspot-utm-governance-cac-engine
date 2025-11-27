import { Router, Request, Response } from 'express';
import { hubspotService } from '../hubspot/service.js';
import { metricsService } from '../services/metrics.js';
import { dataStore } from '../models/store.js';

const router = Router();

/**
 * GET /api/crm-card
 * HubSpot CRM Card endpoint - returns formatted card data for display in HubSpot
 * 
 * Query params:
 * - associatedObjectId: The ID of the contact
 * - associatedObjectType: Should be "CONTACT"
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { associatedObjectId, associatedObjectType } = req.query;

    // Validate request
    if (!associatedObjectId || typeof associatedObjectId !== 'string') {
      res.status(400).json({
        error: 'Missing required parameter: associatedObjectId',
      });
      return;
    }

    if (associatedObjectType !== 'CONTACT') {
      res.status(400).json({
        error: 'CRM card only supports CONTACT object type',
      });
      return;
    }

    const contactId = associatedObjectId;
    
    // Get contact touchpoints and metrics
    const utmRecords = dataStore.getUTMRecordsByContact(contactId);
    const contactMetrics = metricsService.getContactMetrics(contactId);
    
    // Get date range for overall metrics (last 30 days)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const overallMetrics = metricsService.getOverallMetrics({ startDate, endDate });
    const channelMetrics = metricsService.getChannelMetrics({ startDate, endDate });

    // Format response according to HubSpot CRM Card specification
    // https://developers.hubspot.com/docs/api/crm/extensions/custom-cards
    const cardResponse = {
      results: [
        // Contact Attribution Summary
        {
          objectId: 1,
          title: 'Attribution Summary',
          properties: [
            {
              label: 'Total Touchpoints',
              dataType: 'NUMERIC',
              value: utmRecords.length,
            },
            {
              label: 'Attributed Revenue',
              dataType: 'CURRENCY',
              value: contactMetrics.attributedRevenue.toFixed(2),
              currencyCode: 'USD',
            },
            {
              label: 'Attributed CAC',
              dataType: 'CURRENCY',
              value: contactMetrics.attributedCAC.toFixed(2),
              currencyCode: 'USD',
            },
          ],
        },
        // First Touch Attribution
        ...(utmRecords.length > 0 ? [{
          objectId: 2,
          title: 'First Touch',
          properties: [
            {
              label: 'Channel',
              dataType: 'STRING',
              value: utmRecords[0].channel,
            },
            {
              label: 'Source',
              dataType: 'STRING',
              value: utmRecords[0].source,
            },
            {
              label: 'Campaign',
              dataType: 'STRING',
              value: utmRecords[0].normalizedParams.utm_campaign || 'N/A',
            },
            {
              label: 'Date',
              dataType: 'DATE',
              value: utmRecords[0].timestamp,
            },
          ],
        }] : []),
        // Last Touch Attribution
        ...(utmRecords.length > 1 ? [{
          objectId: 3,
          title: 'Last Touch',
          properties: [
            {
              label: 'Channel',
              dataType: 'STRING',
              value: utmRecords[utmRecords.length - 1].channel,
            },
            {
              label: 'Source',
              dataType: 'STRING',
              value: utmRecords[utmRecords.length - 1].source,
            },
            {
              label: 'Campaign',
              dataType: 'STRING',
              value: utmRecords[utmRecords.length - 1].normalizedParams.utm_campaign || 'N/A',
            },
            {
              label: 'Date',
              dataType: 'DATE',
              value: utmRecords[utmRecords.length - 1].timestamp,
            },
          ],
        }] : []),
        // Overall CAC/ROI Metrics
        {
          objectId: 4,
          title: 'Channel Performance (30 days)',
          properties: [
            {
              label: 'Overall CAC',
              dataType: 'CURRENCY',
              value: overallMetrics.totalCAC.toFixed(2),
              currencyCode: 'USD',
            },
            {
              label: 'Overall ROI',
              dataType: 'NUMERIC',
              value: `${overallMetrics.averageROI.toFixed(1)}%`,
            },
            {
              label: 'Total Revenue',
              dataType: 'CURRENCY',
              value: overallMetrics.totalRevenue.toFixed(2),
              currencyCode: 'USD',
            },
            {
              label: 'Total Spend',
              dataType: 'CURRENCY',
              value: overallMetrics.totalCost.toFixed(2),
              currencyCode: 'USD',
            },
          ],
        },
        // Top Performing Channels
        ...channelMetrics.slice(0, 3).map((cm, index) => ({
          objectId: 5 + index,
          title: `${cm.channel} Performance`,
          properties: [
            {
              label: 'CAC',
              dataType: 'CURRENCY',
              value: cm.cac.toFixed(2),
              currencyCode: 'USD',
            },
            {
              label: 'ROI',
              dataType: 'NUMERIC',
              value: `${cm.roi.toFixed(1)}%`,
            },
            {
              label: 'ROAS',
              dataType: 'NUMERIC',
              value: cm.roas.toFixed(2),
            },
            {
              label: 'Conversions',
              dataType: 'NUMERIC',
              value: cm.conversions,
            },
          ],
        })),
      ],
      primaryAction: {
        type: 'IFRAME',
        width: 890,
        height: 748,
        uri: `/api/crm-card/details?contactId=${contactId}`,
        label: 'View Full Attribution Details',
      },
    };

    res.json(cardResponse);
  } catch (error) {
    console.error('Error generating CRM card:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/crm-card/details
 * Returns detailed attribution data (for iframe display)
 */
router.get('/details', (req: Request, res: Response) => {
  try {
    const { contactId } = req.query;

    if (!contactId || typeof contactId !== 'string') {
      res.status(400).json({
        error: 'Missing required parameter: contactId',
      });
      return;
    }

    // Get comprehensive data
    const crmCardData = hubspotService.getCRMCardData(contactId);

    // Return HTML for iframe display
    const html = generateDetailsHTML(crmCardData);
    res.type('text/html').send(html);
  } catch (error) {
    console.error('Error generating CRM card details:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Generate HTML for detailed attribution view
 */
function generateDetailsHTML(data: ReturnType<typeof hubspotService.getCRMCardData>): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Attribution Details</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #f5f8fa; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { color: #33475b; margin-bottom: 20px; }
    h2 { color: #516f90; margin: 20px 0 10px; font-size: 16px; }
    .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
    .metric { text-align: center; padding: 15px; background: #f5f8fa; border-radius: 6px; }
    .metric-value { font-size: 24px; font-weight: bold; color: #00a4bd; }
    .metric-label { font-size: 12px; color: #516f90; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eaf0f6; }
    th { background: #f5f8fa; color: #516f90; font-weight: 600; }
    .channel-tag { display: inline-block; padding: 4px 8px; background: #e5f5f8; color: #00a4bd; border-radius: 4px; font-size: 12px; }
    .positive { color: #00bda5; }
    .negative { color: #f2545b; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Attribution Details</h1>
    
    <div class="card">
      <h2>Overall Performance (Last 30 Days)</h2>
      <div class="metrics-grid">
        <div class="metric">
          <div class="metric-value">$${data.overallMetrics.totalCAC.toFixed(2)}</div>
          <div class="metric-label">Customer Acquisition Cost</div>
        </div>
        <div class="metric">
          <div class="metric-value ${data.overallMetrics.averageROI >= 0 ? 'positive' : 'negative'}">${data.overallMetrics.averageROI.toFixed(1)}%</div>
          <div class="metric-label">Return on Investment</div>
        </div>
        <div class="metric">
          <div class="metric-value">$${data.overallMetrics.totalRevenue.toFixed(2)}</div>
          <div class="metric-label">Total Revenue</div>
        </div>
        <div class="metric">
          <div class="metric-value">$${data.overallMetrics.totalCost.toFixed(2)}</div>
          <div class="metric-label">Total Spend</div>
        </div>
      </div>
    </div>
    
    <div class="card">
      <h2>Touchpoint Journey (${data.touchpoints.length} touchpoints)</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Channel</th>
            <th>Source</th>
            <th>Campaign</th>
          </tr>
        </thead>
        <tbody>
          ${data.touchpoints.map(tp => `
            <tr>
              <td>${new Date(tp.timestamp).toLocaleDateString()}</td>
              <td><span class="channel-tag">${tp.channel}</span></td>
              <td>${tp.source}</td>
              <td>${tp.utmCampaign || '-'}</td>
            </tr>
          `).join('')}
          ${data.touchpoints.length === 0 ? '<tr><td colspan="4" style="text-align: center; color: #516f90;">No touchpoints recorded</td></tr>' : ''}
        </tbody>
      </table>
    </div>
    
    <div class="card">
      <h2>Channel Performance</h2>
      <table>
        <thead>
          <tr>
            <th>Channel</th>
            <th>CAC</th>
            <th>ROI</th>
            <th>ROAS</th>
            <th>Conversions</th>
          </tr>
        </thead>
        <tbody>
          ${data.channelMetrics.map(cm => `
            <tr>
              <td><span class="channel-tag">${cm.channel}</span></td>
              <td>$${cm.cac.toFixed(2)}</td>
              <td class="${cm.roi >= 0 ? 'positive' : 'negative'}">${cm.roi.toFixed(1)}%</td>
              <td>${cm.roas.toFixed(2)}x</td>
              <td>${cm.conversions}</td>
            </tr>
          `).join('')}
          ${data.channelMetrics.length === 0 ? '<tr><td colspan="5" style="text-align: center; color: #516f90;">No channel data available</td></tr>' : ''}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
  `;
}

export default router;
