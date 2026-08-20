import { boolean, date, integer, numeric, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const expenseCategory = pgEnum('expense_category', [
  'zarade_bonusi',
  'rezije',
  'zalihe',
  'odrzavanje',
  'ostalo',
])

export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  fullName: text('full_name').notNull(),
  membershipRenewalDate: date('membership_renewal_date', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  memberId: integer('member_id').references(() => members.id),
  memberNameRaw: text('member_name_raw').notNull(),
  paidAt: date('paid_at', { mode: 'date' }).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const storeProducts = pgTable('store_products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  defaultPrice: numeric('default_price', { precision: 12, scale: 2 }).notNull(),
  active: boolean('active').notNull().default(true),
})

export const storeSales = pgTable('store_sales', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .notNull()
    .references(() => storeProducts.id),
  soldAt: date('sold_at', { mode: 'date' }).notNull(),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  expenseDate: date('expense_date', { mode: 'date' }).notNull(),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  category: expenseCategory('category').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const capitalInvestments = pgTable('capital_investments', {
  id: serial('id').primaryKey(),
  investedAt: date('invested_at', { mode: 'date' }).notNull(),
  amountEur: numeric('amount_eur', { precision: 12, scale: 2 }).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

// numeric(10,7) holds the full coordinate range (-180.0000000) at ~1cm
// resolution, and keeps the string round-tripping the other numeric columns
// in this schema already use.
export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 7 }).notNull(),
  longitude: numeric('longitude', { precision: 10, scale: 7 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
