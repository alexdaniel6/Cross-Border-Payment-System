import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract environment
const mockContractEnv = () => {
  const state = {
    admin: 'tx-sender',
    verifiedIdentities: new Map(),
    blockHeight: 100
  };
  
  return {
    state,
    tx: {
      sender: state.admin
    },
    functions: {
      isVerified: (user) => {
        const identity = state.verifiedIdentities.get(user);
        return identity ? identity.verified : false;
      },
      getUserDetails: (user) => {
        return state.verifiedIdentities.get(user) || null;
      },
      verifyUser: (user, name, country, idNumber) => {
        if (state.tx.sender !== state.admin) {
          return { error: 403 };
        }
        
        state.verifiedIdentities.set(user, {
          verified: true,
          name,
          country,
          idNumber,
          verificationDate: state.blockHeight
        });
        
        return { success: true };
      },
      revokeVerification: (user) => {
        if (state.tx.sender !== state.admin) {
          return { error: 403 };
        }
        
        state.verifiedIdentities.delete(user);
        return { success: true };
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

describe('Identity Verification Contract', () => {
  let contract;
  
  beforeEach(() => {
    contract = mockContractEnv();
  });
  
  it('should verify a user correctly', () => {
    const user = 'user1';
    const result = contract.functions.verifyUser(
        user,
        'John Doe',
        'USA',
        'ABC123456'
    );
    
    expect(result.success).toBe(true);
    expect(contract.functions.isVerified(user)).toBe(true);
    
    const details = contract.functions.getUserDetails(user);
    expect(details).toEqual({
      verified: true,
      name: 'John Doe',
      country: 'USA',
      idNumber: 'ABC123456',
      verificationDate: 100
    });
  });
  
  it('should not allow non-admin to verify users', () => {
    contract.tx.sender = 'non-admin';
    
    const result = contract.functions.verifyUser(
        'user2',
        'Jane Smith',
        'UK',
        'XYZ789012'
    );
    
    expect(result.error).toBe(403);
  });
  
  it('should revoke verification correctly', () => {
    const user = 'user1';
    
    // First verify the user
    contract.functions.verifyUser(user, 'John Doe', 'USA', 'ABC123456');
    expect(contract.functions.isVerified(user)).toBe(true);
    
    // Then revoke verification
    const result = contract.functions.revokeVerification(user);
    expect(result.success).toBe(true);
    expect(contract.functions.isVerified(user)).toBe(false);
    expect(contract.functions.getUserDetails(user)).toBe(null);
  });
  
  it('should transfer admin rights correctly', () => {
    const newAdmin = 'new-admin';
    
    const result = contract.functions.setAdmin(newAdmin);
    expect(result.success).toBe(true);
    expect(contract.state.admin).toBe(newAdmin);
    
    // Old admin should no longer have privileges
    contract.tx.sender = 'tx-sender';
    const verifyResult = contract.functions.verifyUser(
        'user1',
        'John Doe',
        'USA',
        'ABC123456'
    );
    expect(verifyResult.error).toBe(403);
  });
});
