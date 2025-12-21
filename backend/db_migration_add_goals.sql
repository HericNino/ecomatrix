-- Migracija: Kreiranje tablice za ciljeve štednje
-- Datum: 2025-12-21

CREATE TABLE IF NOT EXISTS cilj_stednje (
  cilj_id INT AUTO_INCREMENT PRIMARY KEY,
  kucanstvo_id INT NOT NULL,
  naziv VARCHAR(100) NOT NULL COMMENT 'Naziv cilja (npr. "Mjesečni cilj prosinac 2025")',
  tip_cilja ENUM('mjesecni', 'godisnji', 'custom') DEFAULT 'mjesecni' COMMENT 'Tip cilja',
  cilj_kwh DECIMAL(10, 2) NULL COMMENT 'Cilj potrošnje u kWh',
  cilj_troskova DECIMAL(10, 2) NULL COMMENT 'Cilj troškova u valuti',
  datum_pocetka DATE NOT NULL COMMENT 'Datum početka praćenja cilja',
  datum_zavrsetka DATE NOT NULL COMMENT 'Datum završetka praćenja cilja',
  aktivan BOOLEAN DEFAULT 1 COMMENT 'Je li cilj aktivan',
  kreiran_datum TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (kucanstvo_id) REFERENCES kucanstvo(kucanstvo_id) ON DELETE CASCADE,
  INDEX idx_kucanstvo_aktivan (kucanstvo_id, aktivan),
  INDEX idx_datumi (datum_pocetka, datum_zavrsetka)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
