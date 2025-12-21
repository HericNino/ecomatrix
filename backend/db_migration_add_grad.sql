-- Dodavanje grada u tablicu kucanstvo

ALTER TABLE `kucanstvo`
ADD COLUMN `grad` VARCHAR(100) NULL COMMENT 'Grad u kojem se nalazi kućanstvo' AFTER `adresa`;
