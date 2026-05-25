-- ================================================================
-- EcoMetrix - Fix demo podataka
-- Problem: uredjaj_id 4 i 5 vec postojali, mjerenja na krivim ID-ovima
-- Rjesenje: premjesti procjena mjerenja na tocne uredjaje
-- ================================================================

USE ecometrix;

-- 1. Ukloni pogresno smjestena mjerenja iz uredjaj 4 i 5 (tvoji postojeci uredjaji)
DELETE FROM mjerenje WHERE uredjaj_id=4 AND tip_mjerenja='procjena' AND datum_vrijeme >= '2026-03-04';
DELETE FROM mjerenje WHERE uredjaj_id=5 AND tip_mjerenja='procjena' AND datum_vrijeme >= '2026-03-04';

-- 2. Premjesti mjerenja na tocne uredjaje (redoslijed bitan!)
-- LED: 8 -> 10
UPDATE mjerenje SET uredjaj_id=10 WHERE uredjaj_id=8 AND tip_mjerenja='procjena' AND datum_vrijeme >= '2026-03-04';
-- Laptop: 7 -> 9
UPDATE mjerenje SET uredjaj_id=9 WHERE uredjaj_id=7 AND tip_mjerenja='procjena' AND datum_vrijeme >= '2026-03-04';
-- Bojler: 6 -> 8
UPDATE mjerenje SET uredjaj_id=8 WHERE uredjaj_id=6 AND tip_mjerenja='procjena' AND datum_vrijeme >= '2026-03-04';

-- 3. Dodaj Klima mjerenja (uredjaj_id=6, sada prazan)
INSERT INTO mjerenje (uredjaj_id, utikac_id, vrijednost_kwh, datum_vrijeme, tip_mjerenja, validno) VALUES
(6,NULL,0.12,'2026-03-04 16:00:00','procjena',1),
(6,NULL,0.00,'2026-03-05 16:00:00','procjena',1),
(6,NULL,0.15,'2026-03-06 16:00:00','procjena',1),
(6,NULL,0.08,'2026-03-07 16:00:00','procjena',1),
(6,NULL,0.00,'2026-03-08 16:00:00','procjena',1),
(6,NULL,0.10,'2026-03-09 16:00:00','procjena',1),
(6,NULL,0.18,'2026-03-10 16:00:00','procjena',1),
(6,NULL,0.09,'2026-03-11 16:00:00','procjena',1),
(6,NULL,0.21,'2026-03-12 16:00:00','procjena',1),
(6,NULL,0.30,'2026-03-13 16:00:00','procjena',1),
(6,NULL,0.10,'2026-03-14 16:00:00','procjena',1),
(6,NULL,0.00,'2026-03-15 16:00:00','procjena',1),
(6,NULL,0.13,'2026-03-16 16:00:00','procjena',1),
(6,NULL,0.20,'2026-03-17 16:00:00','procjena',1),
(6,NULL,0.25,'2026-03-18 16:00:00','procjena',1),
(6,NULL,0.18,'2026-03-19 16:00:00','procjena',1),
(6,NULL,0.35,'2026-03-20 16:00:00','procjena',1),
(6,NULL,0.22,'2026-03-21 16:00:00','procjena',1),
(6,NULL,0.00,'2026-03-22 16:00:00','procjena',1),
(6,NULL,0.28,'2026-03-23 16:00:00','procjena',1),
(6,NULL,0.15,'2026-03-24 16:00:00','procjena',1),
(6,NULL,5.80,'2026-03-25 16:00:00','procjena',1),
(6,NULL,0.30,'2026-03-26 16:00:00','procjena',1),
(6,NULL,0.42,'2026-03-27 16:00:00','procjena',1),
(6,NULL,0.38,'2026-03-28 16:00:00','procjena',1),
(6,NULL,0.20,'2026-03-29 16:00:00','procjena',1),
(6,NULL,0.25,'2026-03-30 16:00:00','procjena',1),
(6,NULL,0.32,'2026-03-31 16:00:00','procjena',1),
(6,NULL,1.21,'2026-04-01 16:00:00','procjena',1),
(6,NULL,0.87,'2026-04-02 16:00:00','procjena',1),
(6,NULL,1.52,'2026-04-03 16:00:00','procjena',1),
(6,NULL,1.08,'2026-04-04 16:00:00','procjena',1),
(6,NULL,0.94,'2026-04-05 16:00:00','procjena',1),
(6,NULL,1.65,'2026-04-06 16:00:00','procjena',1),
(6,NULL,1.82,'2026-04-07 16:00:00','procjena',1),
(6,NULL,1.45,'2026-04-08 16:00:00','procjena',1),
(6,NULL,1.68,'2026-04-09 16:00:00','procjena',1),
(6,NULL,2.05,'2026-04-10 16:00:00','procjena',1),
(6,NULL,1.85,'2026-04-11 16:00:00','procjena',1),
(6,NULL,1.52,'2026-04-12 16:00:00','procjena',1),
(6,NULL,2.25,'2026-04-13 16:00:00','procjena',1),
(6,NULL,2.15,'2026-04-14 16:00:00','procjena',1),
(6,NULL,2.51,'2026-04-15 16:00:00','procjena',1),
(6,NULL,2.18,'2026-04-16 16:00:00','procjena',1),
(6,NULL,2.85,'2026-04-17 16:00:00','procjena',1),
(6,NULL,12.50,'2026-04-18 16:00:00','procjena',1),
(6,NULL,8.20,'2026-04-19 16:00:00','procjena',1),
(6,NULL,2.32,'2026-04-20 16:00:00','procjena',1),
(6,NULL,2.68,'2026-04-21 16:00:00','procjena',1),
(6,NULL,2.82,'2026-04-22 16:00:00','procjena',1),
(6,NULL,3.12,'2026-04-23 16:00:00','procjena',1),
(6,NULL,2.95,'2026-04-24 16:00:00','procjena',1),
(6,NULL,3.52,'2026-04-25 16:00:00','procjena',1),
(6,NULL,3.82,'2026-04-26 16:00:00','procjena',1),
(6,NULL,3.15,'2026-04-27 16:00:00','procjena',1),
(6,NULL,3.48,'2026-04-28 16:00:00','procjena',1),
(6,NULL,3.82,'2026-04-29 16:00:00','procjena',1),
(6,NULL,4.15,'2026-04-30 16:00:00','procjena',1),
(6,NULL,4.82,'2026-05-01 16:00:00','procjena',1),
(6,NULL,5.21,'2026-05-02 16:00:00','procjena',1),
(6,NULL,3.15,'2026-05-03 16:00:00','procjena',1);

