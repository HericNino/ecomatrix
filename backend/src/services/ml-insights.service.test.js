/**
 * Unit Tests for ML Insights Service
 */

import { describe, it, expect } from 'vitest';
import {
  detectAnomalies,
  predictFutureConsumption,
  identifyOptimalUsageTimes,
  clusterDevicesByUsage
} from './ml-insights.service.js';

describe('ML Insights Service', () => {
  describe('detectAnomalies', () => {
    it('should detect anomalies using z-score method', () => {
      const consumptionData = [
        { datum: '2024-01-01', potrosnja_kwh: 10 },
        { datum: '2024-01-02', potrosnja_kwh: 12 },
        { datum: '2024-01-03', potrosnja_kwh: 11 },
        { datum: '2024-01-04', potrosnja_kwh: 10 },
        { datum: '2024-01-05', potrosnja_kwh: 11 },
        { datum: '2024-01-06', potrosnja_kwh: 50 }, // Anomaly - significantly higher
        { datum: '2024-01-07', potrosnja_kwh: 10 },
      ];

      // Use lower threshold to detect this anomaly
      const anomalies = detectAnomalies(consumptionData, 1.5);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].datum).toBe('2024-01-06');
      expect(parseFloat(anomalies[0].potrosnja_kwh)).toBe(50);
    });

    it('should return empty array for insufficient data', () => {
      const consumptionData = [
        { datum: '2024-01-01', potrosnja_kwh: 10 },
        { datum: '2024-01-02', potrosnja_kwh: 12 }
      ];

      const anomalies = detectAnomalies(consumptionData);

      expect(anomalies).toEqual([]);
    });

    it('should not detect anomalies in uniform data', () => {
      const consumptionData = [
        { datum: '2024-01-01', potrosnja_kwh: 10 },
        { datum: '2024-01-02', potrosnja_kwh: 10 },
        { datum: '2024-01-03', potrosnja_kwh: 10 },
        { datum: '2024-01-04', potrosnja_kwh: 10 },
      ];

      const anomalies = detectAnomalies(consumptionData);

      expect(anomalies).toEqual([]);
    });
  });

  describe('predictFutureConsumption', () => {
    it('should predict future consumption using linear regression', () => {
      const historicalData = [
        { potrosnja_kwh: 10 },
        { potrosnja_kwh: 12 },
        { potrosnja_kwh: 14 },
        { potrosnja_kwh: 16 },
        { potrosnja_kwh: 18 },
        { potrosnja_kwh: 20 },
        { potrosnja_kwh: 22 },
      ];

      const prediction = predictFutureConsumption(historicalData, 3);

      expect(prediction).toBeDefined();
      expect(prediction.predictions).toHaveLength(3);
      expect(prediction.trend).toBe('increasing');
      expect(prediction.predictions[0]).toHaveProperty('day', 1);
      expect(prediction.predictions[0]).toHaveProperty('predicted_kwh');
    });

    it('should return null for insufficient data', () => {
      const historicalData = [
        { potrosnja_kwh: 10 },
        { potrosnja_kwh: 12 },
      ];

      const prediction = predictFutureConsumption(historicalData);

      expect(prediction).toBeNull();
    });

    it('should detect decreasing trend', () => {
      const historicalData = [
        { potrosnja_kwh: 22 },
        { potrosnja_kwh: 20 },
        { potrosnja_kwh: 18 },
        { potrosnja_kwh: 16 },
        { potrosnja_kwh: 14 },
        { potrosnja_kwh: 12 },
        { potrosnja_kwh: 10 },
      ];

      const prediction = predictFutureConsumption(historicalData);

      expect(prediction.trend).toBe('decreasing');
    });
  });

  describe('identifyOptimalUsageTimes', () => {
    it('should identify hours with lowest and highest consumption', () => {
      const hourlyData = [
        { datum_vrijeme: new Date('2024-01-01T08:00:00'), potrosnja_kwh: 5 },
        { datum_vrijeme: new Date('2024-01-01T08:00:00'), potrosnja_kwh: 5 },
        { datum_vrijeme: new Date('2024-01-01T14:00:00'), potrosnja_kwh: 2 },
        { datum_vrijeme: new Date('2024-01-01T14:00:00'), potrosnja_kwh: 2 },
        { datum_vrijeme: new Date('2024-01-01T20:00:00'), potrosnja_kwh: 8 },
        { datum_vrijeme: new Date('2024-01-01T20:00:00'), potrosnja_kwh: 8 },
      ];

      const optimalTimes = identifyOptimalUsageTimes(hourlyData);

      expect(optimalTimes).toBeDefined();
      expect(optimalTimes.lowestConsumptionHours).toBeDefined();
      expect(optimalTimes.highestConsumptionHours).toBeDefined();
      expect(optimalTimes.lowestConsumptionHours[0].hour).toBe(14);
      expect(optimalTimes.highestConsumptionHours[0].hour).toBe(20);
    });

    it('should return null for empty data', () => {
      const hourlyData = [];

      const optimalTimes = identifyOptimalUsageTimes(hourlyData);

      expect(optimalTimes).toBeNull();
    });
  });

  describe('clusterDevicesByUsage', () => {
    it('should cluster devices by consumption levels', () => {
      const deviceData = [
        { naziv: 'Klima', total_consumption: 100, avg_power: 1500, uptime_percentage: 30 },
        { naziv: 'Hladnjak', total_consumption: 50, avg_power: 150, uptime_percentage: 100 },
        { naziv: 'TV', total_consumption: 20, avg_power: 100, uptime_percentage: 50 },
        { naziv: 'Router', total_consumption: 5, avg_power: 10, uptime_percentage: 100 },
      ];

      const clusters = clusterDevicesByUsage(deviceData);

      expect(clusters).toBeDefined();
      expect(clusters.high_consumption).toBeDefined();
      expect(clusters.medium_consumption).toBeDefined();
      expect(clusters.low_consumption).toBeDefined();
      expect(clusters.vampire_devices).toBeDefined();
    });

    it('should identify vampire devices (low power, high uptime)', () => {
      const deviceData = [
        { naziv: 'Router', total_consumption: 5, avg_power: 10, uptime_percentage: 95 },
        { naziv: 'Klima', total_consumption: 100, avg_power: 1500, uptime_percentage: 30 },
      ];

      const clusters = clusterDevicesByUsage(deviceData);

      expect(clusters.vampire_devices.length).toBeGreaterThan(0);
      expect(clusters.vampire_devices[0].naziv).toBe('Router');
    });

    it('should return null for empty data', () => {
      const deviceData = [];

      const clusters = clusterDevicesByUsage(deviceData);

      expect(clusters).toBeNull();
    });
  });
});
