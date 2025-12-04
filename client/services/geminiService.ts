import { GoogleGenAI, Type } from "@google/genai";
import { Trade, MTAccount, MarketSentiment } from '../types';
// NOTE: In a production app, never expose keys in frontend code.
// This relies on the environment variable injection as per the instructions.
const apiKey = (import.meta.env as any).VITE_GEMINI_API_KEY;


const ai = new GoogleGenAI({ apiKey });

export const analyzeRisk = async (
  sourceAccount: MTAccount, 
  destinationAccount: MTAccount
): Promise<{ riskScore: number; summary: string; recommendations: string[] }> => {
  
  if (!apiKey) {
    return {
      riskScore: 0,
      summary: "API Key not configured. Please add your Gemini API Key to environment variables.",
      recommendations: ["Configure API Key"]
    };
  }

  const model = "gemini-2.5-flash";

  const prompt = `
    You are an expert forex risk manager. Analyze the following trading state between a Source Account (Master) and Destination Account (Slave).
    
    Source Account: Balance ${sourceAccount.balance}, Equity ${sourceAccount.equity}, Open Trades: ${sourceAccount.trades.length}
    Destination Account: Balance ${destinationAccount.balance}, Equity ${destinationAccount.equity}, Open Trades: ${destinationAccount.trades.length}
    
    Source Open Positions:
    ${JSON.stringify(sourceAccount.trades.map(t => ({ s: t.symbol, l: t.lots, p: t.profit })))}

    Destination Open Positions:
    ${JSON.stringify(destinationAccount.trades.map(t => ({ s: t.symbol, l: t.lots, p: t.profit })))}

    Calculate a risk score from 0 (Safe) to 100 (Critical).
    Provide a brief summary of the exposure.
    Provide 3 specific bullet points of advice or warnings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskScore: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    
    throw new Error("Empty response");

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      riskScore: 50,
      summary: "Unable to perform AI analysis at this moment due to connection error.",
      recommendations: ["Check internet connection", "Verify API Key limits"]
    };
  }
};

export const scanMarketConditions = async (
    currentSymbolPrice: number,
    symbol: string
): Promise<MarketSentiment> => {
    // Simulate market data context for AI
    const trend = Math.random() > 0.5 ? "UP" : "DOWN";
    const volatility = Math.random() * 100;
    
    if (!apiKey) {
        // Fallback simulation if no API key
        const actions: Array<'BUY' | 'SELL' | 'HOLD' | 'CLOSE_ALL'> = ['BUY', 'SELL', 'HOLD', 'HOLD', 'HOLD'];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        return {
            symbol,
            action: randomAction,
            reason: "Simulated market scan (No API Key). Trend appears mixed.",
            confidence: Math.floor(Math.random() * 40) + 60
        };
    }

    const model = "gemini-2.5-flash";
    const prompt = `
        You are an algorithmic trading bot. Analyze the market for ${symbol}.
        Current Price: ${currentSymbolPrice}.
        Trend Indicator: ${trend}.
        Volatility Index: ${volatility.toFixed(2)}.
        
        Decide on an action: BUY, SELL, HOLD, or CLOSE_ALL (if market is turning against positions).
        Return JSON.
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        symbol: { type: Type.STRING },
                        action: { type: Type.STRING, enum: ['BUY', 'SELL', 'HOLD', 'CLOSE_ALL'] },
                        reason: { type: Type.STRING },
                        confidence: { type: Type.NUMBER }
                    }
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text);
        }
        throw new Error("Empty response");
    } catch (e) {
        return {
            symbol,
            action: 'HOLD',
            reason: "AI unavailable",
            confidence: 0
        };
    }
};