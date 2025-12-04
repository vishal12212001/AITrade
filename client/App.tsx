

import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { AccountCard } from './components/AccountCard';
import { TradeTable } from './components/TradeTable';
import { HistoryTable } from './components/HistoryTable';
import { AddAccountModal } from './components/AddAccountModal';
import { AuthScreen } from './components/AuthScreen';
import { TradeConfirmationModal } from './components/TradeConfirmationModal';
import { MTAccount, Platform, AccountRole, ConnectionStatus, Trade, TradeType, CopierSettings, GeminiAnalysis, MarketSentiment, UserProfile, PendingConfirmation, LotSizingMode } from './types';
import { INITIAL_SETTINGS, MOCK_BROKERS, AVAILABLE_SYMBOLS, MARKET_DATA_CONFIG } from './constants';
import { simulateTick, copyTrade, calculateProfit } from './services/mockEngine';
import * as liveApiService from './services/liveApiService';
import { analyzeRisk, scanMarketConditions } from './services/geminiService';
import { Play, Pause, AlertTriangle, CheckCircle, RefreshCcw, Plus, BrainCircuit, Info, Clock, Zap, Bot, Target, TrendingUp, Shield, ShieldAlert, Globe, Wifi, WifiOff, PieChart, Ban, List, Trash2, ArrowRight, Scale, Percent, Calculator } from 'lucide-react';

const STORAGE_KEYS = {
  ACCOUNTS: 'METASYNC_ACCOUNTS',
  SETTINGS: 'METASYNC_SETTINGS',
  USER: 'METASYNC_USER'
};

