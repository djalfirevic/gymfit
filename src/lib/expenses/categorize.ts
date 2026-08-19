export const EXPENSE_CATEGORIES = ['zarade_bonusi', 'rezije', 'zalihe', 'odrzavanje', 'ostalo'] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  zarade_bonusi: 'Zarade i bonusi',
  rezije: 'Režije',
  zalihe: 'Zalihe',
  odrzavanje: 'Održavanje',
  ostalo: 'Ostalo',
}

type Rule = { category: ExpenseCategory; keywords: string[] }

const RULES: Rule[] = [
  {
    category: 'zarade_bonusi',
    keywords: ['dnevnica', 'dnevnice', 'dmevnice', 'bonus'],
  },
  {
    category: 'rezije',
    keywords: ['gradska čistoća', 'gradska cistoca', 'internet', 'mts', 'struja', 'telekom', 'račun', 'racun'],
  },
  {
    category: 'zalihe',
    keywords: [
      'kolagen',
      'nocco',
      'čokoladic',
      'cokoladic',
      'pre-workout',
      'protein',
      'članske karte',
      'clanske karte',
    ],
  },
  {
    category: 'odrzavanje',
    keywords: [
      'čišćenje',
      'ciscenje',
      'hemija',
      'kese',
      'toalet',
      ' wc ',
      'wc šolj',
      'dezinsekcija',
      'deratizacija',
      'asepsol',
      'džak',
      'dzak',
      'kant',
      'klim',
    ],
  },
]

export function categorizeExpense(description: string): ExpenseCategory {
  const normalized = ` ${description.toLowerCase()} `
  for (const rule of RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.category
    }
  }
  return 'ostalo'
}
