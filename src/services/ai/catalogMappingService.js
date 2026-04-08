/**
 * catalogMappingService.js
 *
 * Mapping Layer: AI raw output → standardized business catalog items
 *
 * Architecture:
 *   AI Analyzer → Raw Items → [THIS MODULE] → Standardized Items → Survey Form
 */

// ─── Scoring formula weights ──────────────────────────────────────────────────
const VOLUME_WEIGHT = 0.7;
const WEIGHT_WEIGHT = 0.3;

/**
 * If the best score within a hinted category exceeds this, fall back to unmatched.
 * (Tight: only clear matches are accepted)
 */
const POOR_MATCH_THRESHOLD = 1.0;

// ─── SECONDARY CATALOG KEY RULES (single source of truth) ────────────────────
// Ordered from most-specific to least-specific to avoid wrong early matches.
export const SECONDARY_KEY_RULES = [
  // Plant/flower FIRST — must catch 'chậu cây' before bowl catches 'bình'
  { key: 'plant', patterns: ['chậu cây', 'cây cảnh', 'chậu hoa', 'chậu cây lớn', 'chậu cây nhỏ', 'chậu cây trung', 'cây', 'hoa'] },
  // Kitchen / bowl items
  {
    key: 'bowl', patterns: ['chén sứ', 'cốc sứ', 'bộ chén', 'bộ bát', 'chén bát', 'chén', 'bát', 'tô', 'đĩa', 'dĩa',
      'ly sứ', 'ly', 'tách', 'cốc', 'đồ thủy tinh', 'thủy tinh', 'pha lê', 'đồ gốm sứ', 'gốm sứ', 'đồ gốm', 'đồ sứ']
  },
  { key: 'lamp', patterns: ['đèn cây', 'đèn sàn', 'đèn đứng', 'đèn bàn', 'đèn ngủ', 'đèn trần', 'đèn trang trí', 'đèn led', 'đèn ngoài trời', 'đuốc', 'đèn', 'bóng đèn'] },
  { key: 'clock', patterns: ['đồng hồ kỹ thuật số', 'đồng hồ điện tử', 'đồng hồ treo tường', 'đồng hồ'] },
  { key: 'fan', patterns: ['quạt điện', 'quạt đứng', 'quạt bàn', 'quạt mini', 'quạt'] },
  { key: 'book', patterns: ['sách vở', 'tài liệu', 'vở', 'hồ sơ', 'sách'] },
  {
    key: 'mirror', patterns: ['gương', 'khung tranh', 'tranh treo tường', 'bức tranh', 'poster', 'áp phích',
      'bảng gỗ treo', 'bảng treo', 'bảng gỗ',
      'lọ trang trí', 'lọ hoa', 'lọ', 'vật trang trí', 'khay trang trí', 'đồ trang trí', 'vật dụng nhỏ', 'vật dụng trang trí', 'trang trí']
  },
  { key: 'curtain', patterns: ['rèm cửa', 'màn cửa', 'rèm'] },
  { key: 'toy', patterns: ['đồ chơi', 'thú bông', 'thú nhồi bông', 'nhồi bông', 'lego', 'gấu bông', 'mô hình', 'robot', 'búp bê', 'board game', 'trò chơi', 'đồ chơi mềm'] },
  { key: 'shoes', patterns: ['giày dép', 'giày', 'dép', 'sandal', 'mũ bảo hiểm', 'nón bảo hiểm', 'bảo hiểm'] },
  {
    key: 'clothes', patterns: ['bộ chăn ga gối', 'chăn ga gối', 'bộ chăn', 'chăn gối', 'thảm trải', 'thảm sàn', 'thảm',
      'quần áo', 'chăn', 'gối tựa', 'gối ôm', 'gối', 'ga trải', 'áo', 'quần',
      'móc áo', 'giá treo đồ', 'cây treo đồ',
      'mũ lưỡi trai', 'mũ', 'nón', 'túi xách', 'ví da', 'ví', 'túi nhỏ', 'phụ kiện thời trang']
  },
  {
    key: 'kitchen', patterns: ['dụng cụ bếp', 'chảo', 'xoong', 'nồi', 'đũa', 'muỗng', 'thìa', 'dao', 'thớt', 'khay', 'thố', 'hũ', 'lọ gia vị',
      'bếp gas', 'bếp từ', 'bếp hồng ngoại', 'lò vi sóng', 'lò nướng', 'nồi áp suất', 'nồi chiên không dầu', 'ấm đun', 'ấm siêu tốc', 'ấm điện', 'máy hút mùi', 'bình nước', 'bình hoa', 'bình gốm', 'bình sứ']
  },
  { key: 'toiletry', patterns: ['mỹ phẩm', 'đồ vệ sinh', 'dầu gội', 'sữa tắm', 'xà bông', 'bàn chải', 'kem đánh răng', 'giấy vệ sinh', 'khăn tắm', 'kem', 'nước hoa', 'son'] },
  {
    key: 'electronics', patterns: ['máy tính xách tay', 'laptop', 'máy tính bảng', 'tablet', 'máy sấy', 'máy pha cà phê', 'bàn là', 'máy xay', 'bếp điện', 'nồi cơm điện',
      'loa', 'amply', 'dàn âm thanh', 'máy chiếu', 'máy in', 'router', 'modem', 'ổ cắm', 'thiết bị điện nhỏ']
  },
  {
    key: 'box', patterns: ['thùng carton', 'thùng hàng', 'thùng xốp', 'bao tải', 'túi nilon', 'giỏ nhựa', 'sọt', 'vali', 'rương', 'balo', 'ba lô', 'thùng',
      'xe đẩy hàng', 'xe đẩy', 'tủ nhựa', 'tủ ngăn kéo nhựa', 'tủ ngăn kéo', 'kệ ngăn kéo nhựa', 'kệ ngăn kéo', 'kệ nhựa', 'hộp nhựa', 'hộp']
  },
];


