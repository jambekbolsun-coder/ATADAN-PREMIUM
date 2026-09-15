INSERT INTO `staff` (`id`,`email`,`display_name`,`role`,`password_hash`,`salt`,`active`,`theme`,`phone`)
VALUES ('atadan-owner-bekbolsun','bekbolsunjamshutov@gmail.com','Bekbolsun Jamshutov','owner','5713aa9e9e7ff711cfec912ab5e4d6495ab3a812c2b5aa3d7c1ae96246c17770','f95b209ea79f26e7dd831e98f2db5f7454b8cb5e555e2340',1,'field','')
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