const App: React.FC = () => {
  // --- Auth State ---
  const [user, setUser] = useState<UserProfile | null>(null);

  // --- App State ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [copierSettings, setCopierSettings] = useState<CopierSettings>(INITIAL_SETTINGS);
  const [geminiAnalysis, setGeminiAnalysis] = useState<GeminiAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastLog, setLastLog] = useState<string>('System initialized.');
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  
  // State for adding new pair
  const [newPairInput, setNewPairInput] = useState('');

  // Connection Error State for Live Mode
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Confirmation Queue
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([]);
  
  // AI Auto Trade State
  const [lastAutoTradeAction, setLastAutoTradeAction] = useState<MarketSentiment | null>(null);

  // Live Price Cache
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  // Initialize Accounts State
  const [accounts, setAccounts] = useState<MTAccount[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Latency Queue Ref
  const pendingTradesRef = useRef<Set<number>>(new Set());

  // --- Persistence Logic ---
  useEffect(() => {
    // Load data on startup
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
    if (savedUser) {
        setUser(JSON.parse(savedUser));
    }

    const savedAccounts = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);

    if (savedSettings) {
      setCopierSettings({ ...INITIAL_SETTINGS, ...JSON.parse(savedSettings) });
    }

    if (savedAccounts) {
      setAccounts(JSON.parse(savedAccounts));
    } else {
      // Default Demo Accounts if no storage
      setAccounts([
        {
          id: 'src-demo-1',
          name: 'FTMO Challenge Demo',
          login: '2093812',
          server: 'FTMO-Server',
          platform: Platform.MT5,
          role: AccountRole.SOURCE,
          balance: 100000,
          equity: 100000,
          leverage: 100,
          currency: 'USD',
          status: ConnectionStatus.CONNECTED,
          trades: [],
          history: []
        },
        {
          id: 'dest-demo-1',
          name: 'Live Account (ICMarkets)',
          login: '882190',
          server: 'ICMarkets-Live', 
          platform: Platform.MT4,
          role: AccountRole.DESTINATION,
          balance: 1500,
          equity: 1500,
          leverage: 500,
          currency: 'USD',
          status: ConnectionStatus.CONNECTED,
          trades: [],
          history: []
        }
      ]);
    }
    
    setIsInitialized(true);
  }, []);

  // Save on changes
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  }, [accounts, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(copierSettings));
  }, [copierSettings, isInitialized]);

  useEffect(() => {
      if (user) {
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      } else {
          localStorage.removeItem(STORAGE_KEYS.USER);
      }
  }, [user]);

  // --- Live Market Data Polling ---
  useEffect(() => {
    if (!MARKET_DATA_CONFIG.enabled || copierSettings.appMode === 'LIVE') return; // Only fetch in simulation mode to avoid conflicts

    const fetchPrices = async () => {
        try {
            const res = await fetch(MARKET_DATA_CONFIG.apiEndpoint);
            const data = await res.json();
            // Map the API response (assuming Binance array format) to our cache
            // Binance: [{symbol: 'BTCUSDT', price: '123'}, ...]
            const newPrices: Record<string, number> = {};
            if (Array.isArray(data)) {
                data.forEach((item: any) => {
                    newPrices[item.symbol] = parseFloat(item.price);
                });
                setLivePrices(prev => ({...prev, ...newPrices}));
            }
        } catch (e) {
            // Silent fail to avoid log spam, Simulation will fallback to pseudo prices
        }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, MARKET_DATA_CONFIG.refreshRate);
    return () => clearInterval(interval);
  }, [copierSettings.appMode]);


  // --- Auth Handlers ---
  const handleLogin = (newUser: UserProfile) => {
      setUser(newUser);
  };

  const handleLogout = () => {
      if (confirm("Are you sure you want to sign out?")) {
          setUser(null);
          setCopierSettings({ ...copierSettings, isEnabled: false }); 
      }
  };


  // --- Helpers ---
  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLastLog(`[${time}] ${msg}`);
  };
  
  // Helper to get price for dynamic symbols
  const getPseudoPrice = (symbol: string) => {
    // 1. Try fetching from Live Price Cache
    const mappedSymbol = MARKET_DATA_CONFIG.symbolMapping[symbol] || symbol;
    const livePrice = livePrices[mappedSymbol];
    
    if (livePrice) {
        // Create a simulated spread
        const isYen = symbol.includes('JPY');
        const spread = isYen ? 0.02 : 0.0001;
        // Jiggle slightly to show liveness between API polls
        const jitter = (Math.random() - 0.5) * (livePrice * 0.00005); 
        const bid = livePrice + jitter;
        return { symbol, bid: bid, ask: bid + spread };
    }

    // 2. Check if in known constants
    const known = AVAILABLE_SYMBOLS.find(s => s.symbol === symbol);
    if (known) return known;
    
    // 3. Generate pseudo price hash (Fallback)
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    
    const isYen = symbol.includes('JPY');
    const base = isYen ? 140 : 1.1000;
    const variation = (Math.abs(hash) % 1000) / (isYen ? 10 : 10000);
    
    const bid = base + variation;
    const ask = bid + (isYen ? 0.02 : 0.0001);
    
    return { symbol, bid, ask };
  };

  const calculateDailyMetrics = (account: MTAccount) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    const todayTrades = account.history.filter(t => 
        t.closeTime && new Date(t.closeTime).getTime() >= todayTimestamp
    );

    const todayProfit = todayTrades.reduce((sum, t) => sum + t.profit, 0);
    
    // Start Balance = Current Balance - Today's Profit (Assuming no deposits/withdrawals for simplicity)
    const startBalance = account.balance - todayProfit; 
    
    const percentage = startBalance > 0 ? (todayProfit / startBalance) * 100 : 0;
    
    return { todayProfit, percentage };
  };

  const handleAddAccount = async (newAccountData: Partial<MTAccount>) => {
    
    // LIVE MODE
    if (copierSettings.appMode === 'LIVE') {
      try {
        addLog(`Sending account creds to backend at ${copierSettings.apiUrl}...`);
        const addedAccount = await liveApiService.addLiveAccount(copierSettings.apiUrl, copierSettings.apiSecret, newAccountData);
        addLog(`Live Account ${addedAccount.login} added successfully.`);
        setAccounts(prev => [...prev, addedAccount]); 
      } catch (e) {
        addLog(`Error adding live account: ${e}`);
        alert(`Failed to add account to backend: ${e}`);
      }
      return;
    }

    // SIMULATION MODE
    const newId = `acc-${Date.now()}`;
    const newAccount: MTAccount = {
      id: newId,
      name: newAccountData.name || 'New Account',
      login: newAccountData.login || '000000',
      password: newAccountData.password,
      server: newAccountData.server || 'MetaQuotes-Demo',
      platform: newAccountData.platform || Platform.MT5,
      role: newAccountData.role || AccountRole.SOURCE,
      balance: 0, // Initial 0, will sync on connect
      equity: 0,
      leverage: 100,
      currency: 'USD',
      status: ConnectionStatus.CONNECTING, // Start as connecting
      trades: [],
      history: [],
      // Optional settings
      defaultTakeProfit: newAccountData.defaultTakeProfit,
      defaultStopLoss: newAccountData.defaultStopLoss,
      allowedPairs: newAccountData.allowedPairs
    };

    setAccounts(prev => [...prev, newAccount]);
    addLog(`Initiating connection to ${newAccount.server}...`);

    setTimeout(() => {
      const syncedBalance = Math.floor(Math.random() * (50000 - 5000 + 1) + 5000);
      setAccounts(prev => prev.map(a => 
        a.id === newId ? { 
            ...a, 
            status: ConnectionStatus.CONNECTED,
            balance: syncedBalance,
            equity: syncedBalance
        } : a
      ));
      addLog(`Connected to ${newAccount.login} successfully. Balance Synced: $${syncedBalance}`);
    }, 2500);
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to remove this account?')) return;

    if (copierSettings.appMode === 'LIVE') {
      try {
        await liveApiService.deleteLiveAccount(copierSettings.apiUrl, copierSettings.apiSecret, id);
        addLog(`Live account ${id} removed.`);
        setAccounts(prev => prev.filter(a => a.id !== id));
      } catch(e) {
        addLog(`Error removing live account: ${e}`);
      }
      return;
    }

    setAccounts(prev => prev.filter(a => a.id !== id));
    addLog(`Account removed.`);
  };

  // --- Confirmation Handlers ---
  const handleApproveTrade = async (confirmationId: string) => {
      const item = pendingConfirmations.find(p => p.id === confirmationId);
      if (!item) return;

      const sourceAccount = accounts.find(a => a.id === item.sourceAccountId);

      // Execute
      if (copierSettings.appMode === 'LIVE') {
         try {
           const destAccount = { id: item.destAccountId } as MTAccount; // Minimal object for reference
           // Need actual source account object for logic if possible, or fallback to item.tradeDetails
           const tradePayload = copyTrade(item.tradeDetails, sourceAccount || { equity: 100000 } as MTAccount, destAccount, copierSettings);
           await liveApiService.executeLiveTrade(copierSettings.apiUrl, copierSettings.apiSecret, tradePayload, item.destAccountId);
           addLog(`Approved & Sent #${item.sourceTicket} to API for ${item.destAccountName}`);
         } catch(e) {
           addLog(`API Execution Failed: ${e}`);
         }
      } else {
         // Mock execution
         setAccounts(latestAccounts => {
             const currentSource = latestAccounts.find(a => a.id === item.sourceAccountId) || { equity: 1 } as MTAccount;
            return latestAccounts.map(a => {
                if (a.id === item.destAccountId) {
                    const newTrade = copyTrade(item.tradeDetails, currentSource, a, copierSettings);
                    addLog(`Approved & Copied #${item.sourceTicket} to ${a.login}`);
                    return { ...a, trades: [...a.trades, newTrade] };
                }
                return a;
            });
         });
      }

      setPendingConfirmations(prev => prev.filter(p => p.id !== confirmationId));
  };

  const handleRejectTrade = (confirmationId: string) => {
      const item = pendingConfirmations.find(p => p.id === confirmationId);
      if (item) {
          addLog(`Trade #${item.sourceTicket} copy rejected by user.`);
          pendingTradesRef.current.add(item.sourceTicket); // Ignore future copies
      }
      setPendingConfirmations(prev => prev.filter(p => p.id !== confirmationId));
  };


  // --- MAIN LOOP: SIMULATION vs LIVE ---
  useEffect(() => {
    if (!user) return; 

    // LIVE MODE POLLING
    if (copierSettings.appMode === 'LIVE') {
       const pollInterval = setInterval(async () => {
          try {
             const liveAccounts = await liveApiService.fetchLiveState(copierSettings.apiUrl, copierSettings.apiSecret);
             setAccounts(liveAccounts);
             setApiError(null);
          } catch (e) {
             setApiError("Backend Server unreachable. Please run 'node server.js'");
          }
       }, 2000); 

       return () => clearInterval(pollInterval);
    } else {
        setApiError(null);
    }

    // SIMULATION MODE TICK LOOP
    const simInterval = setInterval(() => {
      setAccounts(prevAccounts => {
        return prevAccounts.map(account => {
          if (account.status !== ConnectionStatus.CONNECTED) return account;

          // 1. Update existing trades prices
          const updatedTrades = account.trades.map(trade => {
            const newPrice = simulateTick(trade.currentPrice);
            return {
              ...trade,
              currentPrice: newPrice,
              profit: calculateProfit({ ...trade, currentPrice: newPrice })
            };
          });

          // 2. Simulate Random New Trade on SOURCE 
          let newTrades = [...updatedTrades];
          let newHistory = [...(account.history || [])];

          // Simulate random trade creation logic...
          if (!copierSettings.aiAutoTradeEnabled && account.role === AccountRole.SOURCE && Math.random() > 0.985) {
            const availablePairs = copierSettings.managedPairs.length > 0 ? copierSettings.managedPairs : ['EURUSD'];
            const randomSymbolStr = availablePairs[Math.floor(Math.random() * availablePairs.length)];
            const randomSymbolData = getPseudoPrice(randomSymbolStr);
            
            const type = Math.random() > 0.5 ? TradeType.BUY : TradeType.SELL;
            const price = type === TradeType.BUY ? randomSymbolData.ask : randomSymbolData.bid;
            
            const newTrade: Trade = {
              id: `src-${Date.now()}`,
              ticket: Math.floor(Math.random() * 9000000),
              symbol: randomSymbolData.symbol,
              type,
              lots: parseFloat((Math.random() + 0.1).toFixed(2)),
              openPrice: price,
              currentPrice: price,
              openTime: new Date().toISOString(),
              stopLoss: 0,
              takeProfit: 0,
              profit: 0,
              isClosed: false
            };
            newTrades.push(newTrade);
            addLog(`Master [${account.login}] opened ${type} ${newTrade.lots} ${newTrade.symbol}`);
          }

          // Simulate Random Close logic...
          if (!copierSettings.aiAutoTradeEnabled && account.role === AccountRole.SOURCE && newTrades.length > 0 && Math.random() > 0.99) {
             const indexToClose = Math.floor(Math.random() * newTrades.length);
             const tradeToClose = newTrades[indexToClose];
             
             newHistory.unshift({
                 ...tradeToClose,
                 isClosed: true,
                 closeTime: new Date().toISOString(),
                 closePrice: tradeToClose.currentPrice
             });
             
             newTrades.splice(indexToClose, 1);
             addLog(`Master [${account.login}] closed #${tradeToClose.ticket} at profit ${tradeToClose.profit.toFixed(2)}`);
          }

          const totalProfit = newTrades.reduce((acc, t) => acc + t.profit, 0);

          return {
            ...account,
            trades: newTrades,
            history: newHistory,
            equity: account.balance + totalProfit
          };
        });
      });
    }, 1000); 

    return () => clearInterval(simInterval);
  }, [copierSettings.aiAutoTradeEnabled, copierSettings.appMode, copierSettings.apiUrl, copierSettings.managedPairs, user, livePrices]); 

  // --- AI Auto-Trader Loop ---
  useEffect(() => {
      if (!copierSettings.aiAutoTradeEnabled || !user) return;

      const scanInterval = setInterval(async () => {
          const sourceAcc = accounts.find(a => a.role === AccountRole.SOURCE);
          if (!sourceAcc) return;

          // ... (Existing AI Logic) ...
          const { percentage } = calculateDailyMetrics(sourceAcc);
          if (percentage >= copierSettings.aiDailyProfitLimit) return;
          if (percentage <= -copierSettings.aiDailyMaxLoss) return;

          const availablePairs = copierSettings.managedPairs;
          const allowedSymbolsData = availablePairs
             .filter(s => copierSettings.aiAllowedSymbols.includes(s))
             .map(s => getPseudoPrice(s));

          if (allowedSymbolsData.length === 0) return;
          const randomSymbolData = allowedSymbolsData[Math.floor(Math.random() * allowedSymbolsData.length)];
          
          try {
              const sentiment = await scanMarketConditions(randomSymbolData.ask, randomSymbolData.symbol);
              setLastAutoTradeAction(sentiment);

              if (sentiment.confidence < copierSettings.aiConfidenceThreshold) return; 

              if (sentiment.action === 'BUY' || sentiment.action === 'SELL') {
                  
                  if (sourceAcc.trades.length >= copierSettings.aiMaxOpenTrades) return;

                  if (copierSettings.appMode === 'LIVE') {
                      if (sourceAcc) {
                         const newTrade: Partial<Trade> = {
                            symbol: sentiment.symbol,
                            type: sentiment.action as TradeType,
                            lots: copierSettings.aiTradingMode === 'SCALP' ? 0.5 : 0.1,
                            comment: `AI-Auto`
                         };
                         await liveApiService.executeLiveTrade(copierSettings.apiUrl, copierSettings.apiSecret, newTrade, sourceAcc.id);
                         addLog(`AI AUTO (LIVE): Request sent for ${sentiment.action} ${sentiment.symbol}`);
                      }
                      return;
                  }

                  // SIMULATION EXECUTION
                  setAccounts(prev => prev.map(acc => {
                      if (acc.id === sourceAcc.id && acc.status === ConnectionStatus.CONNECTED) {
                          const price = sentiment.action === 'BUY' ? randomSymbolData.ask : randomSymbolData.bid;
                          let lotSize = 1.0;
                          if (copierSettings.aiTradingMode === 'SCALP') lotSize = 0.5;
                          if (copierSettings.aiTradingMode === 'SWING') lotSize = 0.1;

                          const tpPercent = copierSettings.aiTakeProfitPercent || 0.5;
                          const tpDistance = price * (tpPercent / 100);
                          const takeProfit = sentiment.action === 'BUY' ? price + tpDistance : price - tpDistance;

                          const newTrade: Trade = {
                            id: `ai-${Date.now()}`,
                            ticket: Math.floor(Math.random() * 9000000),
                            symbol: sentiment.symbol,
                            type: sentiment.action as TradeType,
                            lots: lotSize,
                            openPrice: price,
                            currentPrice: price,
                            openTime: new Date().toISOString(),
                            stopLoss: 0,
                            takeProfit: parseFloat(takeProfit.toFixed(5)),
                            profit: 0,
                            isClosed: false,
                            comment: `AI-Auto (${copierSettings.aiTradingMode})`
                          };
                          addLog(`AI AUTO-TRADER: Placed ${sentiment.action} on ${sentiment.symbol} (Conf: ${sentiment.confidence}%)`);
                          return { ...acc, trades: [...acc.trades, newTrade] };
                      }
                      return acc;
                  }));
              }
              
              if (sentiment.action === 'CLOSE_ALL') {
                  const tradesToClose = sourceAcc.trades.filter(t => t.symbol === sentiment.symbol);
                  if (tradesToClose.length === 0) return;

                  if (copierSettings.appMode === 'LIVE') {
                      for (const trade of tradesToClose) {
                          await liveApiService.closeLiveTrade(copierSettings.apiUrl, copierSettings.apiSecret, trade.ticket, sourceAcc.id);
                      }
                      addLog(`AI AUTO (LIVE): Closed ${tradesToClose.length} positions for ${sentiment.symbol} due to reversal signal.`);
                  } else {
                      setAccounts(prev => prev.map(acc => {
                          if (acc.id === sourceAcc.id) {
                              const closedTrades = acc.trades.filter(t => t.symbol === sentiment.symbol).map(t => ({
                                  ...t, isClosed: true, closeTime: new Date().toISOString(), closePrice: t.currentPrice, comment: 'AI Close'
                              }));
                              const totalPL = closedTrades.reduce((sum, t) => sum + t.profit, 0);
                              return {
                                  ...acc,
                                  trades: acc.trades.filter(t => t.symbol !== sentiment.symbol),
                                  history: [...acc.history, ...closedTrades],
                                  balance: acc.balance + totalPL,
                                  equity: acc.equity 
                              };
                          }
                          return acc;
                      }));
                      addLog(`AI AUTO-TRADER: Closed ${tradesToClose.length} ${sentiment.symbol} positions`);
                  }
              }

          } catch (e) { console.error(e); }
      }, 5000); 

      return () => clearInterval(scanInterval);
  }, [copierSettings, user, accounts, livePrices]); 

  // --- Copy Logic Engine ---
  useEffect(() => {
    if (!copierSettings.isEnabled || !user) return;

    setAccounts(currentAccounts => {
      const sources = currentAccounts.filter(a => a.role === AccountRole.SOURCE && a.status === ConnectionStatus.CONNECTED);
      const destinations = currentAccounts.filter(a => a.role === AccountRole.DESTINATION && a.status === ConnectionStatus.CONNECTED);

      if (sources.length === 0 || destinations.length === 0) return currentAccounts;

      const updatedDestinations = new Map<string, MTAccount>();
      destinations.forEach(d => {
        updatedDestinations.set(d.id, { ...d, trades: [...d.trades], history: [...(d.history || [])] });
      });
      let changesMade = false;

      // 1. OPEN COPY LOGIC
      sources.forEach(source => {
        source.trades.forEach(srcTrade => {
          destinations.forEach(dest => {
            const destAccount = updatedDestinations.get(dest.id)!;
            
            if (destAccount.allowedPairs && destAccount.allowedPairs.length > 0) {
                 if (!destAccount.allowedPairs.includes(srcTrade.symbol)) return; 
            }

            let isCopied = false;
            if (copierSettings.stealthMode) {
                isCopied = destAccount.trades.some(t => t.internalSourceTicket === srcTrade.ticket);
            } else {
                isCopied = destAccount.trades.some(t => t.comment?.includes(srcTrade.ticket.toString()));
            }

            const isPendingLatency = pendingTradesRef.current.has(srcTrade.ticket);
            const isWaitingConfirmation = pendingConfirmations.some(p => p.sourceTicket === srcTrade.ticket && p.destAccountId === dest.id);

            if (!isCopied && !isPendingLatency && !isWaitingConfirmation) {
              
              if (copierSettings.requireConfirmation) {
                  const newConfirmation: PendingConfirmation = {
                      id: `conf-${Date.now()}-${srcTrade.ticket}`,
                      sourceTicket: srcTrade.ticket,
                      sourceAccountName: source.name,
                      sourceAccountId: source.id, // Store source ID
                      destAccountId: dest.id,
                      destAccountName: dest.name,
                      tradeDetails: srcTrade,
                      timestamp: new Date().toISOString()
                  };
                  setPendingConfirmations(prev => {
                      if (prev.some(p => p.sourceTicket === srcTrade.ticket && p.destAccountId === dest.id)) return prev;
                      return [...prev, newConfirmation];
                  });
              } else {
                  // EXECUTION
                  const executeCopy = async () => {
                      if (copierSettings.appMode === 'LIVE') {
                          try {
                             // Pass source account to copyTrade logic for equity sizing
                             const tradePayload = copyTrade(srcTrade, source, destAccount, copierSettings);
                             await liveApiService.executeLiveTrade(copierSettings.apiUrl, copierSettings.apiSecret, tradePayload, dest.id);
                             addLog(`LIVE COPY: Sent #${srcTrade.ticket} to ${dest.login}`);
                             pendingTradesRef.current.delete(srcTrade.ticket); 
                          } catch(e) {
                             addLog(`Failed live copy: ${e}`);
                          }
                      } else {
                          // Local State Update
                          setAccounts(latestAccounts => {
                              // Re-fetch source to get latest equity
                              const currentSource = latestAccounts.find(a => a.id === source.id) || source;
                              return latestAccounts.map(a => {
                                  if (a.id === dest.id) {
                                      const newTrade = copyTrade(srcTrade, currentSource, a, copierSettings);
                                      addLog(`Copied #${srcTrade.ticket} to ${a.login}`);
                                      pendingTradesRef.current.delete(srcTrade.ticket);
                                      return { ...a, trades: [...a.trades, newTrade] };
                                  }
                                  return a;
                              });
                          });
                      }
                  };

                  if (copierSettings.latencyEnabled && copierSettings.latencyMs > 0) {
                      pendingTradesRef.current.add(srcTrade.ticket);
                      setTimeout(executeCopy, copierSettings.latencyMs);
                  } else {
                      if (copierSettings.appMode === 'LIVE') {
                          executeCopy(); 
                      } else {
                          const copiedTrade = copyTrade(srcTrade, source, destAccount, copierSettings);
                          destAccount.trades.push(copiedTrade);
                          addLog(`Copied #${srcTrade.ticket} from ${source.login} to ${dest.login}`);
                          changesMade = true;
                      }
                  }
              }
            }
          });
        });
      });

      // 2. CLOSE COPY LOGIC
      const activeSourceTickets = new Set(sources.flatMap(s => s.trades.map(t => t.ticket)));

      updatedDestinations.forEach((destAccount, destId) => {
         const tradesToClose = destAccount.trades.filter(t => {
            let srcTicket = t.internalSourceTicket;
            if (!srcTicket && t.comment) {
                const match = t.comment.match(/Copy from #(\d+)/);
                if (match) srcTicket = parseInt(match[1]);
            }
            if (srcTicket && !activeSourceTickets.has(srcTicket)) {
                return true;
            }
            return false;
         });

         if (tradesToClose.length > 0) {
             if (copierSettings.appMode === 'LIVE') {
                 tradesToClose.forEach(t => {
                     liveApiService.closeLiveTrade(copierSettings.apiUrl, copierSettings.apiSecret, t.ticket, destId)
                         .then(() => addLog(`LIVE CLOSE COPY: Closed #${t.ticket} on slave`))
                         .catch(e => console.error(e));
                 });
             } else {
                 const closed = tradesToClose.map(t => ({
                    ...t, isClosed: true, closeTime: new Date().toISOString(), closePrice: t.currentPrice
                 }));
                 
                 const profit = closed.reduce((sum, t) => sum + t.profit, 0);
                 destAccount.trades = destAccount.trades.filter(t => !tradesToClose.includes(t));
                 destAccount.history = [...destAccount.history, ...closed];
                 destAccount.balance += profit;
                 addLog(`CLOSE COPY: Closed ${closed.length} trades on ${destAccount.login}`);
                 changesMade = true;
             }
         }
      });

      if (changesMade) {
        return currentAccounts.map(a => updatedDestinations.has(a.id) ? updatedDestinations.get(a.id)! : a);
      }

      return currentAccounts;
    });
  }, [accounts, copierSettings, user, pendingConfirmations]); 

  // ... (Render Functions remain same until renderSettings) ...

  const handleRunAnalysis = async () => {
     const source = accounts.find(a => a.role === AccountRole.SOURCE);
    const dest = accounts.find(a => a.role === AccountRole.DESTINATION);
    
    if (!source || !dest) {
        addLog("Need at least 1 Source and 1 Destination for Analysis");
        return;
    }

    setIsAnalyzing(true);
    addLog("Gemini AI analyzing portfolio risk...");
    
    try {
        const result = await analyzeRisk(source, dest);
        setGeminiAnalysis({
            ...result,
            lastUpdated: new Date().toLocaleTimeString()
        });
        addLog("AI Analysis complete.");
    } catch (e) {
        addLog("AI Analysis failed.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const renderRiskPanel = () => {
    // ... same as before
    if (isAnalyzing) {
        return (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 animate-pulse flex items-center justify-center gap-3">
                 <RefreshCcw className="w-5 h-5 animate-spin text-indigo-400" />
                 <span className="text-slate-400 font-medium">Gemini AI is analyzing portfolio risk...</span>
            </div>
        )
    }

    if (!geminiAnalysis) {
        return (
             <div className="bg-gradient-to-r from-slate-800 to-slate-800/50 rounded-xl p-6 border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-lg">
                        <Shield className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-200">AI Risk Analysis</h3>
                        <p className="text-sm text-slate-400">Scan your accounts for leverage exposure and correlation risks.</p>
                    </div>
                </div>
                <button 
                    onClick={handleRunAnalysis}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <BrainCircuit className="w-4 h-4" />
                    Run Analysis
                </button>
             </div>
        );
    }

    const { riskScore, summary } = geminiAnalysis;
    let colorClass = 'text-emerald-400';
    let bgClass = 'bg-emerald-500/10 border-emerald-500/20';
    let label = 'Low Risk';
    
    if (riskScore > 70) {
        colorClass = 'text-red-400';
        bgClass = 'bg-red-500/10 border-red-500/20';
        label = 'Critical Risk';
    } else if (riskScore > 30) {
        colorClass = 'text-amber-400';
        bgClass = 'bg-amber-500/10 border-amber-500/20';
        label = 'Medium Risk';
    }

    return (
        <div className={`rounded-xl p-6 border ${bgClass} flex flex-col md:flex-row gap-6 items-start md:items-center justify-between transition-all`}>
             <div className="flex items-center gap-4">
                 <div className={`p-4 rounded-full border-4 ${riskScore > 70 ? 'border-red-500/30' : riskScore > 30 ? 'border-amber-500/30' : 'border-emerald-500/30'} bg-slate-900`}>
                     <span className={`text-2xl font-bold font-mono ${colorClass}`}>{riskScore}</span>
                 </div>
                 <div>
                     <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-lg font-bold ${colorClass}`}>{label}</h3>
                        <span className="text-xs text-slate-500 font-mono">({geminiAnalysis.lastUpdated})</span>
                     </div>
                     <p className="text-sm text-slate-300 max-w-xl line-clamp-2">{summary}</p>
                 </div>
             </div>
             
             <button 
                onClick={handleRunAnalysis}
                className="shrink-0 flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 transition-colors text-sm w-full md:w-auto justify-center"
            >
                <RefreshCcw className="w-4 h-4" />
                Re-Scan
            </button>
        </div>
    );
  };

  const renderDashboard = () => {
    // ... same as before
    const sourceTrades = accounts.filter(a => a.role === AccountRole.SOURCE).flatMap(a => a.trades);
    const destTrades = accounts.filter(a => a.role === AccountRole.DESTINATION).flatMap(a => a.trades);

    return (
      <div className="space-y-6">
        {apiError && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-red-400 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                    <WifiOff className="w-6 h-6 shrink-0" />
                    <div>
                        <span className="font-bold block">Backend Connection Failed</span>
                        <span className="text-sm opacity-90">{apiError}</span>
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                       onClick={() => setCopierSettings(s => ({...s, appMode: 'SIMULATION'}))}
                       className="flex-1 sm:flex-none whitespace-nowrap bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                        Switch to Simulation
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        )}

        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={() => setCopierSettings(s => ({...s, isEnabled: !s.isEnabled}))}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold transition-all transform active:scale-95 ${
                copierSettings.isEnabled 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-900/20' 
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
              }`}
            >
              {copierSettings.isEnabled ? <Pause className="fill-current w-5 h-5" /> : <Play className="fill-current w-5 h-5" />}
              {copierSettings.isEnabled ? 'STOP COPIER' : 'START COPIER'}
            </button>
            <div className="flex flex-col">
               <span className="text-xs text-slate-400 uppercase tracking-wider">Status</span>
               <span className={`font-mono font-medium ${copierSettings.isEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                 {copierSettings.isEnabled ? 'RUNNING' : 'IDLE'}
               </span>
            </div>
            
            <div className="h-8 w-px bg-slate-700 mx-2 hidden md:block"></div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-900 border border-slate-700">
                 {copierSettings.appMode === 'LIVE' ? (
                     <>
                        <div className="relative">
                            <Wifi className="w-4 h-4 text-green-500" />
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        </div>
                        <span className="text-xs font-bold text-green-500">LIVE MODE</span>
                     </>
                 ) : (
                     <>
                        <Globe className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-medium text-blue-400">SIMULATION</span>
                     </>
                 )}
            </div>
          </div>
          
          <div className="h-8 w-px bg-slate-700 hidden md:block"></div>
          
          <div className="flex-1 w-full md:w-auto">
             <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                System Log
             </div>
             <div className="font-mono text-xs text-slate-300 bg-slate-900/50 p-2 rounded border border-slate-700/50 truncate">
               {lastLog}
             </div>
          </div>
        </div>
        
        {renderRiskPanel()}

        {accounts.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-dashed border-slate-700">
             <p className="text-slate-400 mb-4">No accounts connected.</p>
             <button onClick={() => setIsAddAccountOpen(true)} className="text-blue-400 hover:text-blue-300 font-medium">Connect an Account</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {accounts.map(acc => (
              <AccountCard 
                key={acc.id} 
                account={acc} 
                onDelete={handleDeleteAccount}
                onToggle={(id) => {
                   if (copierSettings.appMode === 'LIVE') return;
                  setAccounts(prev => prev.map(a => 
                    a.id === id ? { ...a, status: a.status === ConnectionStatus.CONNECTED ? ConnectionStatus.DISCONNECTED : ConnectionStatus.CONNECTED } : a
                  ))
                }} 
              />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <TradeTable trades={sourceTrades} title="Master Trades (All Sources)" />
          <TradeTable trades={destTrades} title="Slave Trades (All Destinations)" />
        </div>
      </div>
    );
  };

  const renderHistory = () => {
    // ... same as before
    const sourceHistory = accounts.filter(a => a.role === AccountRole.SOURCE).flatMap(a => a.history || []);
    const destHistory = accounts.filter(a => a.role === AccountRole.DESTINATION).flatMap(a => a.history || []);

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <HistoryTable history={sourceHistory} title="Master History" />
            <HistoryTable history={destHistory} title="Slave History" />
        </div>
    );
  };

  const renderAnalysis = () => (
      // ... same as before
     <div className="max-w-4xl mx-auto space-y-6">
       <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-xl p-8 border border-indigo-500/30 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <BrainCircuit className="w-8 h-8 text-indigo-400" />
              Gemini AI Risk Manager
            </h2>
            <p className="text-indigo-200 mb-6 max-w-xl">
              Uses Google Gemini 2.5 Flash to analyze trade correlation, exposure leverage, and slippage between your Master and Slave accounts in real-time.
            </p>
            <button 
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="bg-white text-indigo-900 px-6 py-2 rounded-lg font-bold hover:bg-indigo-50 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isAnalyzing ? <RefreshCcw className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>
       </div>
       {geminiAnalysis && (
         <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 animate-fade-in">
           {/* ... existing logic ... */}
           <div className="flex justify-between items-start mb-6 border-b border-slate-700 pb-4">
             <div>
                <h3 className="text-lg font-semibold text-slate-200">Analysis Result</h3>
                <span className="text-xs text-slate-500">Last updated: {geminiAnalysis.lastUpdated}</span>
             </div>
             <div className="text-center">
                <div className={`text-3xl font-bold ${
                    geminiAnalysis.riskScore > 70 ? 'text-red-500' : geminiAnalysis.riskScore > 30 ? 'text-amber-500' : 'text-emerald-500'
                }`}>
                    {geminiAnalysis.riskScore}/100
                </div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">Risk Score</div>
             </div>
           </div>

           <div className="space-y-6">
             <div>
               <h4 className="text-sm font-medium text-slate-400 uppercase mb-2">Summary</h4>
               <p className="text-slate-300 leading-relaxed">{geminiAnalysis.summary}</p>
             </div>
             <div>
               <h4 className="text-sm font-medium text-slate-400 uppercase mb-3">Recommendations</h4>
               <div className="grid gap-3">
                 {geminiAnalysis.recommendations.map((rec, i) => (
                   <div key={i} className="flex items-start gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                     <CheckCircle className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                     <span className="text-slate-300 text-sm">{rec}</span>
                   </div>
                 ))}
               </div>
             </div>
           </div>
         </div>
       )}
    </div>
  );

  const renderSettings = () => (
      <div className="max-w-2xl mx-auto bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-700">
           <h2 className="text-xl font-bold text-slate-200">Copier Configuration</h2>
           <p className="text-slate-400 text-sm mt-1">Adjust how trades are translated from Source to Destination.</p>
        </div>
        
        <div className="p-6 space-y-6">
            
            {/* CONNECTION SETTINGS */}
             <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-500" />
                        <div>
                            <div className="text-slate-200 font-medium">Connectivity Mode</div>
                            <div className="text-xs text-slate-500">Switch between In-Browser Simulation and Live Server</div>
                        </div>
                    </div>
                    
                    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <button 
                            onClick={() => setCopierSettings(s => ({...s, appMode: 'SIMULATION'}))}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                                copierSettings.appMode === 'SIMULATION' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            SIMULATION
                        </button>
                        <button 
                            onClick={() => setCopierSettings(s => ({...s, appMode: 'LIVE'}))}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                                copierSettings.appMode === 'LIVE' ? 'bg-green-600 text-white shadow' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            LIVE SERVER
                        </button>
                    </div>
                </div>

                {copierSettings.appMode === 'LIVE' && (
                    <div className="space-y-3 animate-in slide-in-from-top-2 border-t border-slate-700/50 pt-3">
                        <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded text-xs text-amber-200 flex items-start gap-2">
                             <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                             <p><strong>Warning:</strong> Live Mode connects to your real backend. Ensure your Middleware (MetaApi/ZeroMQ) is running.</p>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Backend API URL</label>
                            <input 
                                type="text" 
                                value={copierSettings.apiUrl}
                                onChange={(e) => setCopierSettings(s => ({...s, apiUrl: e.target.value}))}
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm font-mono text-slate-200"
                                placeholder="https://api.my-trading-bot.com"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">API Secret Key</label>
                            <input 
                                type="password" 
                                value={copierSettings.apiSecret}
                                onChange={(e) => setCopierSettings(s => ({...s, apiSecret: e.target.value}))}
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm font-mono text-slate-200"
                                placeholder="sk_live_..."
                            />
                        </div>
                    </div>
                )}
            </div>
            
            <div className="h-px bg-slate-700/50"></div>

            {/* Global Symbol Manager */}
            {/* ... (Existing symbol manager code) ... */}
             <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                 <div className="flex items-center gap-2 mb-3">
                    <List className="w-5 h-5 text-purple-500" />
                    <div>
                        <div className="text-slate-200 font-medium">Global Pair Manager</div>
                        <div className="text-xs text-slate-500">Manage the list of pairs available for trading</div>
                    </div>
                 </div>

                 <div className="flex gap-2 mb-3">
                     <input 
                        type="text" 
                        value={newPairInput}
                        onChange={(e) => setNewPairInput(e.target.value.toUpperCase())}
                        placeholder="e.g. BTCUSD"
                        className="flex-1 bg-slate-800 border border-slate-600 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                     />
                     <button 
                        onClick={() => {
                            if (newPairInput && !copierSettings.managedPairs.includes(newPairInput)) {
                                setCopierSettings(s => ({...s, managedPairs: [...s.managedPairs, newPairInput]}));
                                setNewPairInput('');
                            }
                        }}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-3 rounded-lg flex items-center gap-1 text-sm font-medium transition-colors"
                     >
                        <Plus className="w-4 h-4" /> Add
                     </button>
                 </div>

                 <div className="flex flex-wrap gap-2">
                     {copierSettings.managedPairs.map(pair => (
                         <div key={pair} className="flex items-center gap-1 bg-slate-800 border border-slate-600 px-2 py-1 rounded text-xs text-slate-300">
                             {pair}
                             <button 
                                onClick={() => setCopierSettings(s => ({...s, managedPairs: s.managedPairs.filter(p => p !== pair)}))}
                                className="text-slate-500 hover:text-red-400 ml-1"
                             >
                                 <Trash2 className="w-3 h-3" />
                             </button>
                         </div>
                     ))}
                 </div>
            </div>

            <div className="h-px bg-slate-700/50"></div>

             {/* LOT SIZING STRATEGY (NEW SECTION) */}
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-4">
                    <Scale className="w-5 h-5 text-blue-500" />
                    <div>
                        <div className="text-slate-200 font-medium">Lot Sizing Strategy</div>
                        <div className="text-xs text-slate-500">Determine how trade volume is calculated</div>
                    </div>
                </div>

                <div className="space-y-4">
                     <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                        {[
                            { id: LotSizingMode.FIXED, label: 'Fixed Multiplier' },
                            { id: LotSizingMode.EQUITY_RATIO, label: 'Equity Ratio' },
                            { id: LotSizingMode.RISK_PERCENT, label: 'Risk % per Trade' },
                        ].map(mode => (
                             <button 
                                key={mode.id}
                                onClick={() => setCopierSettings(s => ({...s, lotSizingMode: mode.id}))}
                                className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                                    copierSettings.lotSizingMode === mode.id 
                                    ? 'bg-blue-600 text-white shadow' 
                                    : 'text-slate-400 hover:text-white'
                                }`}
                             >
                                 {mode.label}
                             </button>
                        ))}
                    </div>

                    {copierSettings.lotSizingMode === LotSizingMode.FIXED && (
                        <div className="animate-in fade-in">
                            <label className="block text-xs font-medium text-slate-400 mb-2">Lot Multiplier</label>
                            <div className="flex items-center gap-4">
                                <input 
                                    type="range" 
                                    min="0.1" 
                                    max="5.0" 
                                    step="0.1"
                                    value={copierSettings.lotMultiplier}
                                    onChange={(e) => setCopierSettings(s => ({ ...s, lotMultiplier: parseFloat(e.target.value) }))}
                                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <span className="font-mono text-xl text-blue-400 w-16 text-right">{copierSettings.lotMultiplier}x</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2">Example: 1.0 Lot on Master becomes {1.0 * copierSettings.lotMultiplier} Lots on Slave.</p>
                        </div>
                    )}

                    {copierSettings.lotSizingMode === LotSizingMode.EQUITY_RATIO && (
                        <div className="animate-in fade-in bg-blue-500/10 border border-blue-500/20 rounded p-3 text-xs text-blue-300">
                             <p className="flex items-start gap-2">
                                <Calculator className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>
                                    Trades will be scaled automatically based on the equity difference between Master and Slave.
                                    <br />
                                    <span className="opacity-70 mt-1 block">Formula: SourceLots * (SlaveEquity / MasterEquity)</span>
                                </span>
                             </p>
                        </div>
                    )}

                    {copierSettings.lotSizingMode === LotSizingMode.RISK_PERCENT && (
                         <div className="animate-in fade-in">
                            <label className="block text-xs font-medium text-slate-400 mb-2">Risk Percentage per Trade</label>
                            <div className="flex items-center gap-4">
                                <div className="relative flex-1">
                                    <Percent className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                                    <input 
                                        type="number" 
                                        min="0.1" max="10.0" step="0.1"
                                        value={copierSettings.riskPerTradePercent}
                                        onChange={(e) => setCopierSettings(s => ({...s, riskPerTradePercent: parseFloat(e.target.value)}))}
                                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 pl-10 text-sm font-mono text-slate-200"
                                    />
                                </div>
                                <span className="text-sm font-medium text-slate-400">of Balance</span>
                            </div>
                             <p className="text-[10px] text-slate-500 mt-2">
                                 Calculates lot size based on Stop Loss distance to risk exactly {copierSettings.riskPerTradePercent}% of equity.
                                 <br />(Falls back to Equity Ratio if Master trade has no Stop Loss).
                             </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="h-px bg-slate-700/50"></div>

            {/* Latency Simulation */}
            <div className={`transition-opacity ${copierSettings.appMode === 'LIVE' ? 'opacity-50 pointer-events-none' : ''}`}>
               {/* ... Existing Latency UI ... */}
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-500" />
                            <div>
                                <div className="text-slate-200 font-medium">Latency Simulation</div>
                                <div className="text-xs text-slate-500">Simulate network delay (Sim Mode Only)</div>
                            </div>
                        </div>
                        <button 
                            onClick={() => setCopierSettings(s => ({ ...s, latencyEnabled: !s.latencyEnabled }))}
                            className={`w-12 h-6 rounded-full transition-colors relative ${
                                copierSettings.latencyEnabled ? 'bg-amber-600' : 'bg-slate-700'
                            }`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                copierSettings.latencyEnabled ? 'left-7' : 'left-1'
                            }`}></div>
                        </button>
                    </div>
                    
                    {copierSettings.latencyEnabled && (
                        <div className="animate-in slide-in-from-top-2">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-slate-400">Delay (Milliseconds)</span>
                                <span className="text-sm font-mono text-amber-400">{copierSettings.latencyMs} ms</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="5000" 
                                step="100"
                                value={copierSettings.latencyMs}
                                onChange={(e) => setCopierSettings(s => ({ ...s, latencyMs: parseInt(e.target.value) }))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="h-px bg-slate-700/50"></div>

            {/* AI Auto Trade Config */}
             <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-indigo-500" />
                        <div>
                            <div className="text-slate-200 font-medium">AI Auto-Trading</div>
                            <div className="text-xs text-slate-500">Allow AI to scan market and place/close trades automatically</div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setCopierSettings(s => ({ ...s, aiAutoTradeEnabled: !s.aiAutoTradeEnabled }))}
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                            copierSettings.aiAutoTradeEnabled ? 'bg-indigo-600' : 'bg-slate-700'
                        }`}
                    >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            copierSettings.aiAutoTradeEnabled ? 'left-7' : 'left-1'
                        }`}></div>
                    </button>
                </div>
                
                {copierSettings.aiAutoTradeEnabled && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-4 animate-in slide-in-from-top-2">
                        {/* Mode & Max Trades */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Trading Strategy</label>
                                <select 
                                    value={copierSettings.aiTradingMode}
                                    onChange={(e) => setCopierSettings(s => ({...s, aiTradingMode: e.target.value as any}))}
                                    className="w-full bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 p-2"
                                >
                                    <option value="SCALP">Scalping (Fast)</option>
                                    <option value="DAY">Day Trading (Balanced)</option>
                                    <option value="SWING">Swing (Conservative)</option>
                                </select>
                            </div>
                            <div>
                                 <label className="block text-xs text-slate-400 mb-1">Max Open Positions</label>
                                 <input 
                                    type="number" 
                                    min="1" max="10"
                                    value={copierSettings.aiMaxOpenTrades}
                                    onChange={(e) => setCopierSettings(s => ({...s, aiMaxOpenTrades: parseInt(e.target.value)}))}
                                    className="w-full bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 p-2"
                                 />
                            </div>
                        </div>

                        {/* Daily Limits Config */}
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                                    <PieChart className="w-3 h-3 text-emerald-400" />
                                    Daily Profit Target (%)
                                 </label>
                                 <input 
                                    type="number" 
                                    min="0.5" max="20.0" step="0.5"
                                    value={copierSettings.aiDailyProfitLimit}
                                    onChange={(e) => setCopierSettings(s => ({...s, aiDailyProfitLimit: parseFloat(e.target.value)}))}
                                    className="w-full bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 p-2"
                                    placeholder="2.0"
                                 />
                                 <p className="text-[10px] text-slate-500 mt-1">Stops trading if profit hits {copierSettings.aiDailyProfitLimit}%</p>
                            </div>
                            <div>
                                 <label className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                                    <Ban className="w-3 h-3 text-red-400" />
                                    Daily Max Loss (%)
                                 </label>
                                 <input 
                                    type="number" 
                                    min="0.5" max="20.0" step="0.5"
                                    value={copierSettings.aiDailyMaxLoss}
                                    onChange={(e) => setCopierSettings(s => ({...s, aiDailyMaxLoss: parseFloat(e.target.value)}))}
                                    className="w-full bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 p-2"
                                    placeholder="2.0"
                                 />
                                  <p className="text-[10px] text-slate-500 mt-1">Stops trading if loss hits {copierSettings.aiDailyMaxLoss}%</p>
                            </div>
                        </div>

                        {/* Confidence & Take Profit */}
                         <div className="grid grid-cols-2 gap-4 border-t border-slate-700/50 pt-3">
                            <div>
                                <label className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                                    <Target className="w-3 h-3" />
                                    Min Confidence Level
                                </label>
                                <div className="flex items-center gap-2">
                                     <input 
                                        type="range" 
                                        min="50" max="99"
                                        value={copierSettings.aiConfidenceThreshold}
                                        onChange={(e) => setCopierSettings(s => ({...s, aiConfidenceThreshold: parseInt(e.target.value)}))}
                                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                     />
                                     <span className="text-xs font-mono text-indigo-300 w-8">{copierSettings.aiConfidenceThreshold}%</span>
                                </div>
                            </div>
                            <div>
                                 <label className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                                    <TrendingUp className="w-3 h-3" />
                                    Take Profit Target (%)
                                 </label>
                                 <input 
                                    type="number" 
                                    min="0.1" max="10.0" step="0.1"
                                    value={copierSettings.aiTakeProfitPercent}
                                    onChange={(e) => setCopierSettings(s => ({...s, aiTakeProfitPercent: parseFloat(e.target.value)}))}
                                    className="w-full bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 p-2"
                                 />
                            </div>
                        </div>

                        {/* Symbol Selection */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-2">Allowed Pairs</label>
                            <div className="flex flex-wrap gap-2">
                                {copierSettings.managedPairs.map(sym => (
                                    <button
                                        key={sym}
                                        onClick={() => {
                                            setCopierSettings(s => {
                                                const exists = s.aiAllowedSymbols.includes(sym);
                                                return {
                                                    ...s,
                                                    aiAllowedSymbols: exists 
                                                        ? s.aiAllowedSymbols.filter(x => x !== sym)
                                                        : [...s.aiAllowedSymbols, sym]
                                                };
                                            })
                                        }}
                                        className={`px-2 py-1 rounded text-xs border transition-colors ${
                                            copierSettings.aiAllowedSymbols.includes(sym)
                                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                                            : 'bg-slate-800 border-slate-600 text-slate-500 hover:border-slate-500'
                                        }`}
                                    >
                                        {sym}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="h-px bg-slate-700/50"></div>

            {/* Toggles */}
            <div className="space-y-4">
                {[
                    { key: 'requireConfirmation', label: 'Require Confirmation', desc: 'Manually approve trades before copying' },
                    { key: 'copyStopLoss', label: 'Copy Stop Loss', desc: 'Replicate SL levels from master trade' },
                    { key: 'copyTakeProfit', label: 'Copy Take Profit', desc: 'Replicate TP levels from master trade' },
                    { key: 'reverseTrade', label: 'Reverse Trading', desc: 'Buy becomes Sell, Sell becomes Buy' },
                    { key: 'stealthMode', label: 'Stealth Mode', desc: 'Hide comments/MagicID from Broker' }
                ].map((item) => (
                     <div key={item.key} className="flex items-center justify-between">
                        <div>
                            <div className="text-slate-200 font-medium">{item.label}</div>
                            <div className="text-xs text-slate-500">{item.desc}</div>
                        </div>
                        <button 
                            // @ts-ignore
                            onClick={() => setCopierSettings(s => ({ ...s, [item.key]: !s[item.key] }))}
                            className={`w-12 h-6 rounded-full transition-colors relative ${
                                // @ts-ignore
                                copierSettings[item.key] ? 'bg-blue-600' : 'bg-slate-700'
                            }`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                // @ts-ignore
                                copierSettings[item.key] ? 'left-7' : 'left-1'
                            }`}></div>
                        </button>
                     </div>
                ))}
            </div>
        </div>
      </div>
  );

  const renderAccounts = () => (
      <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-200">Account Management</h2>
              <button 
                onClick={() => setIsAddAccountOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
              >
                  <Plus className="w-4 h-4" /> Add Account
              </button>
          </div>

          <div className="grid gap-4">
              {accounts.map(acc => (
                  <div key={acc.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                              acc.role === AccountRole.SOURCE ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'
                          }`}>
                              {acc.platform.replace('MT', '')}
                          </div>
                          <div>
                              <div className="font-medium text-slate-200">{acc.name}</div>
                              <div className="text-sm text-slate-500">{acc.login} | {acc.server}</div>
                              {(acc.defaultTakeProfit || acc.defaultStopLoss) && (
                                  <div className="flex gap-2 mt-1">
                                      {acc.defaultTakeProfit && <span className="text-[10px] bg-green-900/40 text-green-400 px-1.5 rounded">TP: {acc.defaultTakeProfit}%</span>}
                                      {acc.defaultStopLoss && <span className="text-[10px] bg-red-900/40 text-red-400 px-1.5 rounded">SL: {acc.defaultStopLoss}%</span>}
                                  </div>
                              )}
                              {acc.allowedPairs && (
                                  <div className="mt-1 text-[10px] text-slate-500">
                                      Limit: {acc.allowedPairs.join(', ')}
                                  </div>
                              )}
                          </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                           <div className="text-right">
                               <div className="text-xs text-slate-400 uppercase tracking-wider">Balance</div>
                               <div className="font-mono text-slate-200">{acc.balance.toLocaleString()} {acc.currency}</div>
                           </div>
                           <div className="flex items-center gap-3">
                             <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                 acc.role === AccountRole.SOURCE ? 'bg-amber-900/30 text-amber-400' : 'bg-blue-900/30 text-blue-400'
                             }`}>
                                 {acc.role}
                             </span>
                             <button 
                                onClick={() => handleDeleteAccount(acc.id)}
                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                             >
                               <Plus className="w-5 h-5 rotate-45" /> 
                             </button>
                           </div>
                      </div>
                  </div>
              ))}
          </div>
          
          <div className="mt-8 p-4 bg-blue-500/5 border border-blue-500/10 rounded-lg text-slate-400 text-sm flex gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <p>
                <strong>System Info:</strong> 
                {copierSettings.appMode === 'SIMULATION' ? (
                   " You are currently running in Client-Side Simulation Mode. Data is local."
                ) : (
                   " You are connected to a LIVE server. Trade actions will be executed on the configured backend."
                )}
              </p>
          </div>
      </div>
  );

  // --- Main Render Gate ---
  if (!user) {
      return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} user={user} onLogout={handleLogout}>
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'analysis' && renderAnalysis()}
      {activeTab === 'settings' && renderSettings()}
      {activeTab === 'accounts' && renderAccounts()}
      {activeTab === 'history' && renderHistory()}

      <AddAccountModal 
        isOpen={isAddAccountOpen} 
        onClose={() => setIsAddAccountOpen(false)} 
        onAdd={handleAddAccount}
      />

      <TradeConfirmationModal 
        pendingConfirmations={pendingConfirmations}
        onApprove={handleApproveTrade}
        onReject={handleRejectTrade}
      />
    </Layout>
  );
};

export default App;