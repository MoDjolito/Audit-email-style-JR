// Klaviyo API client — factory function (stateless config, per-request cache)

function createKlaviyoClient(config) {
  const BASE_URL = "https://a.klaviyo.com/api";
  const HEADERS = {
    Authorization: `Klaviyo-API-Key ${config.KLAVIYO_API_KEY}`,
    revision: config.KLAVIYO_API_REVISION || "2024-10-15",
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
  };

  let metricsCache = null;
  const reportCache = { campaign: {}, flow: {} };

  // ---- Helpers ----

  async function klaviyoPost(endpoint, body, attempt = 0) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(body),
    });
    if (res.status === 429 && attempt < 4) {
      const text = await res.text();
      const match = text.match(/available in (\d+)/);
      const waitSec = match ? Math.min(parseInt(match[1], 10) + 2, 60) : 30;
      console.log(`  Rate limited, retry dans ${waitSec}s...`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      return klaviyoPost(endpoint, body, attempt + 1);
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Klaviyo POST ${endpoint} failed (${res.status}): ${text}`);
    }
    return res.json();
  }

  async function klaviyoGetAll(endpoint, params = {}) {
    let allData = [];
    const urlObj = new URL(`${BASE_URL}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => urlObj.searchParams.append(k, v));
    let url = urlObj.toString();

    while (url) {
      const res = await fetch(url, { method: "GET", headers: HEADERS });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Klaviyo GET failed (${res.status}): ${body}`);
      }
      const json = await res.json();
      allData = allData.concat(json.data || []);
      url = json.links?.next || null;
    }
    return allData;
  }

  // ---- Dates du mois ----

  function getMonthRange(monthStr) {
    const [year, month] = monthStr.split("-").map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    return {
      start: start.toISOString().replace("Z", "+00:00"),
      end: end.toISOString().replace("Z", "+00:00"),
      startDate: start,
      endDate: end,
    };
  }

  // ---- Cache des metric IDs ----

  async function loadAllMetrics() {
    if (metricsCache) return metricsCache;
    console.log("  Chargement des metriques...");
    metricsCache = await klaviyoGetAll("/metrics");
    console.log(`  ${metricsCache.length} metriques trouvees`);
    return metricsCache;
  }

  async function getMetricId(metricName, integrationName = null) {
    const all = await loadAllMetrics();
    let match;
    if (integrationName) {
      match = all.find(
        (m) =>
          m.attributes?.name === metricName &&
          m.attributes?.integration?.name === integrationName
      );
    } else {
      match = all.find((m) => m.attributes?.name === metricName);
    }
    if (!match) {
      const desc = integrationName ? `"${metricName}" (${integrationName})` : `"${metricName}"`;
      throw new Error(`Metrique ${desc} non trouvee dans Klaviyo`);
    }
    return match.id;
  }

  async function detectIntegration() {
    const all = await loadAllMetrics();
    const candidates = ["Shopify", "WooCommerce", "BigCommerce", "Magento", "Stripe"];
    const found = [];
    for (const intName of candidates) {
      const m = all.find(
        (x) => x.attributes?.name === "Placed Order" && x.attributes?.integration?.name === intName
      );
      if (m) found.push({ name: intName, id: m.id, metric: m });
    }
    if (found.length === 0) {
      const m = all.find((x) => x.attributes?.name === "Placed Order");
      if (m) return { name: m.attributes?.integration?.name || "Custom", id: m.id, metric: m };
      return null;
    }
    return found;
  }

  async function getConversionMetricId() {
    if (config.CLIENT.integration) {
      try {
        const id = await getMetricId("Placed Order", config.CLIENT.integration);
        console.log(`  Metrique de conversion: Placed Order (${config.CLIENT.integration}) [${id}]`);
        return id;
      } catch (e) {
        console.warn(`  Override "${config.CLIENT.integration}" non trouve, fallback auto-detection...`);
      }
    }

    const found = await detectIntegration();
    if (!found) {
      throw new Error("Aucune metrique 'Placed Order' trouvee dans Klaviyo. Verifiez votre integration e-commerce.");
    }

    const choice = Array.isArray(found) ? found[0] : found;
    console.log(`  Integration detectee: ${choice.name}`);
    console.log(`  Metrique de conversion: Placed Order (${choice.name}) [${choice.id}]`);
    if (Array.isArray(found) && found.length > 1) {
      console.log(`  (Autres disponibles: ${found.slice(1).map((f) => f.name).join(", ")})`);
    }
    return choice.id;
  }

  // ---- Statistiques ----

  const CAMPAIGN_STATISTICS = [
    "recipients", "delivered", "delivery_rate",
    "opens", "opens_unique", "open_rate",
    "clicks", "clicks_unique", "click_rate",
    "conversions", "conversion_value", "conversion_rate", "revenue_per_recipient",
    "bounced", "bounce_rate",
    "unsubscribes", "unsubscribe_rate",
    "spam_complaints", "spam_complaint_rate",
  ];

  const FLOW_STATISTICS = [
    "recipients", "delivered", "delivery_rate",
    "opens", "opens_unique", "open_rate",
    "clicks", "clicks_unique", "click_rate",
    "conversions", "conversion_value", "conversion_rate", "revenue_per_recipient",
    "bounced", "bounce_rate",
    "unsubscribes", "unsubscribe_rate",
    "spam_complaints", "spam_complaint_rate",
  ];

  async function getCampaignValuesReport(range, conversionMetricId) {
    const key = `${range.start}|${range.end}|${conversionMetricId}`;
    if (reportCache.campaign[key]) return reportCache.campaign[key];
    const body = {
      data: {
        type: "campaign-values-report",
        attributes: {
          statistics: CAMPAIGN_STATISTICS,
          timeframe: { start: range.start, end: range.end },
          conversion_metric_id: conversionMetricId,
        },
      },
    };
    const res = await klaviyoPost("/campaign-values-reports", body);
    const results = res.data?.attributes?.results || [];
    reportCache.campaign[key] = results;
    return results;
  }

  async function getFlowValuesReport(range, conversionMetricId) {
    const key = `${range.start}|${range.end}|${conversionMetricId}`;
    if (reportCache.flow[key]) return reportCache.flow[key];
    const body = {
      data: {
        type: "flow-values-report",
        attributes: {
          statistics: FLOW_STATISTICS,
          timeframe: { start: range.start, end: range.end },
          conversion_metric_id: conversionMetricId,
        },
      },
    };
    const res = await klaviyoPost("/flow-values-reports", body);
    const results = res.data?.attributes?.results || [];
    reportCache.flow[key] = results;
    return results;
  }

  // ============================================================
  // 1. CAMPAGNES
  // ============================================================

  async function getCampaigns() {
    const range = getMonthRange(config.REPORT_MONTH);
    const prevRange = getMonthRange(config.PREVIOUS_MONTH);

    console.log(`  Recuperation des campagnes pour ${config.REPORT_MONTH}...`);

    const allCampaigns = await klaviyoGetAll("/campaigns", {
      filter: `and(equals(messages.channel,'email'),equals(status,'Sent'),equals(archived,false))`,
      sort: "-scheduled_at",
    });

    const filterByMonth = (campaigns, r) =>
      campaigns.filter((c) => {
        const sendTime = c.attributes?.send_time || c.attributes?.scheduled_at;
        if (!sendTime) return false;
        const d = new Date(sendTime);
        return d >= r.startDate && d < r.endDate;
      });

    const monthlyCampaigns = filterByMonth(allCampaigns, range);
    const prevCampaigns = filterByMonth(allCampaigns, prevRange);

    console.log(`  ${monthlyCampaigns.length} campagnes (vs ${prevCampaigns.length} le mois precedent)`);

    const placedOrderId = await getConversionMetricId();
    const currentReport = await getCampaignValuesReport(range, placedOrderId);
    const previousReport = await getCampaignValuesReport(prevRange, placedOrderId);

    const indexById = (results) => {
      const map = {};
      for (const r of results) {
        const id = r.groupings?.campaign_id;
        if (id) map[id] = r.statistics || {};
      }
      return map;
    };
    const currentStatsById = indexById(currentReport);
    const previousStatsById = indexById(previousReport);

    const campaignsWithStats = monthlyCampaigns.map((c) => {
      const stats = currentStatsById[c.id] || {};
      return {
        id: c.id,
        name: c.attributes?.name || "Sans nom",
        sendDate: c.attributes?.send_time || c.attributes?.scheduled_at,
        recipients: stats.recipients || 0,
        delivered: stats.delivered || 0,
        opens: stats.opens || 0,
        opensUnique: stats.opens_unique || 0,
        clicks: stats.clicks || 0,
        clicksUnique: stats.clicks_unique || 0,
        conversions: stats.conversions || 0,
        revenue: stats.conversion_value || 0,
        openRate: (stats.open_rate || 0) * 100,
        clickRate: (stats.click_rate || 0) * 100,
        conversionRate: (stats.conversion_rate || 0) * 100,
        revenuePerRecipient: stats.revenue_per_recipient || 0,
        bounceRate: (stats.bounce_rate || 0) * 100,
        unsubRate: (stats.unsubscribe_rate || 0) * 100,
        spamRate: (stats.spam_complaint_rate || 0) * 100,
        deliveryRate: (stats.delivery_rate || 0) * 100,
      };
    });

    let prevTotalRecipients = 0, prevTotalRevenue = 0;
    for (const c of prevCampaigns) {
      const s = previousStatsById[c.id] || {};
      prevTotalRecipients += s.recipients || 0;
      prevTotalRevenue += s.conversion_value || 0;
    }

    return {
      current: campaignsWithStats,
      previous: { count: prevCampaigns.length, totalRecipients: prevTotalRecipients, totalRevenue: prevTotalRevenue },
    };
  }

  // ============================================================
  // 2. FLOWS
  // ============================================================

  async function getFlows() {
    console.log(`  Recuperation des flows...`);

    const allFlows = await klaviyoGetAll("/flows", { filter: "equals(archived,false)" });
    console.log(`  ${allFlows.length} flows non archives trouves`);

    const range = getMonthRange(config.REPORT_MONTH);
    const prevRange = getMonthRange(config.PREVIOUS_MONTH);
    const placedOrderId = await getConversionMetricId();

    const currentReport = await getFlowValuesReport(range, placedOrderId);
    const previousReport = await getFlowValuesReport(prevRange, placedOrderId);

    const indexByFlowId = (results) => {
      const map = {};
      for (const r of results) {
        const id = r.groupings?.flow_id;
        if (!id) continue;
        const stats = r.statistics || {};
        if (!map[id]) {
          map[id] = { recipients: 0, delivered: 0, opens: 0, opensUnique: 0, clicks: 0, clicksUnique: 0, conversions: 0, revenue: 0, bounced: 0, unsubscribes: 0, spam: 0 };
        }
        map[id].recipients += stats.recipients || 0;
        map[id].delivered += stats.delivered || 0;
        map[id].opens += stats.opens || 0;
        map[id].opensUnique += stats.opens_unique || 0;
        map[id].clicks += stats.clicks || 0;
        map[id].clicksUnique += stats.clicks_unique || 0;
        map[id].conversions += stats.conversions || 0;
        map[id].revenue += stats.conversion_value || 0;
        map[id].bounced += stats.bounced || 0;
        map[id].unsubscribes += stats.unsubscribes || 0;
        map[id].spam += stats.spam_complaints || 0;
      }
      for (const id of Object.keys(map)) {
        const s = map[id];
        s.openRate = s.delivered > 0 ? (s.opensUnique / s.delivered) * 100 : 0;
        s.clickRate = s.delivered > 0 ? (s.clicksUnique / s.delivered) * 100 : 0;
        s.conversionRate = s.recipients > 0 ? (s.conversions / s.recipients) * 100 : 0;
        s.bounceRate = s.recipients > 0 ? (s.bounced / s.recipients) * 100 : 0;
        s.unsubRate = s.delivered > 0 ? (s.unsubscribes / s.delivered) * 100 : 0;
        s.spamRate = s.delivered > 0 ? (s.spam / s.delivered) * 100 : 0;
        s.revenuePerRecipient = s.recipients > 0 ? s.revenue / s.recipients : 0;
      }
      return map;
    };

    const currentStatsByFlow = indexByFlowId(currentReport);
    const previousStatsByFlow = indexByFlowId(previousReport);

    const empty = { recipients: 0, delivered: 0, opens: 0, opensUnique: 0, clicks: 0, clicksUnique: 0, conversions: 0, revenue: 0, openRate: 0, clickRate: 0, conversionRate: 0, bounceRate: 0, unsubRate: 0, spamRate: 0, revenuePerRecipient: 0 };

    return allFlows.map((flow) => ({
      id: flow.id,
      name: flow.attributes?.name || "Sans nom",
      status: flow.attributes?.status || "unknown",
      current: currentStatsByFlow[flow.id] || { ...empty },
      previous: previousStatsByFlow[flow.id] || { ...empty },
    }));
  }

  // ============================================================
  // 3. DELIVRABILITE
  // ============================================================

  async function getDeliverability() {
    console.log(`  Calcul de la delivrabilite...`);

    const range = getMonthRange(config.REPORT_MONTH);
    const prevRange = getMonthRange(config.PREVIOUS_MONTH);
    const placedOrderId = await getConversionMetricId();

    async function getMonthMetrics(monthRange) {
      const [campaignReport, flowReport] = await Promise.all([
        getCampaignValuesReport(monthRange, placedOrderId),
        getFlowValuesReport(monthRange, placedOrderId),
      ]);
      const all = [...campaignReport, ...flowReport];
      const totals = { delivered: 0, opened: 0, openedUnique: 0, clicked: 0, clickedUnique: 0, bounced: 0, spam: 0, unsubscribed: 0, conversions: 0, revenue: 0 };
      for (const r of all) {
        const s = r.statistics || {};
        totals.delivered += s.delivered || 0;
        totals.opened += s.opens || 0;
        totals.openedUnique += s.opens_unique || 0;
        totals.clicked += s.clicks || 0;
        totals.clickedUnique += s.clicks_unique || 0;
        totals.bounced += s.bounced || 0;
        totals.spam += s.spam_complaints || 0;
        totals.unsubscribed += s.unsubscribes || 0;
        totals.conversions += s.conversions || 0;
        totals.revenue += s.conversion_value || 0;
      }
      return totals;
    }

    const current = await getMonthMetrics(range);
    const previous = await getMonthMetrics(prevRange);

    const calc = (data) => ({
      ...data,
      openRate: data.delivered > 0 ? (data.openedUnique / data.delivered) * 100 : 0,
      clickRate: data.delivered > 0 ? (data.clickedUnique / data.delivered) * 100 : 0,
      bounceRate: data.delivered > 0 ? (data.bounced / data.delivered) * 100 : 0,
      spamRate: data.delivered > 0 ? (data.spam / data.delivered) * 100 : 0,
      unsubRate: data.delivered > 0 ? (data.unsubscribed / data.delivered) * 100 : 0,
    });

    return { current: calc(current), previous: calc(previous) };
  }

  return { getCampaigns, getFlows, getDeliverability, getMetricId };
}

module.exports = { createKlaviyoClient };
