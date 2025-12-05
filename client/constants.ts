import { MTAccount, Platform, AccountRole, ConnectionStatus, CopierSettings, LotSizingMode } from './types';

export const INITIAL_SETTINGS: CopierSettings = {
  isEnabled: false,
  stealthMode: false,
  
  // Lot Sizing Defaults
  lotSizingMode: LotSizingMode.FIXED,
  lotMultiplier: 1.0,
  riskPerTradePercent: 1.0,

  copyStopLoss: true,
  copyTakeProfit: true,
  reverseTrade: false,
  maxSlippagePoints: 5,
  forceMinLot: 0.01,
  riskRatio: 1.0,
  latencyEnabled: true,
  latencyMs: 100, 
  requireConfirmation: false, 
  
  // Global Pairs
  managedPairs: ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "US30"],

  // Connection / App Mode
  appMode: 'LIVE',                                          //  ⬅ FIXED
  apiUrl: 'https://ai-trade-backend-3j8e.onrender.com/api',
     //  ⬅ FIXED
  apiSecret: '',

  // AI Defaults
  aiAutoTradeEnabled: false,
  aiTradingMode: 'SCALP',
  aiMaxOpenTrades: 5,
  aiAllowedSymbols: ["EURUSD", "GBPUSD", "XAUUSD"],
  aiConfidenceThreshold: 75,
  aiTakeProfitPercent: 0.5,
  
  // Daily Limits Defaults
  aiDailyProfitLimit: 2.0, 
  aiDailyMaxLoss: 2.0
};

export const MOCK_BROKERS = [
  "ICMarkets-Demo",
  "FTMO-Server",
  "Pepperstone-Edge",
  "Oanda-Live-1",
  "MetaQuotes-Demo"
];

export const AVAILABLE_SYMBOLS = [
  { symbol: "EURUSD", bid: 1.0850, ask: 1.0851 },
  { symbol: "GBPUSD", bid: 1.2630, ask: 1.2632 },
  { symbol: "USDJPY", bid: 151.20, ask: 151.22 },
  { symbol: "XAUUSD", bid: 2340.50, ask: 2341.10 },
  { symbol: "US30", bid: 39500.00, ask: 39505.00 }
];

export const MARKET_DATA_CONFIG = {
  enabled: true,
  apiEndpoint: 'https://api.binance.com/api/v3/ticker/price', 
  refreshRate: 5000,
  symbolMapping: {
    "BTCUSD": "BTCUSDT",
    "ETHUSD": "ETHUSDT",
    "XRPUSD": "XRPUSDT",
    "SOLUSD": "SOLUSDT",
    "LTCUSD": "LTCUSDT",
    "BNBUSD": "BNBUSDT"
  } as Record<string, string>
};
