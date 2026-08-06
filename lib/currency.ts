export const BILLING_CURRENCY_CODE = "GBP";
export const BILLING_CURRENCY_CODE_LOWER = "gbp";
export const BILLING_CURRENCY_SYMBOL = "£";
export const BILLING_CURRENCY_LOCALE = "en-GB";
export const MIN_TOP_UP_AMOUNT = 5;

export function formatBillingCurrency(
  value: number,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(BILLING_CURRENCY_LOCALE, {
    style: "currency",
    currency: BILLING_CURRENCY_CODE,
    ...options,
  }).format(value);
}
