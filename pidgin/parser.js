// Pidgin intent parser — rule based, no external NLU API needed.
// Designed to run fully offline on-device (and identically on the backend).

function parseAmount(text) {
  // Handles "47000", "47,000", "47k", "2.5k"
  // Takes the LAST matching number in the sentence — in Pidgin sale phrasing
  // ("I sell 5 bag rice for 47000") the price comes after the quantity, not before.
  const kMatches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*k\b/gi)];
  if (kMatches.length) return parseFloat(kMatches[kMatches.length - 1][1]) * 1000;

  const numMatches = [...text.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g)];
  if (!numMatches.length) return null;
  return parseFloat(numMatches[numMatches.length - 1][0].replace(/,/g, ''));
}

function parseAllAmounts(text) {
  const kMatches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*k\b/gi)].map(m => parseFloat(m[1]) * 1000);
  if (kMatches.length) return kMatches;
  return [...text.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g)].map(m => parseFloat(m[0].replace(/,/g, '')));
}

function parseQuantity(text) {
  const unitMatch = text.match(/\b(\d+)\s*(?:bag|bags|piece|pieces|carton|cartons|paint|paints|tin|tins|plate|plates)\b/i);
  if (unitMatch) return parseInt(unitMatch[1], 10);
  const verbQtyMatch = text.match(/\b(?:sell|buy|bought|don buy|restock)\s+(\d+)\b/i);
  if (verbQtyMatch) return parseInt(verbQtyMatch[1], 10);
  return 1;
}

function parseItem(text) {
  let t = text.replace(/\bfor\s+[\d,.]+k?\b.*$/i, '').replace(/\bat\s+[\d,.]+k?\b.*$/i, '');
  const verbMatch = t.match(/\b(?:sell|sold|sale|don sell|buy|bought|don buy|add stock|restock)\b\s+([\s\S]+)$/i);
  if (!verbMatch) return 'goods';
  let rest = verbMatch[1].trim();
  rest = rest.replace(/^\d+\s*/, '');
  rest = rest.replace(/^(bag|bags|piece|pieces|carton|cartons|paint|paints|tin|tins|plate|plates)\s+/i, '');
  rest = rest.replace(/^of\s+/i, '').trim();
  return rest || 'goods';
}

// "I don buy 50 garri for 200 each" -> 200. Returns null if no price stated,
// so a bare "I don buy 50 garri" doesn't wrongly reuse the quantity as cost.
function parseRestockCost(text) {
  const m = text.match(/\b(?:for|at)\s+([\d,.]+k?)\s*(?:each|per\s+\w+)?\b/i);
  return m ? parseAmount(m[0]) : null;
}
function parseCostItem(text) {
  let t = text.replace(/\b(set\s+)?cost\s+price\s+(for\s+)?/i, '');
  t = t.replace(/\bna\b/i, '').replace(/\d.*$/, '').trim();
  return t || 'goods';
}

// "I save 1000 for sewing machine" -> "sewing machine"; returns null if no goal named
function parseGoalName(text) {
  const m = text.match(/\bfor\s+([a-zA-Z\s]+?)$/i);
  if (!m) return null;
  return m[1].trim();
}

// "recipe jollof: rice 2000, pepper 500, oil 300 makes 5 plates"
function parseRecipe(text) {
  const nameMatch = text.match(/\brecipe\s+([a-zA-Z\s]+?)[:\-]/i);
  const recipeName = nameMatch ? nameMatch[1].trim() : 'dish';

  const makesMatch = text.match(/\bmakes\s+(\d+)/i);
  const yieldCount = makesMatch ? parseInt(makesMatch[1], 10) : 1;

  const afterColon = text.split(/[:\-]/)[1] || '';
  const beforeMakes = afterColon.split(/\bmakes\b/i)[0];
  const ingredientChunks = beforeMakes.split(',').map(s => s.trim()).filter(Boolean);

  const ingredients = ingredientChunks.map(chunk => {
    const amt = parseAmount(chunk);
    const name = chunk.replace(/[\d,.]+k?/gi, '').trim() || 'ingredient';
    return { name, cost: amt || 0 };
  });

  return { recipeName, yieldCount, ingredients };
}

// "cost of jollof" -> jollof
function parseRecipeQueryName(text) {
  const m = text.match(/\bcost of\s+([a-zA-Z\s]+)$/i);
  return m ? m[1].trim() : null;
}

// "when I go restock rice" / "when should I restock rice" -> rice
function parseRestockQueryItem(text) {
  const m = text.match(/\brestock\s+([a-zA-Z\s]+)$/i);
  return m ? m[1].trim() : 'goods';
}

// "reconcile cash 20000 pos 15000 transfer 5000"
function parseReconcile(text) {
  const cashMatch = text.match(/cash\s+([\d,.]+k?)/i);
  const posMatch = text.match(/pos\s+([\d,.]+k?)/i);
  const transferMatch = text.match(/transfer\s+([\d,.]+k?)/i);
  const parseOne = (m) => m ? parseAmount(m[0]) : 0;
  return {
    cash: parseOne(cashMatch),
    pos: parseOne(posMatch),
    transfer: parseOne(transferMatch),
  };
}

