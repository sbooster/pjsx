export function isPrimitive(value: any) {
    return value === null || ['string', 'number', 'bigint', 'boolean', 'symbol', 'undefined'].includes(typeof value);
}