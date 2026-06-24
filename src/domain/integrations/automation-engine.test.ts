import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutomationEngine } from './automation-engine';

const mockInsert = vi.fn();
vi.mock('@/infrastructure/db/client', () => ({
  withTenant: vi.fn(async (orgId, cb) => cb({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 'rule-1',
            orgId: 'org-1',
            eventType: 'DQE_FAILURE',
            conditions: { score: 40 },
            actionType: 'CREATE_EXCEPTION',
            actionPayload: { priority: 'HIGH' }
          }
        ])
      })
    }),
    insert: vi.fn().mockReturnValue({
      values: mockInsert
    })
  }))
}));

describe('Phase 6 Automation Engine', () => {

  beforeEach(() => {
    mockInsert.mockClear();
  });

  it('1. Triggers event, matches condition, and executes CREATE_EXCEPTION action', async () => {
    // payload score = 40 matches the condition { score: 40 }
    await AutomationEngine.triggerEvent('org-1', 'DQE_FAILURE', { score: 40, domainId: 'VAT' });
    
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      orgId: 'org-1',
      status: 'OPEN',
      priority: 'HIGH',
      domainId: 'VAT'
    }));
  });

  it('2. Does not execute action if condition is not met', async () => {
    // payload score = 90 does not match the condition { score: 40 }
    await AutomationEngine.triggerEvent('org-1', 'DQE_FAILURE', { score: 90, domainId: 'VAT' });
    
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
