const { createKlaviyoClient } = require("./lib/klaviyo-api");
const { generatePresentation } = require("./lib/generate-pptx");

function normalizeManualData(manualData) {
  const campaigns = (manualData.campaigns || []).map((c, idx) => {
    const recipients = parseInt(c.recipients) || 0;
    const openRate = parseFloat(c.openRate) || 0;
    const clickRate = parseFloat(c.clickRate) || 0;
    const conversions = parseInt(c.conversions) || 0;
    const revenue = parseFloat(c.revenue) || 0;
    return {
      id: "manual-" + idx,
      name: c.name || "Campagne " + (idx + 1),
      sendDate: c.date || null,
      recipients,
      delivered: recipients,
      opens: Math.round(recipients * openRate / 100),
      opensUnique: Math.round(recipients * openRate / 100),
      clicks: Math.round(recipients * clickRate / 100),
      clicksUnique: Math.round(recipients * clickRate / 100),
      conversions,
      revenue,
      openRate,
      clickRate,
      conversionRate: recipients > 0 ? (conversions / recipients) * 100 : 0,
      revenuePerRecipient: recipients > 0 ? revenue / recipients : 0,
      bounceRate: 0, unsubRate: 0, spamRate: 0, deliveryRate: 100,
    };
  });

  const prevC = manualData.previousCampaigns || {};

  const flows = (manualData.flows || []).map((f, idx) => {
    const recipients = parseInt(f.recipients) || 0;
    const openRate = parseFloat(f.openRate) || 0;
    const conversions = parseInt(f.conversions) || 0;
    const revenue = parseFloat(f.revenue) || 0;
    const prevRevenue = parseFloat(f.prevRevenue) || 0;
    return {
      id: "manual-flow-" + idx,
      name: f.name || "Séquence " + (idx + 1),
      status: "live",
      current: {
        recipients, delivered: recipients,
        opens: Math.round(recipients * openRate / 100),
        opensUnique: Math.round(recipients * openRate / 100),
        clicks: 0, clicksUnique: 0,
        conversions, revenue, openRate, clickRate: 0,
        conversionRate: recipients > 0 ? (conversions / recipients) * 100 : 0,
        bounceRate: 0, unsubRate: 0, spamRate: 0,
        revenuePerRecipient: recipients > 0 ? revenue / recipients : 0,
      },
      previous: {
        recipients: 0, delivered: 0, opens: 0, opensUnique: 0, clicks: 0, clicksUnique: 0,
        conversions: 0, revenue: prevRevenue, openRate: 0, clickRate: 0, conversionRate: 0,
        bounceRate: 0, unsubRate: 0, spamRate: 0, revenuePerRecipient: 0,
      },
    };
  });

  const d = manualData.deliverability || {};
  const pd = manualData.previousDeliverability || {};

  const makeDeliv = (src) => ({
    delivered: parseInt(src.delivered) || 0,
    openRate: parseFloat(src.openRate) || 0,
    clickRate: parseFloat(src.clickRate) || 0,
    bounceRate: parseFloat(src.bounceRate) || 0,
    spamRate: parseFloat(src.spamRate) || 0,
    unsubRate: parseFloat(src.unsubRate) || 0,
    openedUnique: 0, clickedUnique: 0, bounced: 0, spam: 0, unsubscribed: 0, conversions: 0, revenue: 0,
  });

  return {
    campaigns: {
      current: campaigns,
      previous: {
        count: parseInt(prevC.count) || 0,
        totalRecipients: 0,
        totalRevenue: parseFloat(prevC.totalRevenue) || 0,
      },
    },
    flows,
    deliverability: { current: makeDeliv(d), previous: makeDeliv(pd) },
  };
}

const MONTH_NAMES_ACC = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

