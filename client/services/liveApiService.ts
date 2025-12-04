import { MTAccount, Trade, CopierSettings } from '../types';

/**
 * Live API Service
 * This service communicates with your real backend middleware (Node.js/Python)
 * that connects to MetaTrader instances via MetaApi, ZeroMQ, or similar.
 */

const getHeaders = (secret: string) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${secret}`
});

// Fetch all connected accounts and their live state (trades, equity, etc.)
export const fetchLiveState = async (url: string, secret: string): Promise<MTAccount[]> => {
  try {
    const response = await fetch(`${url}/accounts/sync`, {
      method: 'GET',
      headers: getHeaders(secret)
    });
    if (!response.ok) throw new Error('Failed to sync live state');
    return await response.json();
  } catch (error) {
    console.error("Live API Sync Error:", error);
    throw error;
  }
};

// Add a new account to the backend bridge
export const addLiveAccount = async (url: string, secret: string, account: Partial<MTAccount>): Promise<MTAccount> => {
  const response = await fetch(`${url}/accounts`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify(account)
  });
  if (!response.ok) throw new Error('Failed to add live account');
  return await response.json();
};

// Delete an account from the backend
export const deleteLiveAccount = async (url: string, secret: string, id: string): Promise<void> => {
  await fetch(`${url}/accounts/${id}`, {
    method: 'DELETE',
    headers: getHeaders(secret)
  });
};

// Send a command to open a trade (Copy or Manual)
export const executeLiveTrade = async (url: string, secret: string, trade: Partial<Trade>, accountId: string): Promise<void> => {
  await fetch(`${url}/accounts/${accountId}/trades`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify(trade)
  });
};

// Send a command to close a trade
export const closeLiveTrade = async (url: string, secret: string, ticket: number, accountId: string): Promise<void> => {
  await fetch(`${url}/accounts/${accountId}/trades/${ticket}`, {
    method: 'DELETE',
    headers: getHeaders(secret)
  });
};
