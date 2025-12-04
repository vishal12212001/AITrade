

import { Trade, TradeType, MTAccount, CopierSettings, LotSizingMode } from '../types';
import { AVAILABLE_SYMBOLS } from '../constants';

// Helper to generate a random ticket
const generateTicket = () => Math.floor(Math.random() * 100000000);

// Helper to simulate price movement
export const simulateTick = (currentPrice: number): number => {
  const move = (Math.random() - 0.5) * 0.0005;
  return currentPrice + move;
};

// --- Smart Symbol Matching Logic ---

export const getBrokerSymbols = (serverName: string): string[] => {
  const baseSymbols = AVAILABLE_SYMBOLS.map(s => s.symbol);
  
  const server = serverName.toLowerCase();

  // Simulate brokers with suffixes
  if (server.includes('pro') || server.includes('raw') || server.includes('zero')) {
    return baseSymbols.map(s => `${s}.pro`);
  }
  
  if (server.includes('icmarkets')) {
    return baseSymbols.map(s => `${s}.a`);
  }

  // Simulate brokers with prefixes
  if (server.includes('edge') || server.includes('ecn')) {
    return baseSymbols.map(s => `x${s}`);
  }

  // Simulate brokers with different formatting
  if (server.includes('exness')) {
    return baseSymbols.map(s => `${s}m`);
  }
  
  // Simulate brokers with separators
  if (server.includes('old') || server.includes('bank')) {
      return baseSymbols.map(s => s.length === 6 ? `${s.substring(0,3)}/${s.substring(3)}` : s);
  }

  // Default Standard Symbols
  return baseSymbols;
};

const getBaseSymbol = (symbol: string): string => {
  let base = symbol.toUpperCase(); // Normalize case first

  // 0. Remove common separators (slash, dash, space) inside symbol
  base = base.replace(/[\/\-\s]/g, '');

  // 1. Remove known suffixes
  base = base.replace(/[\._](pro|ecn|raw|std|mini|micro|[a-z0-9]{1,4})$/i, '');
  
  // 2. Remove trailing special chars
  base = base.replace(/[\W]+$/, '');

  // 3. Remove common prefixes
  const prefixMatch = base.match(/^([a-z0-9]{1,3})([A-Z]{6})$/i);
  if (prefixMatch) {
      base = prefixMatch[2];
  }
  
  base = base.replace(/^([a-z0-9]{1,3}[._])/, ''); 

  return base;
};

export const matchSymbol = (sourceSymbol: string, destinationSymbols: string[]): string => {
  const sourceUpper = sourceSymbol.toUpperCase();

  const exact = destinationSymbols.find(s => s.toUpperCase() === sourceUpper);
  if (exact) return exact;

  const baseSource = getBaseSymbol(sourceSymbol);

  const baseMatch = destinationSymbols.find(s => s.toUpperCase() === baseSource);
  if (baseMatch) return baseMatch;

  const normalizedMatch = destinationSymbols.find(s => {
      const sClean = s.toUpperCase().replace(/[\/\-\s]/g, '');
      return sClean === baseSource || getBaseSymbol(s) === baseSource;
  });
  if (normalizedMatch) return normalizedMatch;

  const suffixMatch = destinationSymbols.find(s => {
      const sBase = getBaseSymbol(s);
      return sBase === baseSource;
  });
  if (suffixMatch) return suffixMatch;

  const prefixMatch = destinationSymbols.find(s => s.toUpperCase().endsWith(baseSource));
  if (prefixMatch) return prefixMatch;

  const fuzzyMatch = destinationSymbols.find(s => s.toUpperCase().includes(baseSource));
  if (fuzzyMatch) return fuzzyMatch;

  return sourceSymbol;
};

