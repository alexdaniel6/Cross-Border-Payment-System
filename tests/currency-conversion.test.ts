import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract environment
const mockContractEnv = () => {
  const state = {
    admin: 'tx-sender',
    exchangeRates: new Map(),
    blockHeight: 100
  };
  
  return {
    state,
    tx: {
      sender: state.admin
    },
    functions: {
      getExchangeRate: (fromCurrency, toCurrency) => {
        const key = `${fromCurrency}-${toCurrency}`;
        return state.exchangeRates.get(key) || null;
      },
      setExchangeRate: (fromCurrency, toCurrency, rate) => {
        if (state.tx.sender !== state.admin) {
          return { error: 403 };
        }
        
        const key = `${fromCurrency}-${toCurrency}`;
        state.exchangeRates.set(key, {
          rate,
          lastUpdated: state.blockHeight
        });
        
        return { success: true };
      },
      convertCurrency: (amount, fromCurrency, toCurrency) => {
        const key = `${fromCurrency}-${toCurrency}`;
        const rateData = state.exchangeRates.get(key);
        
        if (!rateData) {
          return { error: 404 };
        }
        
        // Convert using fixed-point arithmetic (8 decimal places)
        const convertedAmount = (amount * rateData.rate) / 100000000;
        return { success: true, amount: convertedAmount };
      },
      setAdmin: (newAdmin) => {
        if (state.tx.sender !== state.admin) {
          return { error: 403 };
        }
        
        state.admin = newAdmin;
        return { success: true };
      }
    }
  };
};

describe('Currency Conversion Contract', () => {
  let contract;
  
  beforeEach(() => {
    contract = mockContractEnv();
  });
  
  it('should set exchange rate correctly', () => {
    // Set 1 USD = 0.85 EUR (represented as 85000000)
    const result = contract.functions.setExchangeRate('USD', 'EUR', 85000000);
    
    expect(result.success).toBe(true);
    
    const rate = contract.functions.getExchangeRate('USD', 'EUR');
    expect(rate).toEqual({
      rate: 85000000,
      lastUpdated: 100
    });
  });
  
  it('should not allow non-admin to set exchange rates', () => {
    contract.tx.sender = 'non-admin';
    
    const result = contract.functions.setExchangeRate('USD', 'GBP', 75000000);
    
    expect(result.error).toBe(403);
  });
  
  it('should convert currency correctly', () => {
    // Set 1 USD = 0.85 EUR (represented as 85000000)
    contract.functions.setExchangeRate('USD', 'EUR', 85000000);
    
    // Convert 100 USD to EUR
    const result = contract.functions.convertCurrency(100, 'USD', 'EUR');
    
    expect(result.success).toBe(true);
    expect(result.amount).toBe(85); // 100 * 0.85 = 85
  });
  
  it('should return error when exchange rate not found', () => {
    const result = contract.functions.convertCurrency(100, 'USD', 'JPY');
    
    expect(result.error).toBe(404);
  });
  
  it('should transfer admin rights correctly', () => {
    const newAdmin = 'new-admin';
    
    const result = contract.functions.setAdmin(newAdmin);
    expect(result.success).toBe(true);
    expect(contract.state.admin).toBe(newAdmin);
    
    // Old admin should no longer have privileges
    contract.tx.sender = 'tx-sender';
    const rateResult = contract.functions.setExchangeRate('USD', 'GBP', 75000000);
    expect(rateResult.error).toBe(403);
  });
});
