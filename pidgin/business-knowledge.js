// Business Evaluation Tool — knowledge base.
// Figures are realistic estimates for Nigerian micro/small businesses, not
// exact data — framed as general guidance, never as guaranteed numbers.

const BUSINESSES = [
  {
    keywords: ['provision', 'provisions store', 'mini mart', 'convenience store'],
    name: 'Provision store',
    minCost: 150000, maxCost: 800000,
    successRate: 65,
    firstBuy: 'fast-moving items first — bread, drinks, seasoning cubes, sachet water',
    successFactors: [
      'Location near foot traffic matters more than size',
      'Restocking fast-sellers before they finish keeps customers loyal',
      'Buying in bulk from a wholesaler beats retail prices significantly',
    ],
  },
  {
    keywords: ['food', 'buka', 'restaurant', 'food vendor', 'canteen'],
    name: 'Food vending / buka',
    minCost: 100000, maxCost: 500000,
    successRate: 60,
    firstBuy: 'cooking gas or stove, big pots, and your first week of ingredients',
    successFactors: [
      'Consistency in taste matters more than menu variety',
      'A visible, busy location beats a hidden cheap one',
      'Portion control protects your profit margin daily',
    ],
  },
  {
    keywords: ['tailoring', 'fashion design', 'sewing', 'fashion'],
    name: 'Tailoring / fashion design',
    minCost: 200000, maxCost: 1000000,
    successRate: 55,
    firstBuy: 'a good sewing machine and basic tools before fabric stock',
    successFactors: [
      'Word of mouth from satisfied customers is your main growth engine',
      'Delivering on time builds trust faster than low prices',
      'Specializing in one style first beats trying to do everything',
    ],
  },
  {
    keywords: ['hairdressing', 'salon', 'barbing', 'barber'],
    name: 'Hairdressing / barbing salon',
    minCost: 250000, maxCost: 1500000,
    successRate: 58,
    firstBuy: 'chairs, mirrors, clippers or styling tools, and basic products',
    successFactors: [
      'Skilled hands matter more than a fancy shop',
      'A loyal customer base beats chasing new customers constantly',
      'Cleanliness and consistency keep customers coming back',
    ],
  },
  {
    keywords: ['phone repair', 'gadget repair', 'phone accessories', 'phone business'],
    name: 'Phone repairs / accessories',
    minCost: 100000, maxCost: 600000,
    successRate: 62,
    firstBuy: 'basic repair tools and a stock of common phone accessories',
    successFactors: [
      'Trust around customer data and honesty about repair cost builds reputation',
      'Knowing common faults for popular phone models saves repair time',
      'Location near a busy market or school area increases walk-ins',
    ],
  },
  {
    keywords: ['pos', 'agent banking', 'pos agent'],
    name: 'POS / agent banking',
    minCost: 150000, maxCost: 400000,
    successRate: 70,
    firstBuy: 'a POS terminal from a licensed provider and starting float cash',
    successFactors: [
      'Having enough cash float avoids turning away customers',
      'A visible, busy spot near a market or bus stop drives volume',
      'Low, clear charges build repeat customer trust',
    ],
  },
  {
    keywords: ['spare parts', 'auto parts', 'car parts'],
    name: 'Spare parts business',
    minCost: 500000, maxCost: 3000000,
    successRate: 50,
    firstBuy: 'fast-moving parts for common car brands in your area',
    successFactors: [
      'Knowing your customers cars (common brands locally) avoids dead stock',
      'Relationships with mechanics drive consistent referrals',
      'Genuine vs fake parts knowledge protects your reputation',
    ],
  },
  {
    keywords: ['laundry', 'dry cleaning'],
    name: 'Laundry / dry cleaning',
    minCost: 200000, maxCost: 1200000,
    successRate: 55,
    firstBuy: 'a washing machine or basic equipment and cleaning supplies',
    successFactors: [
      'Reliable turnaround time matters more than low prices',
      'Targeting offices/estates nearby gives steady repeat business',
      'Careful handling builds trust fast in this business',
    ],
  },
  {
    keywords: ['cosmetics', 'beauty products', 'makeup'],
    name: 'Cosmetics / beauty products',
    minCost: 100000, maxCost: 700000,
    successRate: 57,
    firstBuy: 'a small range of trusted, popular brands rather than many unknown ones',
    successFactors: [
      'Authenticity (no fakes) protects long-term reputation',
      'Social media presence drives a lot of sales in this category',
      'Knowing your customers skin types/preferences builds loyalty',
    ],
  },
  {
    keywords: ['bakery', 'bread', 'baking'],
    name: 'Bakery / bread business',
    minCost: 300000, maxCost: 2000000,
    successRate: 60,
    firstBuy: 'an oven, mixing equipment, and your first batch of ingredients',
    successFactors: [
      'Consistent quality matters more than fancy packaging',
      'Reliable delivery to shops/customers builds repeat orders',
      'Freshness management avoids wasted unsold stock',
    ],
  },
  {
    keywords: ['printing', 'photocopy', 'business center'],
    name: 'Printing / business center',
    minCost: 300000, maxCost: 1500000,
    successRate: 53,
    firstBuy: 'a reliable printer/photocopier and starting paper/ink supplies',
    successFactors: [
      'Location near schools or offices drives steady walk-in business',
      'Fast turnaround beats slightly cheaper but slower competitors',
      'Offering extra services (lamination, scanning) increases revenue per customer',
    ],
  },
];

function findBusiness(text) {
  const lower = text.toLowerCase();
  for (const biz of BUSINESSES) {
    if (biz.keywords.some(k => lower.includes(k))) return biz;
  }
  return null;
}

const LIFE_STAGES = [
  'Decide on a business',
  'Take off a business',
  'Continue a business',
  'Grow a business',
  'Sell a business',
];

module.exports = { BUSINESSES, findBusiness, LIFE_STAGES };