// Logic to open a trade on the destination based on source
export const copyTrade = (sourceTrade: Trade, sourceAccount: MTAccount, destinationAccount: MTAccount, settings: CopierSettings): Trade => {
  
  // --- Lot Sizing Logic ---
  let calculatedLots = 0;

  if (settings.lotSizingMode === LotSizingMode.EQUITY_RATIO) {
      // Scale based on equity difference
      // e.g. Master 100k, Slave 10k => Ratio 0.1
      const ratio = destinationAccount.equity / (sourceAccount.equity || 1);
      calculatedLots = sourceTrade.lots * ratio;
  } 
  else if (settings.lotSizingMode === LotSizingMode.RISK_PERCENT) {
      // Risk X% of destination balance
      // Requires Stop Loss to calculate precisely.
      if (sourceTrade.stopLoss && sourceTrade.stopLoss > 0) {
          const riskAmount = destinationAccount.equity * (settings.riskPerTradePercent / 100);
          const priceDiff = Math.abs(sourceTrade.openPrice - sourceTrade.stopLoss);
          
          if (priceDiff > 0) {
            // Simplified standard lot calculation (assuming USD base)
            // 1 Lot = 100,000 units. PriceDiff * 100000 = Loss per lot
            const lossPerLot = priceDiff * 100000;
            calculatedLots = riskAmount / lossPerLot;
          } else {
             calculatedLots = sourceTrade.lots; // Fallback
          }
      } else {
          // Fallback to Equity Ratio if no SL provided
          const ratio = destinationAccount.equity / (sourceAccount.equity || 1);
          calculatedLots = sourceTrade.lots * ratio;
      }
  } 
  else {
      // FIXED Multiplier
      calculatedLots = sourceTrade.lots * settings.lotMultiplier;
  }

  // Enforce Min/Max
  const lots = Math.max(parseFloat(calculatedLots.toFixed(2)), settings.forceMinLot);
  
  let type = sourceTrade.type;
  if (settings.reverseTrade) {
    type = sourceTrade.type === TradeType.BUY ? TradeType.SELL : TradeType.BUY;
  }

  // --- Symbol Normalization ---
  const destSymbols = getBrokerSymbols(destinationAccount.server);
  const matchedSymbol = matchSymbol(sourceTrade.symbol, destSymbols);

  // Calculate generic price
  const priceBase = getBaseSymbol(matchedSymbol);
  const baseSymbolData = AVAILABLE_SYMBOLS.find(s => priceBase.includes(s.symbol)) || AVAILABLE_SYMBOLS[0];
  const price = type === TradeType.BUY ? baseSymbolData.ask : baseSymbolData.bid;

  // TP/SL Logic with overrides
  let takeProfit = settings.copyTakeProfit ? sourceTrade.takeProfit : 0;
  let stopLoss = settings.copyStopLoss ? sourceTrade.stopLoss : 0;

  if (destinationAccount.defaultTakeProfit && destinationAccount.defaultTakeProfit > 0) {
      const tpPercent = destinationAccount.defaultTakeProfit;
      const tpDistance = price * (tpPercent / 100);
      takeProfit = type === TradeType.BUY ? price + tpDistance : price - tpDistance;
      takeProfit = parseFloat(takeProfit.toFixed(5));
  }

  if (destinationAccount.defaultStopLoss && destinationAccount.defaultStopLoss > 0) {
      const slPercent = destinationAccount.defaultStopLoss;
      const slDistance = price * (slPercent / 100);
      stopLoss = type === TradeType.BUY ? price - slDistance : price + slDistance;
      stopLoss = parseFloat(stopLoss.toFixed(5));
  }

  return {
    ...sourceTrade,
    id: `dest-${Date.now()}-${Math.random()}`,
    ticket: generateTicket(),
    symbol: matchedSymbol, 
    lots: parseFloat(lots.toFixed(2)),
    type,
    openPrice: price,
    currentPrice: price,
    profit: 0, 
    stopLoss,
    takeProfit,
    comment: settings.stealthMode ? "" : `Copy from #${sourceTrade.ticket}`,
    internalSourceTicket: sourceTrade.ticket,
    magic: settings.stealthMode ? 0 : 9999
  };
};

// Calculate profit based on price movement
export const calculateProfit = (trade: Trade): number => {
  const pipValue = 10; 
  const diff = trade.type === TradeType.BUY 
    ? trade.currentPrice - trade.openPrice 
    : trade.openPrice - trade.currentPrice;
  
  return parseFloat((diff * 100000 * trade.lots).toFixed(2));
};