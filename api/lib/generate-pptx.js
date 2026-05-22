// Générateur PPTX — Template Renard Publishing (noir/or)
// Retourne un Buffer Node.js (pour envoi HTTP) au lieu d'écrire sur disque.

const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const {
  FaStar, FaEnvelopeOpenText, FaMousePointer, FaShoppingCart, FaPercent,
} = require("react-icons/fa");

let sharp;
try {
  sharp = require("sharp");
} catch (_) {
  sharp = null;
}

// ---- Icon rendering ----

function renderIconSvg(IconComponent, color = "#000000", size = 256) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComponent, { color, size: String(size) })
  );
}

async function iconToBase64Png(IconComponent, color, size = 256) {
  if (!sharp) return null;
  try {
    const svg = renderIconSvg(IconComponent, color, size);
    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
    return "image/png;base64," + pngBuffer.toString("base64");
  } catch (_) {
    return null;
  }
}

// ---- DA Renard Publishing ----

const COLORS = {
  navy: "1E1C19",
  darkBlue: "252320",
  slate: "333028",
  accent: "BF995A",
  accentLight: "D6B478",
  accentDark: "A07D3F",
  white: "ECE9E3",
  medGray: "7C796F",
  textLight: "ECE9E3",
  red: "C45C4A",
  altRow: "29271F",
};

const makeShadow = () => ({ type: "outer", blur: 8, offset: 2, angle: 135, color: "000000", opacity: 0.12 });

// ---- Formatage ----

function fmt(n, decimals = 0) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return Number(n).toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtCurrency(n, currency = "€") {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return fmt(n, n % 1 !== 0 ? 1 : 0) + " " + currency;
}

function fmtPercent(n, decimals = 1) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return fmt(n, decimals) + "%";
}

function pctChange(current, previous) {
  if (!previous || previous === 0) return current > 0 ? "+100%" : "—";
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return (change >= 0 ? "+" : "") + fmt(change, 1) + "%";
}

function trendColor(current, previous, inverse = false) {
  if (!previous || previous === 0) return COLORS.accent;
  const better = inverse ? current < previous : current > previous;
  return better ? COLORS.accent : COLORS.red;
}

