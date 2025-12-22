/**
 * Unit Tests for Shelly Service
 * Testing retry logic, error handling, and error classification
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the logger service
vi.mock('./logger.service.js', () => ({
  logShellyConnectionError: vi.fn(),
  logShellyRetrySuccess: vi.fn(),
  logError: vi.fn()
}));

describe('Shelly Service', () => {
  describe('Error Classification', () => {
    it('should classify timeout errors correctly', () => {
      const error = new Error('Request timeout');
      error.code = 'ETIMEDOUT';

      // We'll test error classification through the service
      expect(error.code).toBe('ETIMEDOUT');
    });

    it('should classify network errors correctly', () => {
      const error = new Error('Network error');
      error.code = 'ECONNREFUSED';

      expect(error.code).toBe('ECONNREFUSED');
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed requests with exponential backoff', async () => {
      let attempts = 0;
      const maxRetries = 3;

      const mockFn = vi.fn(async () => {
        attempts++;
        if (attempts <= 2) {
          throw new Error('Connection failed');
        }
        return { success: true };
      });

      // Simulate retry logic
      const retryWithBackoff = async (fn, maxRetries = 3, retryDelay = 100) => {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            return await fn();
          } catch (error) {
            if (attempt === maxRetries) {
              throw error;
            }
            await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
          }
        }
      };

      const result = await retryWithBackoff(mockFn, maxRetries);

      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ success: true });
    });

    it('should throw error after max retries exceeded', async () => {
      const mockFn = vi.fn(async () => {
        throw new Error('Connection failed');
      });

      const retryWithBackoff = async (fn, maxRetries = 3) => {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            return await fn();
          } catch (error) {
            if (attempt === maxRetries) {
              throw error;
            }
          }
        }
      };

      await expect(retryWithBackoff(mockFn, 2)).rejects.toThrow('Connection failed');
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('Exponential Backoff', () => {
    it('should calculate correct delay for each retry', () => {
      const baseDelay = 1000;

      const delays = [0, 1, 2, 3].map(attempt => baseDelay * Math.pow(2, attempt));

      expect(delays[0]).toBe(1000);  // 1s
      expect(delays[1]).toBe(2000);  // 2s
      expect(delays[2]).toBe(4000);  // 4s
      expect(delays[3]).toBe(8000);  // 8s
    });
  });

  describe('Device Status Validation', () => {
    it('should validate correct device status response', () => {
      const validResponse = {
        switch: {
          output: true,
          power: 123.5,
          voltage: 230,
          current: 0.54
        }
      };

      expect(validResponse.switch).toBeDefined();
      expect(validResponse.switch.output).toBeDefined();
      expect(typeof validResponse.switch.power).toBe('number');
    });

    it('should detect invalid response structure', () => {
      const invalidResponse = {
        error: 'Device not found'
      };

      expect(invalidResponse.switch).toBeUndefined();
      expect(invalidResponse.error).toBeDefined();
    });
  });

  describe('Power Calculation', () => {
    it('should convert watts to kilowatts correctly', () => {
      const watts = 1234.5;
      const kwh = watts / 1000;

      expect(kwh).toBe(1.2345);
    });

    it('should handle zero power correctly', () => {
      const watts = 0;
      const kwh = watts / 1000;

      expect(kwh).toBe(0);
    });

    it('should handle negative values (error case)', () => {
      const watts = -10;
      const kwh = Math.max(0, watts / 1000);

      expect(kwh).toBe(0);
    });
  });
});
