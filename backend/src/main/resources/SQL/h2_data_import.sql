-- H2数据库初始化脚本
-- 从SQLite迁移到H2数据库

-- 创建public schema（如果不存在）
CREATE SCHEMA IF NOT EXISTS public;

-- 设置默认schema为public
SET SCHEMA public;

-- 创建数据表结构
CREATE TABLE IF NOT EXISTS data_e_table (
  id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
  create_time TIMESTAMP NOT NULL,
  system_name VARCHAR(255) NOT NULL,
  system_sq_name VARCHAR(255) NOT NULL,
  e_name VARCHAR(255) NOT NULL,
  e_data VARCHAR(255) NOT NULL
);

-- 清空并重新插入数据到data_e_table
DELETE FROM data_e_table;
INSERT INTO data_e_table (id, create_time, system_name, system_sq_name, e_name, e_data) VALUES
(1,'2025-07-10T15:44:08','电气控制系统','电源','电压波动','15%'),
(2,'2025-07-10T15:44:37','导向系统','导轨','导轨垂直度偏差','0.8'),
(3,'2025-07-10T15:45:06','电气控制系统','电源','电压波动','15%'),
(4,'2025-07-10T16:08:28','曳引系统','曳引机','电机温度','90°C');

-- 创建ai_table表
CREATE TABLE IF NOT EXISTS ai_table (
  id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
  e_id INTEGER NOT NULL,
  ai_code INTEGER,
  ai_result TEXT,
  ai_severity VARCHAR(255),
  CONSTRAINT fk_ai_e_id FOREIGN KEY (e_id) REFERENCES data_e_table (id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 清空并重新插入数据到ai_table
DELETE FROM ai_table;
INSERT INTO ai_table (id, e_id, ai_code, ai_result, ai_severity) VALUES
(1,1,0,'分析结果：电压波动15%可能由电源输入不稳定、负载突变或线路接触不良引起。虽然当前波动幅度未达到严重故障标准，但长期存在可能影响电气元件寿命和电梯运行稳定性。','警告');

-- 创建users表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER NOT NULL PRIMARY KEY,
  user_name VARCHAR(255) NOT NULL,
  user_phone VARCHAR(255),
  position VARCHAR(255),
  role VARCHAR(255),
  email VARCHAR(255),
  password VARCHAR(255),
  salt VARCHAR(255),
  condition VARCHAR(255) DEFAULT '空闲'
);

-- 清空并重新插入数据到users表
DELETE FROM users;
INSERT INTO users (id, user_name, user_phone, position, role, email, password, salt, condition) VALUES
(1002,'王大锤','155555558791','维护人员','maintenance','1234566@qq.com','1234566',NULL,'忙碌');

-- 创建maintain_table表
CREATE TABLE IF NOT EXISTS maintain_table (
  id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
  mt_time TIMESTAMP,
  user_id INTEGER,
  mt_data_id INTEGER,
  status VARCHAR(255),
  remark VARCHAR(255),
  sum INTEGER,
  descr TEXT,
  CONSTRAINT fk_maintain_data_id FOREIGN KEY (mt_data_id) REFERENCES data_e_table (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_maintain_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 清空并重新插入数据到maintain_table
DELETE FROM maintain_table;
INSERT INTO maintain_table (id, mt_time, user_id, mt_data_id, status, remark, sum, descr) VALUES
(1,'2025-07-10T15:57:35',1002,1,'已维护','示例备注',1,NULL);

-- 创建索引
CREATE UNIQUE INDEX IF NOT EXISTS data_e_table_id_uindex ON data_e_table (id);