/**
 * Match an item name to a secondary catalog key.
 * @param {string} name
 * @returns {string|null} key or null
 */
export const matchSecondaryKey = (name = '') => {
  const lower = name.toLowerCase();
  for (const { key, patterns } of SECONDARY_KEY_RULES) {
    if (patterns.some(p => lower.includes(p))) return key;
  }
  return null;
};

/**
 * Normalizes Vietnamese condition strings from AI to backend enums ('GOOD', 'FRAGILE', 'DAMAGED').
 * @param {string} cond - raw condition from AI
 * @returns {string} - standardized enum
 */
export const normalizeCondition = (cond = '') => {
  if (!cond) return 'GOOD';
  const c = cond.trim().toUpperCase();

  // FRAGILE keywords
  if (['DỄ VỠ', 'DE VO', 'FRAGILE', 'CẨN THẬN', 'CAN THAN'].some(k => c.includes(k))) {
    return 'FRAGILE';
  }

  // DAMAGED keywords
  if (['HƯ HỎNG', 'HU HONG', 'CŨ', 'CU', 'VỠ', 'VO', 'DAMAGED', 'TRẦY XƯỚC', 'TRAY XUOC'].some(k => c.includes(k))) {
    return 'DAMAGED';
  }

  // DEFAULT/GOOD
  return 'GOOD';
};

// ─── CATALOG CATEGORY HINTS ──────────────────────────────────────────────────
// Maps Vietnamese item name patterns → PRIMARY_CATALOG category name.
// If a hint is found, scoring is restricted to only that category's presets.
// If NO hint matches, the item is treated as unmatched (avoids wrong-category guesses).
const CATALOG_CATEGORY_HINTS = [
  {
    catalog: 'Giường',
    patterns: ['giường đơn', 'giường đôi', 'giường king', 'giường queen', 'giường ngủ', 'giường tầng', 'khung giường', 'nệm', 'đệm', 'divan', 'vạt giường'],
  },
  {
    catalog: 'Tủ quần áo',
    patterns: ['tủ quần áo', 'tủ áo', 'tủ đứng', 'tủ đựng quần', 'tủ đầu giường', 'táplô'],
  },
  {
    catalog: 'Sofa',
    patterns: ['sofa', 'ghế sofa', 'bộ ghế sofa', 'bộ ghế salon', 'ghế salon', 'ghế ăn', 'ghế phòng ăn', 'bộ ghế ăn', 'ghế lười', 'ghế bành', 'armchair', 'ghế dài', 'ghế dựa'],
  },
  {
    catalog: 'Tủ lạnh',
    patterns: ['tủ lạnh', 'tủ đông', 'tủ mát', 'minibar'],
  },
  {
    catalog: 'Máy giặt',
    patterns: ['máy giặt', 'máy giặt sấy', 'máy sấy quần áo'],
  },
  {
    catalog: 'Tivi',
    patterns: ['tivi', 'ti vi', 'màn hình tv', 'màn hình tivi', 'television', 'smart tv'],
  },
  {
    catalog: 'Bàn ăn / bàn làm việc',
    patterns: ['bàn ăn', 'bàn làm việc', 'bàn học', 'bàn gỗ', 'bộ bàn ăn',
      'bàn cà phê', 'bàn trà', 'coffee table', 'bàn console', 'bàn trung tâm',
      'bàn phụ', 'bàn trang điểm', 'bàn đầu giường', 'bàn xếp', 'bàn nhựa', 'bàn đá', 'bàn'],
  },
  {
    catalog: 'Kệ sách / tủ hồ sơ',
    patterns: ['kệ sách', 'tủ sách', 'kệ hồ sơ', 'tủ hồ sơ', 'kệ đựng sách',
      'tủ trang trí', 'tủ trưng bày', 'kệ trưng bày', 'tủ đựng đồ', 'tủ thấp',
      'kệ gỗ', 'kệ tầng', 'kệ đa tầng', 'gia kệ', 'kệ sắt', 'kệ inox', 'tủ giày', 'kệ'],
  },
  {
    catalog: 'Máy tính để bàn',
    patterns: ['máy tính để bàn', 'bộ máy tính', 'máy vi tính', 'pc desktop'],
  },
  {
    catalog: 'Điều hòa',
    patterns: ['điều hòa', 'điều hoà', 'máy lạnh', 'dàn lạnh', 'máy lạnh đứng', 'điều hòa trung tâm'],
  },
  {
    catalog: 'Xe máy',
    patterns: ['xe máy', 'xe số', 'xe tay ga', 'xe ga', 'mô tô', 'xe đạp điện'],
  },
];

