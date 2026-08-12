import { CartSettings } from '../types';

export interface FormattedPrice {
  primary: string;
  secondary: string;
  fullDisplay: string;
  usdFormatted: string;
  lbpFormatted: string;
  usdNumeric: number;
  lbpNumeric: number;
}

/**
 * Calculates and formats dual currency prices (USD $ and LBP ل.ل.)
 * based on exchange rate and base currency settings.
 */
export function formatDualPrice(price: number, settings: CartSettings): FormattedPrice {
  const isDual = settings.enable_dual_currency ?? true;
  const rate = settings.exchange_rate && settings.exchange_rate > 0 ? settings.exchange_rate : 89500;
  const baseCurr = settings.base_currency || 'USD';

  let usdNum = 0;
  let lbpNum = 0;

  if (baseCurr === 'USD') {
    usdNum = Number(price) || 0;
    lbpNum = Math.round(usdNum * rate);
  } else {
    lbpNum = Number(price) || 0;
    usdNum = rate > 0 ? lbpNum / rate : 0;
  }

  const usdFormatted = `$${usdNum.toLocaleString('en-US', {
    minimumFractionDigits: usdNum % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

  const lbpFormatted = `${lbpNum.toLocaleString('ar-LB')} ل.ل.`;

  if (!isDual) {
    const singleSymbol = settings.currency || (baseCurr === 'USD' ? '$' : 'ل.ل.');
    const singleDisplay = `${Number(price).toLocaleString()} ${singleSymbol}`;
    return {
      primary: singleDisplay,
      secondary: '',
      fullDisplay: singleDisplay,
      usdFormatted,
      lbpFormatted,
      usdNumeric: usdNum,
      lbpNumeric: lbpNum,
    };
  }

  if (baseCurr === 'USD') {
    return {
      primary: usdFormatted,
      secondary: lbpFormatted,
      fullDisplay: `${usdFormatted} (${lbpFormatted})`,
      usdFormatted,
      lbpFormatted,
      usdNumeric: usdNum,
      lbpNumeric: lbpNum,
    };
  } else {
    return {
      primary: lbpFormatted,
      secondary: usdFormatted,
      fullDisplay: `${lbpFormatted} (${usdFormatted})`,
      usdFormatted,
      lbpFormatted,
      usdNumeric: usdNum,
      lbpNumeric: lbpNum,
    };
  }
}

/**
 * Converts a value from USD to LBP or vice versa based on exchange rate.
 */
export function convertCurrency(
  value: number,
  from: 'USD' | 'LBP',
  to: 'USD' | 'LBP',
  exchangeRate: number
): number {
  const rate = exchangeRate > 0 ? exchangeRate : 89500;
  if (from === to) return value;
  if (from === 'USD' && to === 'LBP') {
    return Math.round(value * rate);
  }
  if (from === 'LBP' && to === 'USD') {
    return rate > 0 ? Number((value / rate).toFixed(2)) : 0;
  }
  return value;
}
