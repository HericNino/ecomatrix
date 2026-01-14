/**
 * Migration: Create Notifications Table
 *
 * Stores system notifications for users about critical events:
 * - Device failures
 * - Consumption anomalies
 * - High consumption warnings
 * - System alerts
 */

CREATE TABLE IF NOT EXISTS notifikacija (
  notifikacija_id INT AUTO_INCREMENT PRIMARY KEY,
  korisnik_id INT NOT NULL,
  kucanstvo_id INT DEFAULT NULL,
  uredjaj_id INT DEFAULT NULL,

  -- Notification details
  tip ENUM('device_failure', 'high_consumption', 'anomaly', 'system', 'warning', 'info') NOT NULL,
  prioritet ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
  naslov VARCHAR(255) NOT NULL,
  poruka TEXT NOT NULL,

  -- Metadata
  metadata JSON DEFAULT NULL, -- Additional data (device name, consumption value, etc.)

  -- Status
  procitano BOOLEAN DEFAULT FALSE,
  arhivirano BOOLEAN DEFAULT FALSE,

  -- Timestamps
  datum_kreiranja TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  datum_procitano TIMESTAMP NULL DEFAULT NULL,

  -- Foreign keys
  FOREIGN KEY (korisnik_id) REFERENCES korisnik(korisnik_id) ON DELETE CASCADE,
  FOREIGN KEY (kucanstvo_id) REFERENCES kucanstvo(kucanstvo_id) ON DELETE CASCADE,
  FOREIGN KEY (uredjaj_id) REFERENCES uredjaj(uredjaj_id) ON DELETE CASCADE,

  -- Indexes for performance
  INDEX idx_korisnik_procitano (korisnik_id, procitano),
  INDEX idx_datum_kreiranja (datum_kreiranja DESC),
  INDEX idx_tip_prioritet (tip, prioritet)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create index for quick unread count queries
CREATE INDEX idx_unread_notifications ON notifikacija(korisnik_id, procitano, datum_kreiranja)
  WHERE procitano = FALSE;