-- 4. Dodaj Perilica rublja mjerenja (uredjaj_id=7, sada prazan)
INSERT INTO mjerenje (uredjaj_id, utikac_id, vrijednost_kwh, datum_vrijeme, tip_mjerenja, validno) VALUES
(7,NULL,2.18,'2026-03-04 10:00:00','procjena',1),
(7,NULL,2.25,'2026-03-07 10:00:00','procjena',1),
(7,NULL,2.20,'2026-03-11 10:00:00','procjena',1),
(7,NULL,2.31,'2026-03-14 10:00:00','procjena',1),
(7,NULL,4.85,'2026-03-25 10:00:00','procjena',1),
(7,NULL,2.15,'2026-03-28 10:00:00','procjena',1),
(7,NULL,2.22,'2026-04-01 10:00:00','procjena',1),
(7,NULL,2.28,'2026-04-04 10:00:00','procjena',1),
(7,NULL,2.19,'2026-04-08 10:00:00','procjena',1),
(7,NULL,2.35,'2026-04-11 10:00:00','procjena',1),
(7,NULL,2.21,'2026-04-15 10:00:00','procjena',1),
(7,NULL,5.20,'2026-04-18 10:00:00','procjena',1),
(7,NULL,2.24,'2026-04-22 10:00:00','procjena',1),
(7,NULL,2.30,'2026-04-25 10:00:00','procjena',1),
(7,NULL,2.18,'2026-04-29 10:00:00','procjena',1),
(7,NULL,2.26,'2026-05-02 10:00:00','procjena',1);