/**
 * Returns the catalog category name that best hints for this item name, or null.
 * @param {string} name  Vietnamese item name from AI
 * @returns {string|null}
 */
const getCategoryHint = (name = '') => {
  const lower = name.toLowerCase();
  for (const { catalog, patterns } of CATALOG_CATEGORY_HINTS) {
    if (patterns.some(p => lower.includes(p))) return catalog;
  }
  return null;
};

// ─── Scoring ─────────────────────────────────────────────────────────────────

/**
 * Compute a similarity score between an AI item and a catalog preset.
 * Lower score = better match.
 */
export const computeScore = (aiVolume, aiWeight, catVolume, catWeight) => {
  const volumeDiff = catVolume > 0
    ? Math.abs(aiVolume - catVolume) / catVolume
    : Math.abs(aiVolume - catVolume);
  const weightDiff = catWeight > 0
    ? Math.abs(aiWeight - catWeight) / catWeight
    : Math.abs(aiWeight - catWeight);
  return VOLUME_WEIGHT * volumeDiff + WEIGHT_WEIGHT * weightDiff;
};

/**
 * Match a single AI primary item to the closest entry in PRIMARY_CATALOG.
 *
 * Uses category-hint matching: if the item name implies a specific catalog category,
 * scoring is restricted to that category's presets.
 * If no hint is found → returns null (avoids semantic mismatches like "desk → TV").
 *
 * @param {object} aiItem   - AI output item { name, actualVolume, actualWeight, ... }
 * @param {Array}  catalog  - PRIMARY_CATALOG array
 * @returns {{ catalogName, preset, presetIndex, score, confidence } | null}
 */
export const matchPrimaryCatalog = (aiItem, catalog) => {
  const aiVolume = aiItem.actualVolume || 0;
  const aiWeight = aiItem.actualWeight || 0;

  // Determine which catalog categories to consider
  const hint = getCategoryHint(aiItem.name || '');
  const candidateCategories = hint
    ? catalog.filter(cat => cat.name === hint)
    : catalog; // no hint → consider all (but threshold will be stricter implicitly)

  // If hint was given but no catalog entry matches, immediately unmatch
  if (hint && candidateCategories.length === 0) return null;

  // If no hint at all → treat as unmatched (no semantic clue = risk of wrong category)
  if (!hint) return null;

  let bestCatalogName = null;
  let bestPreset = null;
  let bestPresetIndex = -1;
  let bestScore = Infinity;

  for (const cat of candidateCategories) {
    for (let i = 0; i < cat.presets.length; i++) {
      const preset = cat.presets[i];
      const score = computeScore(aiVolume, aiWeight, preset.volume, preset.weight);
      if (score < bestScore) {
        bestScore = score;
        bestCatalogName = cat.name;
        bestPreset = preset;
        bestPresetIndex = i;
      }
    }
  }

  if (bestPreset === null || bestScore > POOR_MATCH_THRESHOLD) return null;

  const confidence = Math.max(0, Math.min(1, 1 - bestScore));

  return {
    catalogName: bestCatalogName,
    preset: bestPreset,
    presetIndex: bestPresetIndex,
    score: bestScore,
    confidence,
  };
};

