// Cookie names shared by the proxy (ref links) and the checkout.

/** Employee ref code from livrelb.com/r/amal or ?ref=amal (brief §5). */
export const REF_COOKIE = "livre_ref";
/** A readable flag set with the ref cookie: only visitors with it ask /api/whatsapp for an employee's number. */
export const REF_FLAG_COOKIE = "livre_ref_on";
/** Kept long: attribution never expires (the browser caps it at 400 days). */
export const REF_MAX_AGE = 60 * 60 * 24 * 400;

/** Ids of the orders placed from this browser: opens their confirmation page. */
export const ORDERS_COOKIE = "livre_orders";
export const ORDERS_MAX_AGE = 60 * 60 * 24 * 90;

export const REF_CODE = /^[a-z0-9-]{2,30}$/;

/** Signed customer id: this browser is remembered as her (checkout prefill, points). */
export const CUSTOMER_COOKIE = "livre_customer";
export const CUSTOMER_MAX_AGE = 60 * 60 * 24 * 365;
