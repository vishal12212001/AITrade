

export enum Platform {
  MT4 = 'MT4',
  MT5 = 'MT5'
}

export enum AccountRole {
  SOURCE = 'SOURCE',
  DESTINATION = 'DESTINATION'
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export enum TradeType {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum LotSizingMode {
  FIXED = 'FIXED',
  EQUITY_RATIO = 'EQUITY_RATIO',
  RISK_PERCENT = 'RISK_PERCENT'
}

export interface Trade {
  id: string;
  ticket: number;
  symbol: string;
  type: TradeType;
  lots: number;
  openPrice: number;
  openTime: string;
  stopLoss: number;
  takeProfit: number;
  currentPrice: number;
  profit: number;
  isClosed: boolean;
  closeTime?: string;
  closePrice?: number;
  comment?: string;
  internalSourceTicket?: number; // Used for tracking in Stealth Mode
  magic?: number;
}

export interface MTAccount {
  id: string;
  name: string;
  login: string;
  password?: string;
  server: string;
  platform: Platform;
  role: AccountRole;
  balance: number;
  equity: number;
  leverage: number;
  currency: string;
  status: ConnectionStatus;
  trades: Trade[];
  history: Trade[]; // Stores closed trades
  
  // Account Specific Settings
  defaultTakeProfit?: number; // Percentage
  defaultStopLoss?: number; // Percentage
  allowedPairs?: string[]; // List of symbols allowed to trade
}

export interface CopierSettings {
  isEnabled: boolean;
  stealthMode: boolean; // Hide comments and magic numbers
  
  // Lot Sizing Strategy
  lotSizingMode: LotSizingMode; 
  lotMultiplier: number; // Used for FIXED mode
  riskPerTradePercent: number; // Used for RISK_PERCENT mode
  
  copyStopLoss: boolean;
  copyTakeProfit: boolean;
  reverseTrade: boolean;
  maxSlippagePoints: number;
  forceMinLot: number;
  riskRatio: number; 
  
  // Connection Config
  appMode: 'SIMULATION' | 'LIVE';
  apiUrl: string;
  apiSecret: string;

  // New Features
  latencyEnabled: boolean;
  latencyMs: number;
  requireConfirmation: boolean; // Intercept trades for manual approval
  
  // Global Config
  managedPairs: string[]; // List of pairs available in the app
  
  // AI Auto-Trading Config
  aiAutoTradeEnabled: boolean;
  aiTradingMode: 'SCALP' | 'DAY' | 'SWING';
  aiMaxOpenTrades: number;
  aiAllowedSymbols: string[];
  aiConfidenceThreshold: number; // Minimum confidence to take a trade (0-100)
  aiTakeProfitPercent: number; // Target profit percentage per trade
  
  // Daily Limits
  aiDailyProfitLimit: number; // Daily Profit Target % (Stops trading if reached)
  aiDailyMaxLoss: number; // Daily Max Loss % (Stops trading if reached)
}

export interface PendingConfirmation {
  id: string;
  sourceTicket: number;
  sourceAccountName: string;
  sourceAccountId: string; // Added to help lookup source for calculation
  destAccountId: string;
  destAccountName: string;
  tradeDetails: Trade;
  timestamp: string;
}

export interface GeminiAnalysis {
  riskScore: number;
  summary: string;
  recommendations: string[];
  lastUpdated: string;
}

export interface MarketSentiment {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD' | 'CLOSE_ALL';
  reason: string;
  confidence: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  isVerified: boolean;
  joinedDate: string;
}