// "add apprentice 2348033334444 named Chinedu" -> { phone: "2348033334444", name: "Chinedu" }
function parseApprentice(text) {
  const phoneMatch = text.match(/\b(\d{10,14})\b/);
  const nameMatch = text.match(/\bnamed\s+([a-zA-Z]+)/i);
  return {
    apprenticePhone: phoneMatch ? phoneMatch[1] : null,
    apprenticeName: nameMatch ? nameMatch[1] : 'Apprentice',
  };
}

const INTENT_RULES = [
  { intent: 'DAILY_SUMMARY', test: t => /\b(how much.*today|today summary|wetin i make today|profit today)\b/i.test(t) },
  { intent: 'KOLO_BALANCE', test: t => /\b(kolo|savings)\b/i.test(t) && /\b(check|balance|how much)\b/i.test(t) },
  { intent: 'DEBT_QUERY', test: t => /\b(who owe|owing|debt|wettin dem owe)\b/i.test(t) },
  { intent: 'STOCK_QUERY', test: t => /\b(stock|how many.*left|wettin remain)\b/i.test(t) },
  { intent: 'RECONCILE', test: t => /\breconcile\b/i.test(t) },
  { intent: 'RECIPE_COST_QUERY', test: t => /\bcost of\b/i.test(t) },
  { intent: 'RECIPE_ADD', test: t => /\brecipe\b/i.test(t) && /\bmakes\b/i.test(t) },
  { intent: 'RESTOCK_PREDICTION_QUERY', test: t => /\bwhen\b.*\brestock\b/i.test(t) },
  { intent: 'TASK_QUERY', test: t => /\b(my task|today task|day task|what.*do today)\b/i.test(t) },
  { intent: 'LIFE_STAGES_QUERY', test: t => /\b(life stages|stages of.*business)\b/i.test(t) },
  { intent: 'NOTIFICATIONS_QUERY', test: t => /\b(notifications?|apprentice sale|wetin apprentice)\b/i.test(t) && /\b(check|any|show)\b/i.test(t) },
  { intent: 'ADD_APPRENTICE', test: t => /\badd apprentice\b/i.test(t) },
  { intent: 'BUSINESS_EVALUATE', test: t => /\b(want to start|should i start|evaluate|is.*business good|thinking of starting)\b/i.test(t) },
  { intent: 'SET_CAPITAL', test: t => /\b(my capital|set capital)\b/i.test(t) },
  { intent: 'SET_COST_PRICE', test: t => /\bcost price\b/i.test(t) },
  { intent: 'RECORD_SALE', test: t => /\b(sell|sold|sale|don sell)\b/i.test(t) },
  { intent: 'RECORD_EXPENSE', test: t => /\b(spend|spent|bought fuel|buy fuel|transport|paid for)\b/i.test(t) },
  { intent: 'KOLO_DEPOSIT', test: t => /\b(save|saved|kolo)\b/i.test(t) && !/\bcheck\b/i.test(t) },
  { intent: 'DEBT_RECORD', test: t => /\b(owe me|on credit|him go pay later)\b/i.test(t) },
  { intent: 'RESTOCK', test: t => /\b(restock|buy more|add stock|i don buy)\b/i.test(t) },
];

function parsePidgin(rawText) {
  const text = rawText.trim();
  const rule = INTENT_RULES.find(r => r.test(text));
  const intent = rule ? rule.intent : 'UNKNOWN';

  const result = { intent, raw: text };

  switch (intent) {
    case 'RECORD_SALE':
      result.item = parseItem(text);
      result.quantity = parseQuantity(text);
      result.amount = parseAmount(text);
      break;
    case 'RECORD_EXPENSE':
      result.amount = parseAmount(text);
      result.category = /transport|fuel/i.test(text) ? 'transport'
        : /food|chop/i.test(text) ? 'food'
        : /airtime|recharge/i.test(text) ? 'airtime'
        : 'other';
      break;
    case 'KOLO_DEPOSIT':
      result.amount = parseAmount(text);
      result.goalName = parseGoalName(text);
      break;
    case 'DEBT_RECORD': {
      result.amount = parseAmount(text);
      const nameMatch = text.match(/\b([A-Z][a-z]+)\b(?=.*owe)/);
      result.customerName = nameMatch ? nameMatch[1] : 'Customer';
      break;
    }
    case 'RESTOCK':
      result.item = parseItem(text);
      result.quantity = parseQuantity(text);
      result.unitCost = parseRestockCost(text);
      break;
    case 'SET_COST_PRICE':
      result.item = parseCostItem(text);
      result.amount = parseAmount(text);
      break;
    case 'SET_CAPITAL':
      result.amount = parseAmount(text);
      break;
    case 'RECIPE_ADD':
      Object.assign(result, parseRecipe(text));
      break;
    case 'RECIPE_COST_QUERY':
      result.recipeName = parseRecipeQueryName(text) || 'dish';
      break;
    case 'RESTOCK_PREDICTION_QUERY':
      result.item = parseRestockQueryItem(text);
      break;
    case 'RECONCILE':
      Object.assign(result, parseReconcile(text));
      break;
    case 'ADD_APPRENTICE':
      Object.assign(result, parseApprentice(text));
      break;
    default:
      break;
  }

  return result;
}

module.exports = { parsePidgin, parseAmount, parseAllAmounts, parseQuantity, parseItem };
