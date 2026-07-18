import type { AccountEntryCategory, PaymentMethod } from "../types";

export const INCOME_CATEGORIES: AccountEntryCategory[] = ["membership_fee", "aid", "fine"];
export const EXPENSE_CATEGORIES: AccountEntryCategory[] = ["petty_cash", "project", "bank_payment"];
export const PAYMENT_METHODS: PaymentMethod[] = ["cash", "bank"];