function defaultMonth() {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

function buildConfig({ apiKey, month, client, author, features, benchmarks, nextSteps }) {
  const REPORT_MONTH = month || defaultMonth();

  const config = {
    KLAVIYO_API_KEY: apiKey,
    KLAVIYO_API_REVISION: "2024-10-15",
    REPORT_MONTH,
    CLIENT: {
      name: client?.name || "CLIENT",
      tagline: client?.tagline || "",
      currency: client?.currency || "€",
      integration: client?.integration || null,
    },
    AUTHOR: {
      name: author?.name || "Consultant",
      company: author?.company || "",
      email: author?.email || "",
    },
    FEATURES: {
      topFlopHighlight: true,
      industryBenchmarks: true,
      autoInsights: true,
      ...(features || {}),
    },
    BENCHMARKS: benchmarks || {
      openRate: 39.6,
      clickRate: 1.4,
      bounceRate: 0.5,
      spamRate: 0.02,
      unsubRate: 0.20,
    },
    NEXT_STEPS: nextSteps || null,
  };

  Object.defineProperty(config, "PREVIOUS_MONTH", {
    get() {
      const [y, m] = this.REPORT_MONTH.split("-").map(Number);
      const prev = new Date(y, m - 2, 1);
      return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
    },
  });

  Object.defineProperty(config, "MONTH_LABEL", {
    get() {
      const [y, m] = this.REPORT_MONTH.split("-").map(Number);
      return MONTH_NAMES_ACC[m - 1] + " " + y;
    },
  });

  Object.defineProperty(config, "PREV_MONTH_LABEL", {
    get() {
      const [y, m] = this.PREVIOUS_MONTH.split("-").map(Number);
      return MONTH_NAMES_ACC[m - 1] + " " + y;
    },
  });

  return config;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const body = req.body || {};
  const { mode, apiKey, month, client, author, features, benchmarks, nextSteps, manualData } = body;
  const isManual = mode === "manual";

  if (!isManual && (!apiKey || !String(apiKey).startsWith("pk_"))) {
    return res.status(400).json({ error: "Clé API Klaviyo invalide (doit commencer par pk_)" });
  }

  const REPORT_MONTH = month || defaultMonth();
  if (!/^\d{4}-\d{2}$/.test(REPORT_MONTH)) {
    return res.status(400).json({ error: `Mois invalide : ${REPORT_MONTH} (format attendu : YYYY-MM)` });
  }

  if (!client?.name) {
    return res.status(400).json({ error: "Le nom du client est requis" });
  }

  const config = buildConfig({ apiKey, month: REPORT_MONTH, client, author, features, benchmarks, nextSteps });

  try {
    let campaigns, flows, deliverability;

    if (isManual) {
      if (!manualData) {
        return res.status(400).json({ error: "Données manuelles manquantes" });
      }
      console.log(`[generate:manual] ${config.CLIENT.name} — ${config.REPORT_MONTH}`);
      ({ campaigns, flows, deliverability } = normalizeManualData(manualData));
    } else {
      const klaviyo = createKlaviyoClient(config);
      console.log(`[generate:api] ${config.CLIENT.name} — ${config.REPORT_MONTH}`);
      campaigns = await klaviyo.getCampaigns();
      flows = await klaviyo.getFlows();
      deliverability = await klaviyo.getDeliverability();
    }

    const buffer = await generatePresentation({ campaigns, flows, deliverability, config });

    const fileName = [
      "Rapport Mission",
      config.CLIENT.name,
      config.MONTH_LABEL,
      config.AUTHOR.company ? "- " + config.AUTHOR.company : "",
    ].filter(Boolean).join(" ") + ".pptx";

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader("Content-Length", String(buffer.length));
    return res.status(200).send(buffer);

  } catch (err) {
    console.error("[generate] Erreur:", err.message);
    let message = err.message;
    if (message.includes("401")) message = "Clé API invalide ou expirée — vérifiez votre clé Klaviyo";
    else if (message.includes("429")) message = "Limite de requêtes Klaviyo atteinte — réessayez dans quelques minutes";
    else if (message.includes("Placed Order")) message = "Aucune métrique e-commerce trouvée — vérifiez votre intégration Shopify/WooCommerce";
    return res.status(500).json({ error: message });
  }
};
