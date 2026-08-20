import { boolean, date, integer, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

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

// Categories were a pgEnum, which meant adding one needed a migration and a
// deploy. They are a table now so they can be managed from the app. `slug` is
// kept for the five originals: it is what categorizeExpense matches on during
// CSV import, and what the message catalog keys off so they still translate.
// Categories added later have no slug and display the name as typed.
export const expenseCategories = pgTable('expense_categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  expenseDate: date('expense_date', { mode: 'date' }).notNull(),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  categoryId: integer('category_id')
    .notNull()
    .references(() => expenseCategories.id),
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
