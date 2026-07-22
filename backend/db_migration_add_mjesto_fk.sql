-- Migracija: Vezivanje tablice mjesto na tablicu kucanstvo
-- Mentor Jakob: "trebali biste imati entitet MJESTA i vezati ga na entitet KUĆANSTVO"

-- Korak 1: Dodaj FK kolonu u kucanstvo
ALTER TABLE `kucanstvo`
  ADD COLUMN `mjesto_id` INT NULL COMMENT 'FK na mjesto gdje se nalazi kućanstvo' AFTER `adresa`,
  ADD CONSTRAINT `kucanstvo_ibfk_2` FOREIGN KEY (`mjesto_id`) REFERENCES `mjesto` (`mjesto_id`);

-- Korak 2: Ukloni redundantnu kolonu grad (sada pokrivena kroz mjesto.naziv)
ALTER TABLE `kucanstvo`
  DROP COLUMN `grad`;