// ─── SECONDARY CATALOG reference (label lookup only) ─────────────────────────
// Mirrors the main SECONDARY_CATALOG defined in SurveyInput — used for preview labels.
const SECONDARY_CATALOG_LABELS = {
  bowl: 'Chén bát / Ly tách',
  lamp: 'Đèn bàn / đèn ngủ',
  clock: 'Đồng hồ',
  plant: 'Cây cảnh / chậu hoa',
  fan: 'Quạt điện',
  book: 'Sách vở / tài liệu',
  mirror: 'Gương / Tranh ảnh',
  curtain: 'Rèm cửa',
  toy: 'Đồ chơi trẻ em',
  shoes: 'Giày dép / hộp',
  clothes: 'Quần áo',
  kitchen: 'Dụng cụ bếp',
  toiletry: 'Đồ vệ sinh / mỹ phẩm',
  electronics: 'Thiết bị điện nhỏ',
  box: 'Thùng / Vali / Túi',
};

// ─── Main API ─────────────────────────────────────────────────────────────────

/**
 * Normalize a list of AI items into three groups ready for the survey form.
 * Strategy:
 *   1. Try secondary key match first (regardless of AI category flag)
 *   2. If no secondary match → try primary catalog match (requires a category hint)
 *   3. If still no match → unmatchedPrimary (shown as raw editable row)
 */
export const normalizeAIItems = (
  aiItems = [],
  primaryCatalog = [],
  // secondaryCatalog and secondaryKeyRules params kept for backward compat but unused
  // (service now uses its own exported rules)
  _secondaryCatalog,
  _secondaryKeyRules,
  _matchSecondaryKey,
) => {
  const mappedPrimary = [];
  const unmatchedPrimary = [];
  const newSecondary = [];
  const seenSecondaryKeys = new Set();

  for (const aiItem of aiItems) {
    // ── 1. Try secondary catalog match (name-based, ignores AI category) ──────
    const secondaryKey = matchSecondaryKey(aiItem.name);
    if (secondaryKey) {
      if (!seenSecondaryKeys.has(secondaryKey)) {
        seenSecondaryKeys.add(secondaryKey);
        newSecondary.push({ key: secondaryKey });
      }
      continue;
    }

    // ── 2. Try primary catalog match (requires a semantic hint) ───────────────
    const match = matchPrimaryCatalog(aiItem, primaryCatalog);
    if (match) {
      mappedPrimary.push({
        name: `${match.catalogName} (${match.preset.label})`,
        actualVolume: match.preset.volume,
        actualWeight: match.preset.weight,
        condition: normalizeCondition(aiItem.condition),
        notes: aiItem.notes || '',
        _source: 'AI_MAPPED',
        _confidence: match.confidence,
        _aiRaw: {
          name: aiItem.name,
          volume: aiItem.actualVolume,
          weight: aiItem.actualWeight,
          dimensions: aiItem.actualDimensions || null,
          imageIndices: Array.isArray(aiItem.imageIndices) ? aiItem.imageIndices : [],
          boundingBoxes: Array.isArray(aiItem.boundingBoxes) ? aiItem.boundingBoxes : [],
        },
        _catalogName: match.catalogName,
        _presetIndex: match.presetIndex,
      });
      continue;
    }

    // ── 3. No match → raw fallback ────────────────────────────────────────────
    unmatchedPrimary.push({
      name: aiItem.name,
      actualWeight: aiItem.actualWeight || 0,
      actualVolume: aiItem.actualVolume || 0,
      condition: normalizeCondition(aiItem.condition),
      notes: aiItem.notes || '',
      _source: 'AI_RAW',
      _aiRaw: {
        name: aiItem.name,
        volume: aiItem.actualVolume,
        weight: aiItem.actualWeight,
        dimensions: aiItem.actualDimensions || null,
        imageIndices: Array.isArray(aiItem.imageIndices) ? aiItem.imageIndices : [],
        boundingBoxes: Array.isArray(aiItem.boundingBoxes) ? aiItem.boundingBoxes : [],
      },
    });
  }

  return { mappedPrimary, unmatchedPrimary, newSecondary };
};

/**
 * For the AIVisionAnalyzer preview: returns a display-ready list.
 * Each item is enriched with:
 *   - `_match`          → primary catalog match info (or null)
 *   - `_secondaryKey`   → matched secondary catalog key (or null)
 *   - `_secondaryLabel` → human label for secondary catalog (or null)
 */
export const buildPreviewItems = (aiItems = [], primaryCatalog = []) => {
  return aiItems.map(aiItem => {
    // Try secondary match first
    const secondaryKey = matchSecondaryKey(aiItem.name);
    if (secondaryKey) {
      return {
        ...aiItem,
        _match: null,
        _secondaryKey: secondaryKey,
        _secondaryLabel: SECONDARY_CATALOG_LABELS[secondaryKey] || secondaryKey,
      };
    }

    // Try primary catalog match
    const match = matchPrimaryCatalog(aiItem, primaryCatalog);
    return {
      ...aiItem,
      _match: match || null,
      _secondaryKey: null,
      _secondaryLabel: null,
    };
  });
};