function formatDate(isoDate) {
  if (!isoDate) return "—";
  const d = new Date(isoDate);
  return d.getDate() + " " + ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."][d.getMonth()];
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ============================================================
// GENERATION
// ============================================================

async function generatePresentation({ campaigns, flows, deliverability, config }) {
  const cur = config.CLIENT.currency || "€";
  const fc = (n) => fmtCurrency(n, cur);

  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = config.AUTHOR.name + (config.AUTHOR.company ? " - " + config.AUTHOR.company : "");
  pres.title = "Rapport Email Marketing - " + config.CLIENT.name;

  const iconStar = await iconToBase64Png(FaStar, "#BF995A");

  // ---- Calculs globaux ----
  const totalCampaignRevenue = campaigns.current.reduce((s, c) => s + (c.revenue || 0), 0);
  const totalCampaignRecipients = campaigns.current.reduce((s, c) => s + (c.recipients || 0), 0);
  const totalCampaignConversions = campaigns.current.reduce((s, c) => s + (c.conversions || 0), 0);
  const totalFlowRevenue = flows.reduce((s, f) => s + (f.current.revenue || 0), 0);
  const totalFlowConversions = flows.reduce((s, f) => s + (f.current.conversions || 0), 0);
  const totalRevenue = totalCampaignRevenue + totalFlowRevenue;
  const totalDelivered = deliverability.current.delivered || 0;
  const totalConversions = totalCampaignConversions + totalFlowConversions;
  const prevTotalRevenue = (campaigns.previous.totalRevenue || 0) + flows.reduce((s, f) => s + (f.previous.revenue || 0), 0);
  const prevTotalDelivered = deliverability.previous.delivered || 0;
  const campaignRevenueShare = totalRevenue > 0 ? (totalCampaignRevenue / totalRevenue) * 100 : 0;
  const flowRevenueShare = totalRevenue > 0 ? (totalFlowRevenue / totalRevenue) * 100 : 0;

  // ============================================
  // SLIDE 1: TITRE
  // ============================================
  const slide1 = pres.addSlide();
  slide1.background = { color: COLORS.navy };
  slide1.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: COLORS.accent } });
  slide1.addText("RAPPORT DE MISSION", { x: 0.5, y: 1.8, w: 9, h: 0.8, fontSize: 38, fontFace: "Arial Black", color: COLORS.white, align: "center", bold: true, charSpacing: 4 });
  slide1.addText("Email Marketing & Copywriting", { x: 0.5, y: 2.55, w: 9, h: 0.5, fontSize: 20, fontFace: "Calibri", color: COLORS.accentLight, align: "center", italic: true });
  slide1.addShape(pres.shapes.LINE, { x: 3.5, y: 3.25, w: 3, h: 0, line: { color: COLORS.accent, width: 2 } });
  slide1.addText(config.CLIENT.name, { x: 0.5, y: 3.55, w: 9, h: 0.6, fontSize: 28, fontFace: "Arial Black", color: COLORS.white, align: "center", bold: true, charSpacing: 6 });
  slide1.addText(config.CLIENT.tagline || "", { x: 0.5, y: 4.1, w: 9, h: 0.4, fontSize: 14, fontFace: "Calibri", color: COLORS.medGray, align: "center" });
  slide1.addShape(pres.shapes.LINE, { x: 3.5, y: 4.65, w: 3, h: 0, line: { color: COLORS.accent, width: 1 } });
  slide1.addText("Rapport mensuel — " + config.MONTH_LABEL, { x: 0.5, y: 4.9, w: 9, h: 0.5, fontSize: 18, fontFace: "Calibri", color: COLORS.accentLight, align: "center", italic: true });
  slide1.addText(config.AUTHOR.name + (config.AUTHOR.company ? " | " + config.AUTHOR.company : ""), { x: 0.5, y: 5.7, w: 9, h: 0.4, fontSize: 12, fontFace: "Calibri", color: COLORS.medGray, align: "center" });

  // ============================================
  // SLIDE 2: SOMMAIRE
  // ============================================
  const slide2 = pres.addSlide();
  slide2.background = { color: COLORS.navy };
  slide2.addText("SOMMAIRE", { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 28, fontFace: "Arial Black", color: COLORS.white, bold: true });
  const toc = [
    { num: "01", title: "Résumé du mois" },
    { num: "02", title: "Newsletters de " + config.MONTH_LABEL.split(" ")[0].toLowerCase() },
    { num: "03", title: "Vue d'ensemble des séquences" },
    { num: "04", title: "Détail des séquences par cible" },
    { num: "05", title: "Délivrabilité" },
    { num: "06", title: "Prochaines étapes" },
  ];
  toc.forEach((item, i) => {
    const yPos = 1.2 + i * 0.65;
    slide2.addText(item.num, { x: 1.0, y: yPos, w: 0.8, h: 0.5, fontSize: 18, fontFace: "Arial Black", color: COLORS.accent, align: "center", bold: true });
    slide2.addText(item.title, { x: 2.0, y: yPos, w: 6.5, h: 0.5, fontSize: 16, fontFace: "Calibri", color: COLORS.white, valign: "middle" });
  });

  // ============================================
  // SLIDE 3: RÉSUMÉ DU MOIS
  // ============================================
  const slide3 = pres.addSlide();
  slide3.background = { color: COLORS.navy };
  slide3.addText("RÉSUMÉ DU MOIS", { x: 0.7, y: 0.25, w: 8, h: 0.7, fontSize: 26, fontFace: "Arial Black", color: COLORS.white, bold: true, charSpacing: 2 });
  slide3.addText(config.MONTH_LABEL, { x: 0.7, y: 0.85, w: 8, h: 0.3, fontSize: 12, fontFace: "Calibri", color: COLORS.textLight });

  const kpiCards = [
    { value: fc(totalRevenue), label: "CA attribué email", badge: pctChange(totalRevenue, prevTotalRevenue), badgeColor: trendColor(totalRevenue, prevTotalRevenue) },
    { value: fmt(totalDelivered), label: "e-mails délivrés", badge: pctChange(totalDelivered, prevTotalDelivered), badgeColor: trendColor(totalDelivered, prevTotalDelivered) },
    { value: String(campaigns.current.length), label: "newsletters envoyées", subtext: "vs " + campaigns.previous.count + " en " + config.PREV_MONTH_LABEL.split(" ")[0].toLowerCase() },
    { value: String(totalConversions), label: "conversions", subtext: totalCampaignConversions + " NL + " + totalFlowConversions + " séquences" },
  ];

  kpiCards.forEach((card, i) => {
    const xPos = 0.5 + i * 2.35;
    slide3.addShape(pres.shapes.RECTANGLE, { x: xPos, y: 1.4, w: 2.2, h: 1.8, fill: { color: COLORS.darkBlue }, shadow: makeShadow() });
    slide3.addShape(pres.shapes.RECTANGLE, { x: xPos, y: 1.4, w: 2.2, h: 0.06, fill: { color: COLORS.accent } });
    slide3.addText(card.value, { x: xPos, y: 1.7, w: 2.2, h: 0.5, fontSize: 22, fontFace: "Arial Black", color: i % 2 === 0 ? COLORS.accentLight : COLORS.white, align: "center", bold: true });
    slide3.addText(card.label, { x: xPos, y: 2.2, w: 2.2, h: 0.3, fontSize: 11, fontFace: "Calibri", color: COLORS.medGray, align: "center" });
    if (card.badge) {
      slide3.addShape(pres.shapes.RECTANGLE, { x: xPos + 0.25, y: 2.6, w: 1.7, h: 0.25, fill: { color: card.badgeColor } });
      slide3.addText(card.badge, { x: xPos + 0.25, y: 2.6, w: 1.7, h: 0.25, fontSize: 12, fontFace: "Arial Black", color: COLORS.navy, align: "center", valign: "middle", bold: true });
    }
    if (card.subtext) {
      slide3.addText(card.subtext, { x: xPos, y: 2.55, w: 2.2, h: 0.25, fontSize: 10, fontFace: "Calibri", color: COLORS.medGray, align: "center", italic: true });
    }
  });

  const mainRevenueSource = campaignRevenueShare > flowRevenueShare ? "newsletters" : "séquences";
  const mainShare = Math.max(campaignRevenueShare, flowRevenueShare);
  const insights = [];

  if (config.FEATURES?.autoInsights) {
    insights.push("Les " + mainRevenueSource + " génèrent " + fmtPercent(mainShare, 0) + " du CA e-mail ce mois (" + fc(campaignRevenueShare > flowRevenueShare ? totalCampaignRevenue : totalFlowRevenue) + ").");
    const bench = config.BENCHMARKS;
    if (bench?.openRate && deliverability.current.openRate > 0) {
      const diff = deliverability.current.openRate - bench.openRate;
      if (Math.abs(diff) >= 3) {
        insights.push(diff > 0
          ? "Taux d'ouverture (" + fmtPercent(deliverability.current.openRate) + ") supérieur de " + fmt(diff, 1) + " pts au benchmark — bon signal de réputation expéditeur."
          : "Taux d'ouverture (" + fmtPercent(deliverability.current.openRate) + ") inférieur de " + fmt(Math.abs(diff), 1) + " pts au benchmark — segmenter ou nettoyer la liste pourrait aider.");
      }
    }
    const rpr = totalDelivered > 0 ? totalRevenue / totalDelivered : 0;
    if (rpr > 0) insights.push("Le CA par e-mail délivré atteint " + fmt(rpr, 2) + " " + cur + " ce mois.");
  } else {
    insights.push(fmtPercent(campaignRevenueShare, 0) + " des revenus proviennent des newsletters (" + fc(totalCampaignRevenue) + "), contre " + fmtPercent(flowRevenueShare, 0) + " des séquences (" + fc(totalFlowRevenue) + ").");
  }

  slide3.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 3.5, w: 9, h: 1.5, fill: { color: COLORS.darkBlue } });
  if (iconStar) slide3.addImage({ data: iconStar, x: 0.8, y: 3.65, w: 0.35, h: 0.35 });
  slide3.addText(config.FEATURES?.autoInsights ? "Insights du mois" : ("Les " + mainRevenueSource + " représentent " + fmtPercent(mainShare, 0) + " du CA e-mail"), { x: 1.3, y: 3.60, w: 7.8, h: 0.32, fontSize: 12, fontFace: "Arial Black", color: COLORS.white, bold: true });
  const insightLines = insights.slice(0, 3).map((t) => [
    { text: "▸ ", options: { fontSize: 11, color: COLORS.accent, bold: true } },
    { text: t + "\n", options: { fontSize: 10, color: COLORS.textLight } },
  ]).flat();
  slide3.addText(insightLines, { x: 1.3, y: 3.95, w: 7.95, h: 1.0, fontFace: "Calibri", valign: "top", paraSpaceAfter: 4 });

  // ============================================
  // SLIDE 4: NEWSLETTERS
  // ============================================
  const campaignsByDate = [...campaigns.current].sort((a, b) => new Date(b.sendDate) - new Date(a.sendDate));
  const bestCampaign = [...campaigns.current].sort((a, b) => (b.revenue || 0) - (a.revenue || 0))[0];
  const avgOpenRate = campaigns.current.length > 0 ? campaigns.current.reduce((s, c) => s + (c.openRate || 0), 0) / campaigns.current.length : 0;
  const NL_ROWS_PER_SLIDE = 10;
  const nlChunks = chunk(campaignsByDate, NL_ROWS_PER_SLIDE);
  const nlHeader = [
    { text: "Campagne", options: { bold: true, color: COLORS.white, fill: { color: COLORS.slate }, fontSize: 9 } },
    { text: "Date", options: { bold: true, color: COLORS.white, fill: { color: COLORS.slate }, fontSize: 9 } },
    { text: "Dest.", options: { bold: true, color: COLORS.white, fill: { color: COLORS.slate }, fontSize: 9 } },
    { text: "Ventes", options: { bold: true, color: COLORS.white, fill: { color: COLORS.slate }, fontSize: 9 } },
    { text: "CA", options: { bold: true, color: COLORS.white, fill: { color: COLORS.slate }, fontSize: 9 } },
    { text: "CA / dest.", options: { bold: true, color: COLORS.white, fill: { color: COLORS.slate }, fontSize: 9 } },
  ];

  nlChunks.forEach((chunkCamps, chunkIdx) => {
    const slide = pres.addSlide();
    slide.background = { color: COLORS.navy };
    const titleSuffix = nlChunks.length > 1 ? ` (${chunkIdx + 1}/${nlChunks.length})` : "";
    slide.addText("NEWSLETTERS DE " + config.MONTH_LABEL.split(" ")[0].toUpperCase() + titleSuffix, { x: 0.7, y: 0.25, w: 8.6, h: 0.7, fontSize: 26, fontFace: "Arial Black", color: COLORS.white, bold: true, charSpacing: 2 });
    slide.addText(campaigns.current.length + " newsletters envoyées ce mois — " + fmt(totalCampaignRecipients) + " destinataires", { x: 0.7, y: 0.85, w: 8.6, h: 0.3, fontSize: 12, fontFace: "Calibri", color: COLORS.textLight });

    const nlRows = chunkCamps.map((c, i) => {
      const isAlt = (chunkIdx * NL_ROWS_PER_SLIDE + i) % 2 === 1;
      const bg = isAlt ? { fill: { color: COLORS.altRow } } : {};
      const isBest = c === bestCampaign;
      const revPerDest = c.recipients > 0 ? (c.revenue / c.recipients).toFixed(3) : "0";
      return [
        { text: c.name, options: { fontSize: 8, color: isBest ? COLORS.accentLight : COLORS.textLight, bold: isBest, ...bg } },
        { text: formatDate(c.sendDate), options: { fontSize: 8, color: COLORS.textLight, align: "center", ...bg } },
        { text: fmt(c.recipients), options: { fontSize: 8, color: COLORS.textLight, align: "center", ...bg } },
        { text: String(c.conversions || 0), options: { fontSize: 8, color: c.conversions > 0 ? COLORS.accentLight : COLORS.textLight, align: "center", bold: c.conversions > 0, ...bg } },
        { text: fc(c.revenue), options: { fontSize: 8, color: isBest ? COLORS.accentLight : COLORS.textLight, align: "center", bold: isBest, ...bg } },
        { text: revPerDest, options: { fontSize: 8, color: COLORS.textLight, align: "center", ...bg } },
      ];
    });

    const nlRowH = [0.3, ...nlRows.map(() => 0.25)];
    slide.addTable([nlHeader, ...nlRows], { x: 0.5, y: 1.35, w: 9, colW: [2.3, 1.0, 1.0, 1.0, 1.4, 1.2], border: { pt: 0.5, color: COLORS.slate }, rowH: nlRowH });

    if (chunkIdx === nlChunks.length - 1) {
      const tableHeight = nlRowH.reduce((s, h) => s + h, 0);
      const summaryY = Math.min(1.35 + tableHeight + 0.3, 4.40);

      if (config.FEATURES?.topFlopHighlight && campaigns.current.length >= 2) {
        const byRevenue = [...campaigns.current].sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
        const top = byRevenue[0];
        const flop = [...campaigns.current].sort((a, b) => (a.openRate || 0) - (b.openRate || 0))[0];
        const cardW = 4.4, cardH = 1.1;
        const cards = [
          { x: 0.5, label: "TOP PERFORMER", value: top?.name || "—", metric: fc(top?.revenue || 0) + "  •  " + String(top?.conversions || 0) + " ventes  •  " + fmtPercent(top?.openRate || 0) + " d'ouverture", accent: COLORS.accentLight },
          { x: 0.5 + cardW + 0.2, label: "À SURVEILLER", value: flop?.name || "—", metric: fmtPercent(flop?.openRate || 0) + " d'ouverture  •  " + String(flop?.conversions || 0) + " ventes  •  " + fc(flop?.revenue || 0), accent: COLORS.red },
        ];
        cards.forEach((c) => {
          slide.addShape(pres.shapes.RECTANGLE, { x: c.x, y: summaryY, w: cardW, h: cardH, fill: { color: COLORS.darkBlue } });
          slide.addShape(pres.shapes.RECTANGLE, { x: c.x, y: summaryY, w: cardW, h: 0.06, fill: { color: c.accent } });
          slide.addText(c.label, { x: c.x + 0.2, y: summaryY + 0.15, w: cardW - 0.4, h: 0.3, fontSize: 10, fontFace: "Arial Black", color: c.accent, bold: true, charSpacing: 3 });
          slide.addText("« " + c.value + " »", { x: c.x + 0.2, y: summaryY + 0.45, w: cardW - 0.4, h: 0.32, fontSize: 11, fontFace: "Calibri", color: COLORS.white, bold: true });
          slide.addText(c.metric, { x: c.x + 0.2, y: summaryY + 0.78, w: cardW - 0.4, h: 0.28, fontSize: 9, fontFace: "Calibri", color: COLORS.textLight });
        });
      } else {
        slide.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: summaryY, w: 9, h: 1.0, fill: { color: COLORS.darkBlue } });
        if (iconStar) slide.addImage({ data: iconStar, x: 0.8, y: summaryY + 0.15, w: 0.35, h: 0.35 });
        slide.addText(fmtPercent(avgOpenRate) + " d'ouverture moyenne  •  " + fc(totalCampaignRevenue) + " de CA  •  meilleure campagne : « " + (bestCampaign?.name || "") + " » (" + fc(bestCampaign?.revenue || 0) + ")", { x: 1.3, y: summaryY, w: 8, h: 0.9, fontSize: 11, fontFace: "Calibri", color: COLORS.white, valign: "middle" });
      }
    }
  });

  // ============================================
  // SLIDE 5: VUE D'ENSEMBLE SÉQUENCES
  // ============================================
  const activeFlows = flows.filter((f) => (f.current.recipients || 0) > 0);
  const activeTotalRecipients = activeFlows.reduce((s, f) => s + (f.current.recipients || 0), 0);
  const activeTotalRevenue = activeFlows.reduce((s, f) => s + (f.current.revenue || 0), 0);
  const activeTotalOpens = activeFlows.reduce((s, f) => s + (f.current.opensUnique || f.current.opens || 0), 0);
  const activeTotalDelivered = activeFlows.reduce((s, f) => s + (f.current.delivered || f.current.recipients || 0), 0);
  const prevFlowRecipients = flows.reduce((s, f) => s + (f.previous.recipients || 0), 0);
  const avgFlowOpenRate = activeTotalDelivered > 0 ? (activeTotalOpens / activeTotalDelivered) * 100 : 0;

  const slide5 = pres.addSlide();
  slide5.background = { color: COLORS.navy };
  slide5.addText("VUE D'ENSEMBLE DES SÉQUENCES", { x: 0.7, y: 0.25, w: 8.6, h: 0.7, fontSize: 26, fontFace: "Arial Black", color: COLORS.white, bold: true, charSpacing: 2 });
  slide5.addText(activeFlows.length + " séquences actives  |  " + fmt(activeTotalRecipients) + " e-mails délivrés  |  " + pctChange(activeTotalRecipients, prevFlowRecipients) + " vs " + config.PREV_MONTH_LABEL.split(" ")[0].toLowerCase(), { x: 0.7, y: 0.85, w: 8.6, h: 0.3, fontSize: 12, fontFace: "Calibri", color: COLORS.textLight });

  const flowStatCards = [
    { value: fmt(activeTotalRecipients), label: "E-mails délivrés", color: COLORS.accent },
    { value: fmtPercent(avgFlowOpenRate), label: "Taux d'ouverture", color: COLORS.accentLight },
    { value: fc(activeTotalRevenue), label: "Revenus directs", color: COLORS.accentDark },
  ];
  flowStatCards.forEach((card, i) => {
    const xPos = 0.5 + i * 3.15;
    slide5.addShape(pres.shapes.RECTANGLE, { x: xPos, y: 1.5, w: 2.85, h: 1.5, fill: { color: COLORS.darkBlue }, shadow: makeShadow() });
    slide5.addShape(pres.shapes.RECTANGLE, { x: xPos, y: 1.5, w: 2.85, h: 0.06, fill: { color: card.color } });
    slide5.addText(card.value, { x: xPos, y: 1.95, w: 2.85, h: 0.5, fontSize: 26, fontFace: "Arial Black", color: COLORS.white, align: "center", bold: true });
    slide5.addText(card.label, { x: xPos, y: 2.5, w: 2.85, h: 0.35, fontSize: 11, fontFace: "Calibri", color: COLORS.medGray, align: "center" });
  });

  const topFlows = [...activeFlows].sort((a, b) => (b.current.revenue || 0) - (a.current.revenue || 0) || (b.current.recipients || 0) - (a.current.recipients || 0)).slice(0, 6);
  if (topFlows.length > 0) {
    slide5.addText("Top séquences ce mois", { x: 0.5, y: 3.1, w: 9, h: 0.3, fontSize: 11, fontFace: "Calibri", color: COLORS.medGray, italic: true });
    const flowSummaryHeader = [
      { text: "Séquence", options: { bold: true, color: COLORS.white, fill: { color: COLORS.slate }, fontSize: 10 } },
      { text: "Délivrés", options: { bold: true, color: COLORS.white, fill: { color: COLORS.slate }, fontSize: 10 } },
      { text: "Ventes", options: { bold: true, color: COLORS.white, fill: { color: COLORS.slate }, fontSize: 10 } },
      { text: "CA", options: { bold: true, color: COLORS.white, fill: { color: COLORS.slate }, fontSize: 10 } },
      { text: "CA / dest.", options: { bold: true, color: COLORS.white, fill: { color: COLORS.slate }, fontSize: 10 } },
    ];
    const flowSummaryRows = topFlows.map((f, i) => {
      const bg = i % 2 === 1 ? { fill: { color: COLORS.altRow } } : {};
      const revPerDest = f.current.recipients > 0 ? (f.current.revenue / f.current.recipients).toFixed(3) : "—";
      return [
        { text: f.name, options: { fontSize: 9, color: COLORS.textLight, ...bg } },
        { text: fmt(f.current.recipients), options: { fontSize: 9, color: COLORS.textLight, align: "center", ...bg } },
        { text: String(f.current.conversions || 0), options: { fontSize: 9, color: f.current.conversions > 0 ? COLORS.accentLight : COLORS.textLight, align: "center", bold: f.current.conversions > 0, ...bg } },
        { text: fc(f.current.revenue), options: { fontSize: 9, color: COLORS.textLight, align: "center", ...bg } },
        { text: revPerDest, options: { fontSize: 9, color: COLORS.textLight, align: "center", ...bg } },
      ];
    });
    slide5.addTable([flowSummaryHeader, ...flowSummaryRows], { x: 0.5, y: 3.4, w: 9, colW: [3.4, 1.3, 1.1, 1.5, 1.7], border: { pt: 0.5, color: COLORS.slate }, rowH: [0.28, ...flowSummaryRows.map(() => 0.24)] });
  }

  // ============================================
  // SLIDE 6: DÉTAIL SÉQUENCES PAR CIBLE
  // ============================================
  const sortedActiveFlows = [...activeFlows].sort((a, b) => (b.current.revenue || 0) - (a.current.revenue || 0) || (b.current.recipients || 0) - (a.current.recipients || 0));
  const FLOW_ROWS_PER_SLIDE = 11;
  const flowChunks = chunk(sortedActiveFlows, FLOW_ROWS_PER_SLIDE);
  const bestFlow = sortedActiveFlows.filter((f) => f.current.recipients > 0).sort((a, b) => (b.current.conversionRate || 0) - (a.current.conversionRate || 0))[0];
  const detailHeader = [
    { text: "Séquence", options: { bold: true, color: COLORS.white, fill: { color: COLORS.slate }, fontSize: 8 } },
    { text: "Délivrés", options: { bold: true, color: COLORS.white, fill: { color: COLORS.slate }, fontSize: 8 } },
    { text: "Ventes", options: { bold: true, color: COLORS.white, fill: { color: COLORS.slate }, fontSize: 8 } },
    { text: "Conv. %", options: { bold: true, color: COLORS.white, fill: { color: COLORS.slate }, fontSize: 8 } },
    { text: "CA", options: { bold: true, color: COLORS.white, fill: { color: COLORS.slate }, fontSize: 8 } },
    { text: "vs M-1", options: { bold: true, color: COLORS.white, fill: { color: COLORS.slate }, fontSize: 8 } },
  ];

  if (flowChunks.length === 0) {
    const slide = pres.addSlide();
    slide.background = { color: COLORS.navy };
    slide.addText("DÉTAIL DES SÉQUENCES PAR CIBLE", { x: 0.7, y: 0.25, w: 8.6, h: 0.7, fontSize: 26, fontFace: "Arial Black", color: COLORS.white, bold: true, charSpacing: 2 });
    slide.addText("Aucune séquence active en " + config.MONTH_LABEL.split(" ")[0].toLowerCase() + ".", { x: 0.7, y: 0.85, w: 8.6, h: 0.3, fontSize: 12, fontFace: "Calibri", color: COLORS.textLight, italic: true });
  }

  flowChunks.forEach((chunkFlows, chunkIdx) => {
    const slide = pres.addSlide();
    slide.background = { color: COLORS.navy };
    const titleSuffix = flowChunks.length > 1 ? ` (${chunkIdx + 1}/${flowChunks.length})` : "";
    slide.addText("DÉTAIL DES SÉQUENCES PAR CIBLE" + titleSuffix, { x: 0.7, y: 0.25, w: 8.6, h: 0.7, fontSize: 26, fontFace: "Arial Black", color: COLORS.white, bold: true, charSpacing: 2 });
    slide.addText(activeFlows.length + " séquence" + (activeFlows.length > 1 ? "s" : "") + " active" + (activeFlows.length > 1 ? "s" : "") + " en " + config.MONTH_LABEL.split(" ")[0].toLowerCase() + " — Performance complète", { x: 0.7, y: 0.85, w: 8.6, h: 0.3, fontSize: 12, fontFace: "Calibri", color: COLORS.textLight });

    const detailRows = chunkFlows.map((f, i) => {
      const isAlt = (chunkIdx * FLOW_ROWS_PER_SLIDE + i) % 2 === 1;
      const bg = isAlt ? { fill: { color: COLORS.altRow } } : {};
      const convRate = f.current.conversionRate || 0;
      const hasPrev = (f.previous.revenue || 0) > 0;
      const revChange = hasPrev ? pctChange(f.current.revenue, f.previous.revenue) : "—";
      return [
        { text: f.name, options: { fontSize: 7, color: COLORS.textLight, ...bg } },
        { text: fmt(f.current.recipients), options: { fontSize: 7, color: COLORS.textLight, align: "center", ...bg } },
        { text: String(f.current.conversions || 0), options: { fontSize: 7, color: f.current.conversions > 0 ? COLORS.accentLight : COLORS.textLight, align: "center", bold: f.current.conversions > 0, ...bg } },
        { text: convRate > 0 ? fmtPercent(convRate, 3) : "—", options: { fontSize: 7, color: convRate > 0.1 ? COLORS.accentLight : COLORS.textLight, align: "center", bold: convRate > 0.1, ...bg } },
        { text: f.current.revenue > 0 ? fc(f.current.revenue) : "—", options: { fontSize: 7, color: f.current.revenue > 0 ? COLORS.accentLight : COLORS.textLight, align: "center", bold: f.current.revenue > 0, ...bg } },
        { text: revChange, options: { fontSize: 7, color: hasPrev ? trendColor(f.current.revenue, f.previous.revenue) : COLORS.medGray, align: "center", ...bg } },
      ];
    });

    slide.addTable([detailHeader, ...detailRows], { x: 0.5, y: 1.35, w: 9, colW: [3.4, 1.0, 0.8, 1.0, 1.3, 1.5], border: { pt: 0.5, color: COLORS.slate }, rowH: [0.28, ...detailRows.map(() => 0.22)] });

    if (chunkIdx === flowChunks.length - 1 && bestFlow && bestFlow.current.conversionRate > 0) {
      const tableHeight = 0.28 + detailRows.length * 0.22;
      const insightY = Math.min(1.35 + tableHeight + 0.25, 4.5);
      slide.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: insightY, w: 9, h: 1.0, fill: { color: COLORS.darkBlue } });
      if (iconStar) slide.addImage({ data: iconStar, x: 0.8, y: insightY + 0.15, w: 0.35, h: 0.35 });
      slide.addText("Meilleure séquence : « " + bestFlow.name + " » — " + fmtPercent(bestFlow.current.conversionRate, 3) + " de conversion, " + fc(bestFlow.current.revenue) + " de CA.", { x: 1.3, y: insightY + 0.05, w: 8, h: 0.85, fontSize: 10, fontFace: "Calibri", color: COLORS.white, valign: "middle" });
    }
  });

  // ============================================
  // SLIDE 7: DÉLIVRABILITÉ
  // ============================================
  const slide7 = pres.addSlide();
  slide7.background = { color: COLORS.navy };
  slide7.addText("DÉLIVRABILITÉ", { x: 0.7, y: 0.25, w: 8, h: 0.7, fontSize: 26, fontFace: "Arial Black", color: COLORS.white, bold: true, charSpacing: 2 });
  slide7.addText("Métriques de santé globales — " + config.MONTH_LABEL, { x: 0.7, y: 0.85, w: 8, h: 0.3, fontSize: 12, fontFace: "Calibri", color: COLORS.textLight });

  const del = deliverability.current;
  const prevDel = deliverability.previous;
  const benchmarksOn = config.FEATURES?.industryBenchmarks && config.BENCHMARKS;

  const benchLabel = (value, benchmark, direction = "higher_better") => {
    if (!benchmarksOn || benchmark == null) return null;
    const diff = value - benchmark;
    const better = direction === "higher_better" ? diff >= 0 : diff <= 0;
    const sign = diff >= 0 ? "+" : "";
    return { text: "Marché : " + fmtPercent(benchmark, 1) + " (" + sign + fmt(diff, 1) + " pts)", color: better ? COLORS.accentLight : COLORS.red };
  };

  const delMetrics = [
    { value: fmtPercent(del.openRate), label: "Taux d'ouverture", trend: pctChange(del.openRate, prevDel.openRate), trendColor: trendColor(del.openRate, prevDel.openRate), bench: benchLabel(del.openRate, config.BENCHMARKS?.openRate, "higher_better") },
    { value: fmtPercent(del.clickRate), label: "Taux de clics", trend: pctChange(del.clickRate, prevDel.clickRate), trendColor: trendColor(del.clickRate, prevDel.clickRate), bench: benchLabel(del.clickRate, config.BENCHMARKS?.clickRate, "higher_better") },
    { value: fmtPercent(del.bounceRate), label: "Taux de rebond", trend: pctChange(del.bounceRate, prevDel.bounceRate), trendColor: trendColor(del.bounceRate, prevDel.bounceRate, true), bench: benchLabel(del.bounceRate, config.BENCHMARKS?.bounceRate, "lower_better") },
  ];

  delMetrics.forEach((metric, i) => {
    const xPos = 0.5 + i * 3.15;
    const cardH = metric.bench ? 2.05 : 1.8;
    slide7.addShape(pres.shapes.RECTANGLE, { x: xPos, y: 1.4, w: 2.85, h: cardH, fill: { color: COLORS.darkBlue }, shadow: makeShadow() });
    slide7.addShape(pres.shapes.RECTANGLE, { x: xPos, y: 1.4, w: 2.85, h: 0.06, fill: { color: COLORS.accent } });
    slide7.addText(metric.value, { x: xPos, y: 1.75, w: 2.85, h: 0.5, fontSize: 24, fontFace: "Arial Black", color: COLORS.white, align: "center", bold: true });
    slide7.addText(metric.label, { x: xPos, y: 2.25, w: 2.85, h: 0.3, fontSize: 11, fontFace: "Calibri", color: COLORS.medGray, align: "center" });
    slide7.addShape(pres.shapes.RECTANGLE, { x: xPos + 0.35, y: 2.6, w: 2.15, h: 0.25, fill: { color: metric.trendColor } });
    slide7.addText(metric.trend, { x: xPos + 0.35, y: 2.6, w: 2.15, h: 0.25, fontSize: 10, fontFace: "Arial Black", color: COLORS.navy, align: "center", valign: "middle", bold: true });
    if (metric.bench) slide7.addText(metric.bench.text, { x: xPos, y: 2.95, w: 2.85, h: 0.3, fontSize: 8, fontFace: "Calibri", color: metric.bench.color, align: "center", italic: true });
  });

  const row2Y = benchmarksOn ? 3.65 : 3.5;
  const delMetrics2 = [
    { value: fmtPercent(del.spamRate, 3), label: "Taux de spam", trend: pctChange(del.spamRate, prevDel.spamRate), trendColor: trendColor(del.spamRate, prevDel.spamRate, true), bench: benchLabel(del.spamRate, config.BENCHMARKS?.spamRate, "lower_better") },
    { value: fmtPercent(del.unsubRate, 3), label: "Taux de désabonnement", trend: pctChange(del.unsubRate, prevDel.unsubRate), trendColor: trendColor(del.unsubRate, prevDel.unsubRate, true), bench: benchLabel(del.unsubRate, config.BENCHMARKS?.unsubRate, "lower_better") },
    { value: fmt(del.delivered), label: "Volume total", trend: pctChange(del.delivered, prevDel.delivered), trendColor: trendColor(del.delivered, prevDel.delivered), bench: null },
  ];
  delMetrics2.forEach((metric, i) => {
    const xPos = 0.5 + i * 3.15;
    const cardH = metric.bench ? 1.95 : 1.7;
    slide7.addShape(pres.shapes.RECTANGLE, { x: xPos, y: row2Y, w: 2.85, h: cardH, fill: { color: COLORS.darkBlue }, shadow: makeShadow() });
    slide7.addShape(pres.shapes.RECTANGLE, { x: xPos, y: row2Y, w: 2.85, h: 0.06, fill: { color: COLORS.accent } });
    slide7.addText(metric.value, { x: xPos, y: row2Y + 0.35, w: 2.85, h: 0.5, fontSize: 24, fontFace: "Arial Black", color: COLORS.white, align: "center", bold: true });
    slide7.addText(metric.label, { x: xPos, y: row2Y + 0.85, w: 2.85, h: 0.3, fontSize: 11, fontFace: "Calibri", color: COLORS.medGray, align: "center" });
    slide7.addShape(pres.shapes.RECTANGLE, { x: xPos + 0.35, y: row2Y + 1.2, w: 2.15, h: 0.25, fill: { color: metric.trendColor } });
    slide7.addText(metric.trend, { x: xPos + 0.35, y: row2Y + 1.2, w: 2.15, h: 0.25, fontSize: 10, fontFace: "Arial Black", color: COLORS.navy, align: "center", valign: "middle", bold: true });
    if (metric.bench) slide7.addText(metric.bench.text, { x: xPos, y: row2Y + 1.55, w: 2.85, h: 0.3, fontSize: 8, fontFace: "Calibri", color: metric.bench.color, align: "center", italic: true });
  });

  // ============================================
  // SLIDE 8: PROCHAINES ÉTAPES
  // ============================================
  const slide8 = pres.addSlide();
  slide8.background = { color: COLORS.navy };
  slide8.addText("PROCHAINES ÉTAPES", { x: 0.7, y: 0.25, w: 8.6, h: 0.7, fontSize: 26, fontFace: "Arial Black", color: COLORS.white, bold: true, charSpacing: 2 });
  slide8.addText(config.MONTH_LABEL + " et suite", { x: 0.7, y: 0.85, w: 8.6, h: 0.3, fontSize: 12, fontFace: "Calibri", color: COLORS.textLight, italic: true });

  const nextSteps = config.NEXT_STEPS || [
    { num: "01", title: "Prochaine étape", body: "À compléter avec le client." },
    { num: "02", title: "Prochaine étape", body: "À compléter avec le client." },
    { num: "03", title: "Prochaine étape", body: "À compléter avec le client." },
  ];

  nextSteps.forEach((step, i) => {
    const y = 1.45 + i * 1.32;
    slide8.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 9, h: 1.2, fill: { color: COLORS.darkBlue } });
    slide8.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 0.08, h: 1.2, fill: { color: COLORS.accent } });
    slide8.addText(step.num || `0${i + 1}`, { x: 0.75, y: y + 0.1, w: 0.6, h: 0.4, fontSize: 16, fontFace: "Arial Black", color: COLORS.accent, bold: true });
    slide8.addText(step.title || "", { x: 1.4, y: y + 0.1, w: 7.9, h: 0.4, fontSize: 14, fontFace: "Arial Black", color: COLORS.white, bold: true });
    slide8.addText(step.body || "", { x: 1.4, y: y + 0.55, w: 7.9, h: 0.6, fontSize: 11, fontFace: "Calibri", color: COLORS.textLight, valign: "top" });
  });

  // ============================================
  // SLIDE 9: BILAN DU MOIS
  // ============================================
  const slide9 = pres.addSlide();
  slide9.background = { color: COLORS.navy };
  slide9.addText("BILAN DU MOIS", { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 28, fontFace: "Arial Black", color: COLORS.accent, align: "center", bold: true, charSpacing: 2 });
  slide9.addText(config.MONTH_LABEL, { x: 0.5, y: 1.2, w: 9, h: 0.35, fontSize: 13, fontFace: "Calibri", color: COLORS.medGray, align: "center", italic: true });

  const cardW = 4.2, cardH = 2.2, cardY = 1.85;
  const bilanCards = [
    { x: 0.55, title: "NEWSLETTERS", revenue: totalCampaignRevenue, conversions: totalCampaignConversions, count: campaigns.current.length, countLabel: campaigns.current.length > 1 ? "envoyées" : "envoyée" },
    { x: 5.25, title: "SÉQUENCES", revenue: totalFlowRevenue, conversions: totalFlowConversions, count: activeFlows.length, countLabel: activeFlows.length > 1 ? "actives" : "active" },
  ];
  bilanCards.forEach((card) => {
    slide9.addShape(pres.shapes.RECTANGLE, { x: card.x, y: cardY, w: cardW, h: cardH, fill: { color: COLORS.darkBlue }, shadow: makeShadow() });
    slide9.addShape(pres.shapes.RECTANGLE, { x: card.x, y: cardY, w: cardW, h: 0.08, fill: { color: COLORS.accent } });
    slide9.addText(card.title, { x: card.x, y: cardY + 0.2, w: cardW, h: 0.4, fontSize: 14, fontFace: "Arial Black", color: COLORS.medGray, align: "center", bold: true, charSpacing: 4 });
    slide9.addText(fc(card.revenue), { x: card.x, y: cardY + 0.7, w: cardW, h: 0.6, fontSize: 28, fontFace: "Arial Black", color: COLORS.accentLight, align: "center", bold: true });
    slide9.addText("de CA attribué", { x: card.x, y: cardY + 1.3, w: cardW, h: 0.3, fontSize: 11, fontFace: "Calibri", color: COLORS.textLight, align: "center", italic: true });
    slide9.addText(card.conversions + " ventes  •  " + card.count + " " + card.countLabel, { x: card.x, y: cardY + 1.7, w: cardW, h: 0.35, fontSize: 11, fontFace: "Calibri", color: COLORS.medGray, align: "center" });
  });

  slide9.addText([
    { text: "Total : ", options: { fontSize: 14, color: COLORS.white } },
    { text: fc(totalRevenue), options: { fontSize: 16, color: COLORS.accentLight, bold: true } },
    { text: " de CA  •  " + totalConversions + " ventes  •  ", options: { fontSize: 14, color: COLORS.white } },
    { text: fmtPercent(del.openRate) + " d'ouverture moyenne", options: { fontSize: 14, color: COLORS.accentLight, bold: true } },
  ], { x: 0.5, y: 4.35, w: 9, h: 0.4, fontFace: "Calibri", align: "center" });

  slide9.addShape(pres.shapes.LINE, { x: 3.5, y: 4.85, w: 3, h: 0, line: { color: COLORS.accent, width: 2 } });
  slide9.addText(config.AUTHOR.name + (config.AUTHOR.company ? "  |  " + config.AUTHOR.company : ""), { x: 0.5, y: 5.05, w: 9, h: 0.35, fontSize: 12, fontFace: "Calibri", color: COLORS.white, align: "center", bold: true });
  if (config.AUTHOR.email) slide9.addText(config.AUTHOR.email, { x: 0.5, y: 5.4, w: 9, h: 0.3, fontSize: 10, fontFace: "Calibri", color: COLORS.medGray, align: "center" });

  // ---- Retourner le buffer ----
  const buffer = await pres.write("nodebuffer");
  return buffer;
}

module.exports = { generatePresentation };
