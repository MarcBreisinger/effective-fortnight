-- MySQL dump 10.13  Distrib 9.5.0, for macos15 (arm64)
--
-- Host: 127.0.0.1    Database: marcb_notbetreuung
-- ------------------------------------------------------
-- Server version	5.5.5-10.6.19-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `schedule_id` int(11) NOT NULL,
  `child_id` int(11) NOT NULL,
  `attended` tinyint(1) DEFAULT 0,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_schedule_child` (`schedule_id`,`child_id`),
  KEY `idx_schedule_id` (`schedule_id`),
  KEY `idx_child_id` (`child_id`),
  KEY `idx_attended` (`attended`),
  CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`schedule_id`) REFERENCES `daily_schedules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `attendance_ibfk_2` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance`
--

LOCK TABLES `attendance` WRITE;
/*!40000 ALTER TABLE `attendance` DISABLE KEYS */;
/*!40000 ALTER TABLE `attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `children`
--

DROP TABLE IF EXISTS `children`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `children` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `assigned_group` enum('A','B','C','D') NOT NULL,
  `registration_code` varchar(50) NOT NULL,
  `created_by_staff` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `registration_code` (`registration_code`),
  KEY `created_by_staff` (`created_by_staff`),
  KEY `idx_group` (`assigned_group`),
  KEY `idx_registration_code` (`registration_code`),
  CONSTRAINT `children_ibfk_1` FOREIGN KEY (`created_by_staff`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `children`
--

LOCK TABLES `children` WRITE;
/*!40000 ALTER TABLE `children` DISABLE KEYS */;
INSERT INTO `children` VALUES (1,'Child 1','A','2FFFFB1C',1,'2025-10-28 00:47:52','2025-10-28 14:29:17'),(2,'Child2','A','78B8A535',1,'2025-10-28 00:48:07','2025-10-28 00:48:07'),(3,'Child3','A','E55752F8',1,'2025-10-28 12:43:04','2025-10-28 12:43:04'),(4,'Child4','A','301B5CA9',1,'2025-10-28 12:45:20','2025-10-28 12:45:20'),(5,'Child5','A','ADF00B58',1,'2025-10-28 12:45:36','2025-10-28 12:45:36'),(6,'Child 6','A','A9CBC280',1,'2025-10-28 12:45:50','2025-10-28 12:45:50'),(7,'Child7','A','875BC4FB',1,'2025-10-28 12:48:13','2025-10-28 12:48:13'),(8,'Child8','A','3174BF15',1,'2025-10-28 12:48:29','2025-10-28 12:48:29'),(9,'Child9','A','802F37FF',1,'2025-10-28 12:48:42','2025-10-28 12:48:42'),(10,'Child10','A','36917CBE',1,'2025-10-28 12:48:50','2025-10-28 12:48:50'),(11,'Child11','A','47180AB1',1,'2025-10-28 12:52:42','2025-10-28 12:52:42'),(12,'Child12','A','F121B792',1,'2025-10-28 12:54:31','2025-10-28 12:54:31'),(13,'Child13','B','2759C379',1,'2025-10-28 12:55:29','2025-10-28 12:55:29'),(14,'Merlin','B','4E94A6B1',1,'2025-10-28 12:55:43','2025-10-29 13:11:16'),(15,'Child15','B','D82B70B1',1,'2025-10-28 12:56:03','2025-10-28 12:56:03'),(16,'Child16','B','A26CD8A6',1,'2025-10-28 12:57:02','2025-10-28 12:57:02'),(17,'Child17','B','CF08765C',1,'2025-10-28 12:57:14','2025-10-28 12:57:14'),(18,'Child18','B','76BB5603',1,'2025-10-28 12:57:36','2025-10-28 12:57:36'),(19,'Child19','B','E86D3A2B',1,'2025-10-28 12:57:59','2025-10-28 12:57:59'),(20,'Child20','B','789872AB',1,'2025-10-28 12:58:14','2025-10-28 12:58:14'),(21,'Child21','B','4A6C4B2E',1,'2025-10-28 12:58:38','2025-10-28 12:58:38'),(22,'Child22','B','35BF3438',1,'2025-10-28 12:58:53','2025-10-28 12:58:53'),(23,'Child23','B','AE41D9E4',1,'2025-10-28 12:59:04','2025-10-28 12:59:04'),(24,'Child24','B','0E63257A',1,'2025-10-28 12:59:27','2025-10-28 12:59:27'),(25,'Child25','C','DBEEB602',1,'2025-10-28 13:02:45','2025-10-28 13:02:45'),(26,'Child26','C','F72F3495',1,'2025-10-28 13:02:45','2025-10-28 13:02:45'),(27,'Child27','C','6DFC6B9F',1,'2025-10-28 13:02:46','2025-10-28 13:02:46'),(28,'Child28','C','F231FFE1',1,'2025-10-28 13:02:46','2025-10-28 13:02:46'),(29,'Child29','C','E248A932',1,'2025-10-28 13:02:46','2025-10-28 13:02:46'),(30,'Child30','C','DBA15EBB',1,'2025-10-28 13:02:46','2025-10-28 13:02:46'),(31,'Child31','C','34B1B825',1,'2025-10-28 13:02:46','2025-10-28 13:02:46'),(32,'Child32','C','424E1698',1,'2025-10-28 13:02:46','2025-10-28 13:02:46'),(33,'Child33','C','7E2350B1',1,'2025-10-28 13:02:46','2025-10-28 13:02:46'),(34,'Child34','C','4422467F',1,'2025-10-28 13:02:46','2025-10-28 13:02:46'),(35,'Child35','C','900EDF01',1,'2025-10-28 13:02:46','2025-10-28 13:02:46'),(36,'Child37','D','462B4521',1,'2025-10-28 13:04:22','2025-10-28 13:04:22'),(37,'Child38','D','A2FC88A9',1,'2025-10-28 13:04:22','2025-10-28 13:04:22'),(38,'Child39','D','499D9ABC',1,'2025-10-28 13:04:22','2025-10-28 13:04:22'),(39,'Child40','D','B57C177C',1,'2025-10-28 13:04:22','2025-10-28 13:04:22'),(40,'Child41','D','42D3E605',1,'2025-10-28 13:04:23','2025-10-28 13:04:23'),(41,'Child42','D','B6FACD40',1,'2025-10-28 13:04:23','2025-10-28 13:04:23'),(42,'Child43','D','FE6E1C1C',1,'2025-10-28 13:04:23','2025-10-28 13:04:23'),(43,'Child44','D','36ED2194',1,'2025-10-28 13:04:23','2025-10-28 13:04:23'),(44,'Child45','D','B41B84A4',1,'2025-10-28 13:04:23','2025-10-28 13:04:23'),(45,'Child46','D','DF26D684',1,'2025-10-28 13:04:23','2025-10-28 13:04:23'),(46,'Child47','D','6B6357E7',1,'2025-10-28 13:04:23','2025-10-28 13:04:23'),(47,'Child48','D','25A720CD',1,'2025-10-28 13:04:23','2025-10-28 13:04:23');
/*!40000 ALTER TABLE `children` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `daily_attendance_status`
--

DROP TABLE IF EXISTS `daily_attendance_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `daily_attendance_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `child_id` int(11) NOT NULL,
  `attendance_date` date NOT NULL,
  `status` enum('attending','slot_given_up','waiting_list') NOT NULL DEFAULT 'attending',
  `parent_message` text DEFAULT NULL,
  `updated_by_user` int(11) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_child_date` (`child_id`,`attendance_date`),
  KEY `updated_by_user` (`updated_by_user`),
  KEY `idx_child_date` (`child_id`,`attendance_date`),
  KEY `idx_status` (`status`),
  KEY `idx_date` (`attendance_date`),
  CONSTRAINT `daily_attendance_status_ibfk_1` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE,
  CONSTRAINT `daily_attendance_status_ibfk_2` FOREIGN KEY (`updated_by_user`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `daily_attendance_status`
--

LOCK TABLES `daily_attendance_status` WRITE;
/*!40000 ALTER TABLE `daily_attendance_status` DISABLE KEYS */;
INSERT INTO `daily_attendance_status` VALUES (1,1,'2025-10-28','attending','',2,'2025-10-28 12:37:56'),(2,1,'2025-10-29','attending','',2,'2025-11-04 11:08:56'),(3,14,'2025-11-04','slot_given_up','',3,'2025-11-04 11:10:12'),(5,14,'2025-11-06','attending','',3,'2025-11-04 09:37:16'),(16,14,'2025-11-07','waiting_list','',3,'2025-11-07 20:58:41'),(17,1,'2025-11-07','slot_given_up','',2,'2025-11-04 13:18:58'),(18,13,'2025-11-07','attending','',2,'2025-11-07 20:58:11'),(19,14,'2025-11-10','slot_given_up','',3,'2025-11-10 11:25:05'),(21,14,'2025-11-12','slot_given_up','Blubb',3,'2025-11-12 15:36:09');
/*!40000 ALTER TABLE `daily_attendance_status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `daily_schedules`
--

DROP TABLE IF EXISTS `daily_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `daily_schedules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `schedule_date` date NOT NULL,
  `group_order` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Array of groups in priority order, e.g., ["A","B","C","D"]' CHECK (json_valid(`group_order`)),
  `capacity_limit` int(11) NOT NULL DEFAULT 4 CHECK (`capacity_limit` between 0 and 4),
  `attending_groups` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Array of groups that can attend based on capacity' CHECK (json_valid(`attending_groups`)),
  `created_by_staff` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `schedule_date` (`schedule_date`),
  KEY `created_by_staff` (`created_by_staff`),
  KEY `idx_schedule_date` (`schedule_date`),
  CONSTRAINT `daily_schedules_ibfk_1` FOREIGN KEY (`created_by_staff`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `daily_schedules`
--

LOCK TABLES `daily_schedules` WRITE;
/*!40000 ALTER TABLE `daily_schedules` DISABLE KEYS */;
INSERT INTO `daily_schedules` VALUES (1,'2025-10-28','[\"D\",\"A\",\"B\",\"C\"]',2,'[\"D\",\"A\"]',1,'2025-10-28 00:47:28','2025-10-28 15:30:48'),(2,'2025-10-29','[\"A\",\"B\",\"C\",\"D\"]',2,'[\"A\",\"B\"]',1,'2025-10-28 08:11:04','2025-10-28 15:30:48'),(3,'2025-10-01','[\"B\",\"C\",\"D\",\"A\"]',4,'[\"B\",\"C\",\"D\",\"A\"]',1,'2025-10-28 08:40:19','2025-10-28 15:30:48'),(4,'2025-10-02','[\"C\",\"D\",\"A\",\"B\"]',4,'[\"C\",\"D\",\"A\",\"B\"]',1,'2025-10-28 08:40:19','2025-10-28 15:30:48'),(5,'2025-10-03','[\"A\",\"C\",\"B\",\"D\"]',4,'[\"A\",\"C\",\"B\",\"D\"]',1,'2025-10-28 08:40:19','2025-10-28 08:48:09'),(6,'2025-10-06','[\"D\",\"A\",\"B\",\"C\"]',4,'[\"D\",\"A\",\"B\",\"C\"]',1,'2025-10-28 08:40:19','2025-10-28 15:30:53'),(7,'2025-10-08','[\"B\",\"C\",\"D\",\"A\"]',4,'[\"B\",\"C\",\"D\",\"A\"]',1,'2025-10-28 08:40:19','2025-10-28 15:30:53'),(8,'2025-10-09','[\"C\",\"D\",\"A\",\"B\"]',4,'[\"C\",\"D\",\"A\",\"B\"]',1,'2025-10-28 08:40:19','2025-10-28 15:30:48'),(9,'2025-10-05','[\"A\",\"B\",\"C\",\"D\"]',4,'[\"A\",\"B\",\"C\",\"D\"]',1,'2025-10-28 08:40:19','2025-10-28 08:40:19'),(10,'2025-10-04','[\"A\",\"B\",\"C\",\"D\"]',4,'[\"A\",\"B\",\"C\",\"D\"]',1,'2025-10-28 08:40:19','2025-10-28 08:40:19'),(11,'2025-10-07','[\"A\",\"B\",\"C\",\"D\"]',4,'[\"A\",\"B\",\"C\",\"D\"]',1,'2025-10-28 08:40:19','2025-10-28 08:40:19'),(12,'2025-10-10','[\"D\",\"A\",\"B\",\"C\"]',4,'[\"D\",\"A\",\"B\",\"C\"]',1,'2025-10-28 08:40:19','2025-10-28 15:30:48'),(13,'2025-10-11','[\"A\",\"B\",\"C\",\"D\"]',4,'[\"A\",\"B\",\"C\",\"D\"]',1,'2025-10-28 08:40:19','2025-10-28 08:40:19'),(14,'2025-10-12','[\"A\",\"B\",\"C\",\"D\"]',4,'[\"A\",\"B\",\"C\",\"D\"]',1,'2025-10-28 08:40:19','2025-10-28 08:40:19'),(15,'2025-10-13','[\"A\",\"B\",\"C\",\"D\"]',4,'[\"A\",\"B\",\"C\",\"D\"]',1,'2025-10-28 08:40:19','2025-10-28 08:40:19'),(16,'2025-10-15','[\"C\",\"D\",\"A\",\"B\"]',4,'[\"C\",\"D\",\"A\",\"B\"]',1,'2025-10-28 08:40:19','2025-10-28 15:30:48'),(17,'2025-10-14','[\"B\",\"C\",\"D\",\"A\"]',4,'[\"B\",\"C\",\"D\",\"A\"]',1,'2025-10-28 08:40:19','2025-10-28 15:30:48'),(18,'2025-10-16','[\"D\",\"A\",\"B\",\"C\"]',4,'[\"D\",\"A\",\"B\",\"C\"]',1,'2025-10-28 08:40:19','2025-10-28 15:30:48'),(19,'2025-10-17','[\"A\",\"B\",\"C\",\"D\"]',4,'[\"A\",\"B\",\"C\",\"D\"]',1,'2025-10-28 08:40:19','2025-10-28 08:40:19'),(20,'2025-10-18','[\"A\",\"B\",\"C\",\"D\"]',4,'[\"A\",\"B\",\"C\",\"D\"]',1,'2025-10-28 08:40:19','2025-10-28 08:40:19'),(21,'2025-10-19','[\"A\",\"B\",\"C\",\"D\"]',4,'[\"A\",\"B\",\"C\",\"D\"]',1,'2025-10-28 08:40:19','2025-10-28 08:40:19'),(22,'2025-10-20','[\"B\",\"C\",\"D\",\"A\"]',4,'[\"B\",\"C\",\"D\",\"A\"]',1,'2025-10-28 08:40:19','2025-10-28 15:30:48'),(23,'2025-10-21','[\"C\",\"D\",\"A\",\"B\"]',4,'[\"C\",\"D\",\"A\",\"B\"]',1,'2025-10-28 08:40:19','2025-10-28 15:30:48'),(24,'2025-10-22','[\"D\",\"A\",\"B\",\"C\"]',4,'[\"D\",\"A\",\"B\",\"C\"]',1,'2025-10-28 08:40:19','2025-10-28 15:30:48'),(25,'2025-10-25','[\"A\",\"B\",\"C\",\"D\"]',4,'[\"A\",\"B\",\"C\",\"D\"]',1,'2025-10-28 08:40:19','2025-10-28 08:40:19'),(26,'2025-10-24','[\"B\",\"C\",\"D\",\"A\"]',4,'[\"B\",\"C\",\"D\",\"A\"]',1,'2025-10-28 08:40:19','2025-10-28 15:30:48'),(27,'2025-10-23','[\"A\",\"B\",\"C\",\"D\"]',4,'[\"A\",\"B\",\"C\",\"D\"]',1,'2025-10-28 08:40:19','2025-10-28 08:40:19'),(28,'2025-10-26','[\"A\",\"B\",\"C\",\"D\"]',4,'[\"A\",\"B\",\"C\",\"D\"]',1,'2025-10-28 08:40:19','2025-10-28 08:40:19'),(29,'2025-10-27','[\"C\",\"D\",\"A\",\"B\"]',4,'[\"C\",\"D\",\"A\",\"B\"]',1,'2025-10-28 08:40:19','2025-10-28 15:30:48'),(30,'2025-10-31','[\"C\",\"D\",\"A\",\"B\"]',3,'[\"C\",\"D\",\"A\"]',1,'2025-10-28 08:40:19','2025-10-31 15:44:57'),(31,'2025-10-30','[\"B\",\"C\",\"D\",\"A\"]',4,'[\"B\",\"C\",\"D\",\"A\"]',1,'2025-10-28 08:40:19','2025-10-28 15:30:48'),(32,'2025-11-02','[\"A\",\"B\",\"C\",\"D\"]',3,'[\"A\",\"B\",\"C\"]',1,'2025-10-28 14:19:41','2025-10-28 14:19:43'),(33,'2025-11-03','[\"D\",\"A\",\"B\",\"C\"]',4,'[\"D\",\"A\",\"B\",\"C\"]',1,'2025-11-03 21:33:34','2025-11-03 21:33:34'),(34,'2025-11-04','[\"A\",\"B\",\"C\",\"D\"]',1,'[\"A\"]',1,'2025-11-03 21:33:34','2025-11-04 09:35:51'),(35,'2025-11-06','[\"C\",\"D\",\"A\",\"B\"]',3,'[\"C\",\"D\",\"A\"]',1,'2025-11-03 21:33:34','2025-11-04 11:11:02'),(36,'2025-11-05','[\"B\",\"C\",\"D\",\"A\"]',4,'[\"B\",\"C\",\"D\",\"A\"]',1,'2025-11-03 21:33:34','2025-11-03 21:33:34'),(37,'2025-11-10','[\"A\",\"B\",\"C\",\"D\"]',4,'[\"A\",\"B\",\"C\",\"D\"]',1,'2025-11-03 21:33:34','2025-11-03 21:33:34'),(38,'2025-11-11','[\"B\",\"C\",\"D\",\"A\"]',4,'[\"B\",\"C\",\"D\",\"A\"]',1,'2025-11-03 21:33:34','2025-11-03 21:33:34'),(39,'2025-11-07','[\"D\",\"A\",\"B\",\"C\"]',2,'[\"D\",\"A\"]',1,'2025-11-03 21:33:34','2025-11-04 13:18:32'),(40,'2025-11-12','[\"C\",\"D\",\"A\",\"B\"]',4,'[\"C\",\"D\",\"A\",\"B\"]',1,'2025-11-03 21:33:34','2025-11-03 21:33:34'),(41,'2025-11-13','[\"D\",\"A\",\"B\",\"C\"]',4,'[\"D\",\"A\",\"B\",\"C\"]',1,'2025-11-03 21:33:34','2025-11-03 21:33:34'),(42,'2025-11-14','[\"A\",\"B\",\"C\",\"D\"]',4,'[\"A\",\"B\",\"C\",\"D\"]',1,'2025-11-03 21:33:34','2025-11-03 21:33:34'),(43,'2025-11-17','[\"B\",\"C\",\"D\",\"A\"]',4,'[\"B\",\"C\",\"D\",\"A\"]',1,'2025-11-03 21:33:34','2025-11-03 21:33:34'),(44,'2025-11-18','[\"C\",\"D\",\"A\",\"B\"]',3,'[\"C\",\"D\",\"A\"]',1,'2025-11-03 21:33:34','2025-11-18 08:01:38'),(45,'2025-11-20','[\"A\",\"B\",\"C\",\"D\"]',4,'[\"A\",\"B\",\"C\",\"D\"]',1,'2025-11-03 21:33:34','2025-11-03 21:33:34'),(46,'2025-11-19','[\"D\",\"A\",\"B\",\"C\"]',4,'[\"D\",\"A\",\"B\",\"C\"]',1,'2025-11-03 21:33:34','2025-11-03 21:33:34'),(47,'2025-11-21','[\"B\",\"C\",\"D\",\"A\"]',4,'[\"B\",\"C\",\"D\",\"A\"]',1,'2025-11-03 21:33:34','2025-11-03 21:33:34'),(48,'2025-11-24','[\"C\",\"D\",\"A\",\"B\"]',4,'[\"C\",\"D\",\"A\",\"B\"]',1,'2025-11-03 21:33:34','2025-11-03 21:33:34'),(49,'2025-11-25','[\"D\",\"A\",\"B\",\"C\"]',4,'[\"D\",\"A\",\"B\",\"C\"]',1,'2025-11-03 21:33:34','2025-11-03 21:33:34'),(50,'2025-11-26','[\"A\",\"B\",\"C\",\"D\"]',4,'[\"A\",\"B\",\"C\",\"D\"]',1,'2025-11-03 21:33:34','2025-11-03 21:33:34'),(51,'2025-11-27','[\"B\",\"C\",\"D\",\"A\"]',4,'[\"B\",\"C\",\"D\",\"A\"]',1,'2025-11-03 21:33:34','2025-11-03 21:33:34'),(52,'2025-11-28','[\"C\",\"D\",\"A\",\"B\"]',4,'[\"C\",\"D\",\"A\",\"B\"]',1,'2025-11-03 21:33:34','2025-11-03 21:33:34');
/*!40000 ALTER TABLE `daily_schedules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_token` (`token`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `password_reset_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
INSERT INTO `password_reset_tokens` VALUES (1,2,'20b152256858f32573418b4ca784fbb32bcf11072a2b8293cb0713181704e01e','2025-10-29 15:52:19',1,'2025-10-29 13:52:19'),(2,3,'b45ae4f172a49f2925d2a10439a453231f210a1c7b15d6b9861b1a385f888923','2025-10-31 17:20:37',1,'2025-10-31 15:20:37'),(3,3,'ce833664f18a312720f2060be75739aceef020a7185083bb601c6be86fc1ce2d','2025-11-05 03:39:03',0,'2025-11-05 01:39:03'),(4,3,'f1e61f8c8ddc2cc363ea1efc5ffae4fab9dc72adb2134a7549cf8f4210e316fc','2025-11-05 12:30:02',0,'2025-11-05 10:30:02'),(5,3,'cace26237f8db92c9c4c2c5342dfe0a3b17c30381d81857eae7469538e70f0c6','2025-11-05 12:34:17',0,'2025-11-05 10:34:17'),(6,3,'cb26bd993c2fbc447770bc718f759a009a77cc6869e16c89e3de0c5cdb550171','2025-11-06 10:47:02',0,'2025-11-06 08:47:02'),(7,3,'0824c92f7df44be4b6eb65c88c780dc79c7544d280754ebbcf43ab9aebf65121','2025-11-06 10:49:48',0,'2025-11-06 08:49:48'),(8,3,'ff02c41d6cee8c054477c8e1fcd73d6a517c2af1cde8f2d06d76d0236cb2fea1','2025-11-06 11:38:02',0,'2025-11-06 09:38:02'),(9,3,'adfbba03d77b7fc293ee4467217448e14f046bb05f85afc0fe7fdfda73363e84','2025-11-06 11:40:44',0,'2025-11-06 09:40:44'),(10,3,'080607a9f5de6426de4c3477c2cf6b63520689d046c8336cea153c9053b636c8','2025-11-06 11:44:24',0,'2025-11-06 09:44:24'),(11,3,'c81e7f584043d5a55b774009bfca936f5057838db470173c2275283cd9b614fd','2025-11-07 22:55:41',1,'2025-11-07 20:55:41'),(12,3,'281bea0f7fb5287cb94d8b9ebf287029c86d1474e9ecfff5b2b36f43dfc75a8e','2025-11-20 12:32:22',0,'2025-11-20 10:32:22'),(13,3,'f30b3de26c0956a46aeb48a628fc3f1fcd38ae52f7ad5829373f5744a9d502f3','2025-11-20 12:33:15',0,'2025-11-20 10:33:15');
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_child_links`
--

DROP TABLE IF EXISTS `user_child_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_child_links` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `child_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_child` (`user_id`,`child_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_child_id` (`child_id`),
  CONSTRAINT `user_child_links_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_child_links_ibfk_2` FOREIGN KEY (`child_id`) REFERENCES `children` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_child_links`
--

LOCK TABLES `user_child_links` WRITE;
/*!40000 ALTER TABLE `user_child_links` DISABLE KEYS */;
INSERT INTO `user_child_links` VALUES (1,2,1,'2025-10-28 00:49:19'),(2,2,13,'2025-10-28 15:17:37'),(3,3,14,'2025-10-29 13:02:22');
/*!40000 ALTER TABLE `user_child_links` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `role` enum('parent','staff') NOT NULL,
  `language` enum('en','de') NOT NULL DEFAULT 'de',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'staff@daycare.local','$2a$10$cnamonrklifakE4ecY82YuxZYR6XuuQD1.maVybK/.H9Y1AgBE6Ey','Admin','Staff',NULL,'staff','de','2025-10-28 00:33:53','2025-10-28 00:46:27'),(2,'mamamustermann@gmail.com','$2a$10$.Njm/ss2VSgCIdE/y7XVU.xXMXQeqdtYeBfcTx685Gn4ooeQzNHVW','MamaVon','Child1und13','015160143234','parent','de','2025-10-28 00:49:19','2025-10-29 13:53:30'),(3,'marcbreisinger@gmail.com','$2a$10$tTjxdJWmcG7qI4pjOsf5J.kIw91UmGSiB/aLlXL2ZcbBgKGj66j86','Marc','Breisinger','015207463879','parent','de','2025-10-29 13:02:22','2025-11-07 20:56:43');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-26 23:17:21
