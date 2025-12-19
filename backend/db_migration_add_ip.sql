-- Dodavanje IP adrese u tablicu pametni_utikac za komunikaciju sa Shelly uređajima

ALTER TABLE `pametni_utikac`
ADD COLUMN `ip_adresa` VARCHAR(45) NULL COMMENT 'IP adresa uređaja u lokalnoj mreži' AFTER `status`;

-- Kreiranje indexa za brže pretraživanje
ALTER TABLE `pametni_utikac`
ADD INDEX `idx_ip_adresa` (`ip_adresa`);