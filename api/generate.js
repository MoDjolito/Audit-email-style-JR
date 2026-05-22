const { createKlaviyoClient } = require("./lib/klaviyo-api");
const { generatePresentation } = require("./lib/generate-pptx");

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
  const { apiKey, month, client, author, features, benchmarks, nextSteps } = body;

  if (!apiKey || !String(apiKey).startsWith("pk_")) {
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
    const klaviyo = createKlaviyoClient(config);

    console.log(`[generate] ${config.CLIENT.name} — ${config.REPORT_MONTH}`);

    const campaigns = await klaviyo.getCampaigns();
    const flows = await klaviyo.getFlows();
    const deliverability = await klaviyo.getDeliverability();

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
