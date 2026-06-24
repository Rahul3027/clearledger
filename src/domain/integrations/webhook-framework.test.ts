/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, no-restricted-imports */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookManager } from './webhooks';
import crypto from 'crypto';

vi.mock('@/infrastructure/db/client', () => ({
  withTenant: vi.fn(async (orgId, cb) => cb({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]) // Mock no existing event
      })
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'mocked-uuid' }])
      })
    })
  }))
}));

describe('Phase 6 Webhook Framework', () => {

  const secret = "test-secret";
  const payload = { id: 'evt_123', amount: 500 };
  const payloadString = JSON.stringify(payload);
  
  const generateSignature = (data: string) => 
    crypto.createHmac('sha256', secret).update(data).digest('hex');

  it('1. Validates correct signature successfully', () => {
    const signature = generateSignature(payloadString);
    const isValid = WebhookManager.validateSignature(payloadString, signature, secret);
    expect(isValid).toBe(true);
  });

  it('2. Rejects invalid signature', () => {
    const isValid = WebhookManager.validateSignature(payloadString, "bad-signature", secret);
    expect(isValid).toBe(false);
  });

  it('3. Processes incoming payload successfully', async () => {
    const signature = generateSignature(payloadString);
    const result = await WebhookManager.processIncoming('org-1', 'stripe', 'evt_123', payload, payloadString, signature, secret);
    expect(result).toBe('mocked-uuid');
  });
});

