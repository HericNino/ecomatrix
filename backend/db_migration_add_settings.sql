-- Migracija: Dodavanje postavki za cijenu struje
-- Datum: 2025-12-21

-- Dodaj kolonu za cijenu struje u tablicu kucanstvo
ALTER TABLE kucanstvo
ADD COLUMN cijena_kwh DECIMAL(10, 4) DEFAULT 0.15 COMMENT 'Cijena struje u EUR po kWh';

-- Dodaj kolonu za valutu
ALTER TABLE kucanstvo
ADD COLUMN valuta VARCHAR(3) DEFAULT 'EUR' COMMENT 'Valuta (EUR, HRK, itd.)';
