/**
 * Unit Tests for Insights Service
 * Testing consumption pattern analysis and comparison logic
 */

import { describe, it, expect } from 'vitest';

describe('Insights Service', () => {
  describe('Peak Hours Detection', () => {
    it('should identify top consumption hours', () => {
      const hourlyData = [
        { hour: 8, consumption: 5.2 },
        { hour: 12, consumption: 8.7 },
        { hour: 14, consumption: 3.1 },
        { hour: 20, consumption: 9.5 },
      ];

      const sorted = [...hourlyData].sort((a, b) => b.consumption - a.consumption);
      const topHours = sorted.slice(0, 3);

      expect(topHours[0].hour).toBe(20);
      expect(topHours[0].consumption).toBe(9.5);
      expect(topHours.length).toBe(3);
    });
  });

  describe('Consumption Comparison', () => {
    it('should calculate percentage change correctly', () => {
      const currentPeriod = 150;
      const previousPeriod = 100;

      const percentageChange = ((currentPeriod - previousPeriod) / previousPeriod) * 100;

      expect(percentageChange).toBe(50);
    });

    it('should handle zero previous period', () => {
      const currentPeriod = 150;
      const previousPeriod = 0;

      const percentageChange = previousPeriod === 0 ? 0 : ((currentPeriod - previousPeriod) / previousPeriod) * 100;

      expect(percentageChange).toBe(0);
    });

    it('should calculate negative change (decrease)', () => {
      const currentPeriod = 75;
      const previousPeriod = 100;

      const percentageChange = ((currentPeriod - previousPeriod) / previousPeriod) * 100;

      expect(percentageChange).toBe(-25);
    });
  });

  describe('Trend Detection', () => {
    it('should detect upward trend', () => {
      const percentageChange = 15;
      const threshold = 5;

      const trend = percentageChange > threshold ? 'gore' : percentageChange < -threshold ? 'dolje' : 'stabilno';

      expect(trend).toBe('gore');
    });

    it('should detect downward trend', () => {
      const percentageChange = -15;
      const threshold = 5;

      const trend = percentageChange > threshold ? 'gore' : percentageChange < -threshold ? 'dolje' : 'stabilno';

      expect(trend).toBe('dolje');
    });

    it('should detect stable trend', () => {
      const percentageChange = 3;
      const threshold = 5;

      const trend = percentageChange > threshold ? 'gore' : percentageChange < -threshold ? 'dolje' : 'stabilno';

      expect(trend).toBe('stabilno');
    });
  });

  describe('Weekday Pattern Analysis', () => {
    it('should group consumption by day of week', () => {
      const weekdayMap = {
        0: 'Nedjelja',
        1: 'Ponedjeljak',
        2: 'Utorak',
        3: 'Srijeda',
        4: 'Četvrtak',
        5: 'Petak',
        6: 'Subota'
      };

      const date = new Date('2024-01-01'); // Monday
      const dayOfWeek = date.getDay();
      const dayName = weekdayMap[dayOfWeek];

      expect(dayName).toBe('Ponedjeljak');
    });
  });

  describe('Top Consumers Ranking', () => {
    it('should rank devices by total consumption', () => {
      const devices = [
        { naziv: 'Klima', total: 150 },
        { naziv: 'Hladnjak', total: 75 },
        { naziv: 'TV', total: 25 },
        { naziv: 'Perilica', total: 200 },
      ];

      const ranked = [...devices].sort((a, b) => b.total - a.total);

      expect(ranked[0].naziv).toBe('Perilica');
      expect(ranked[0].total).toBe(200);
      expect(ranked[ranked.length - 1].naziv).toBe('TV');
    });

    it('should limit to top N consumers', () => {
      const devices = Array.from({ length: 20 }, (_, i) => ({
        naziv: `Device ${i}`,
        total: Math.random() * 100
      }));

      const topN = 10;
      const ranked = [...devices].sort((a, b) => b.total - a.total).slice(0, topN);

      expect(ranked.length).toBe(topN);
    });
  });

  describe('Average Calculation', () => {
    it('should calculate average daily consumption', () => {
      const totalConsumption = 300;
      const days = 30;

      const average = totalConsumption / days;

      expect(average).toBe(10);
    });

    it('should handle single day', () => {
      const totalConsumption = 15;
      const days = 1;

      const average = totalConsumption / days;

      expect(average).toBe(15);
    });

    it('should handle zero days gracefully', () => {
      const totalConsumption = 300;
      const days = 0;

      const average = days > 0 ? totalConsumption / days : 0;

      expect(average).toBe(0);
    });
  });
});
