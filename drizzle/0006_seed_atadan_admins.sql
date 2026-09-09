INSERT INTO `staff` (`id`,`email`,`display_name`,`role`,`password_hash`,`salt`,`active`,`theme`,`phone`)
VALUES ('atadan-owner-bekbolsun','bekbolsunjamshutov@gmail.com','Bekbolsun Jamshutov','owner','bcaae81daf5871aa5665f9f2e8456a027f224d5139cdcdb2cf6882b4a22d89c1','4f7b25eff102ed8f790bc36cb71a2811e3727fe5cad96176',1,'field','')
ON CONFLICT(`email`) DO UPDATE SET
  `display_name`=excluded.`display_name`,
  `role`=excluded.`role`,
  `password_hash`=excluded.`password_hash`,
  `salt`=excluded.`salt`,
  `active`=1;
--> statement-breakpoint
INSERT INTO `staff` (`id`,`email`,`display_name`,`role`,`password_hash`,`salt`,`active`,`theme`,`phone`)
VALUES ('atadan-director-islam','i131404@gmail.com','Ислам Мирбек уулу','director','e2f3e188847379f671659e312eefbb3d6081d2ce8e379ccd9d702cd80eec4e1a','fa10ebfcf18bfeab4a90771daf6d9d341799cdccaf923a3d',1,'field','+996 706 131 404')
ON CONFLICT(`email`) DO UPDATE SET
  `display_name`=excluded.`display_name`,
  `role`=excluded.`role`,
  `password_hash`=excluded.`password_hash`,
  `salt`=excluded.`salt`,
  `active`=1;
