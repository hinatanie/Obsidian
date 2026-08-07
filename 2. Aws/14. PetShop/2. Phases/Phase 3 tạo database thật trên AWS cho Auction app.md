theo đúng kiến trúc trước đó: **RDS nằm private subnet, chỉ EC2 backend được connect**.  
Phase 3 **tạo database thật trên AWS cho Auction app**.  
Mục tiêu cuối cùng:
```
Spring Boot backend on EC2
   ↓
Amazon RDS MySQL private subnet
   ↓
auction_db
```
Database sẽ lưu các bảng như:
```
users
wallets
auction_items
auction_images
bids
transactions
payments
notifications
```
# Phase 3A — Chuẩn bị trước khi tạo RDS
Trước khi tạo RDS, bạn cần có sẵn từ Phase 2:
```
[ ] auction-vpc
[ ] auction-private-subnet-1
[ ] auction-private-subnet-2
[ ] auction-db-subnet-group
[ ] auction-backend-sg
[ ] auction-rds-sg
```
Vì RDS nên nằm trong **private subnet**, không public ra internet. Khi tạo DB instance trong VPC, RDS dùng DB subnet group để chọn subnet và IP cho database.
# Phase 3B — Tạo DB Subnet Group
Nếu bạn đã tạo ở Phase 2 thì bỏ qua. Nếu chưa, làm bước này.
## Tạo:
```
Name: auction-db-subnet-group
VPC: auction-vpc
Subnets:
- auction-private-subnet-1
- auction-private-subnet-2
```
Checklist:
```
[ ] Vào RDS Console
[ ] Chọn Subnet groups
[ ] Create DB subnet group
[ ] Name: auction-db-subnet-group
[ ] Chọn VPC: auction-vpc
[ ] Chọn 2 private subnets khác AZ
[ ] Create
```
Lý do cần 2 private subnet: RDS trong VPC thường cần DB subnet group gồm nhiều subnet để hỗ trợ placement/high availability tốt hơn.
# Phase 3C — Tạo Security Group cho RDS
Nếu đã tạo ở Phase 2 thì kiểm tra lại rule.
## Tạo:
```
Name: auction-rds-sg
```
Inbound rule:
```
Type: MySQL/Aurora
Port: 3306
Source: auction-backend-sg
```
Không dùng:
```
Source: 0.0.0.0/0
```
Vì như vậy database bị mở ra internet.  
Security group dùng để kiểm soát network access vào DB instance trong VPC.  
Checklist:
```
[ ] Tạo security group auction-rds-sg
[ ] Inbound MySQL 3306 từ auction-backend-sg
[ ] Không cho 3306 từ 0.0.0.0/0
[ ] Outbound giữ default nếu đang học
```
# Phase 3D — Tạo RDS MySQL
Vào RDS Console → Create database.
## Chọn cấu hình gợi ý cho project học
```
Engine: MySQL
Template: Free tier nếu account còn eligible, hoặc Dev/Test
DB instance identifier: auction-mysql
Master username: admin hoặc auction_admin
Password: tạo password mạnh
DB instance class: db.t3.micro hoặc loại nhỏ nhất phù hợp
Storage: 20GB
Storage autoscaling: có thể bật giới hạn thấp
VPC: auction-vpc
DB subnet group: auction-db-subnet-group
Public access: No
VPC security group: auction-rds-sg
Database authentication: Password authentication
Initial database name: auction_db
Backup retention: 1-7 days nếu học
Deletion protection: bật nếu sợ xóa nhầm, tắt nếu muốn dễ cleanup
```
Amazon RDS hỗ trợ tạo DB instance và quản lý phần hạ tầng database thay bạn, thay vì bạn tự cài MySQL trên EC2.  
Checklist:
```
[ ] Create database
[ ] Chọn Standard create
[ ] Engine: MySQL
[ ] Template: Free tier / Dev/Test
[ ] DB identifier: auction-mysql
[ ] Master username: auction_admin
[ ] Password: lưu cẩn thận
[ ] Initial database name: auction_db
[ ] VPC: auction-vpc
[ ] DB subnet group: auction-db-subnet-group
[ ] Public access: No
[ ] Security group: auction-rds-sg
[ ] Create database
```
# Phase 3E — Lưu thông tin database cần dùng
Sau khi RDS tạo xong, bạn cần lấy:
```
RDS endpoint
Port
Database name
Username
Password
```
Ví dụ:
```
Endpoint: auction-mysql.xxxxxx.ap-southeast-1.rds.amazonaws.com
Port: 3306
Database: auction_db
Username: auction_admin
Password: ********
```
Thông tin này sẽ đưa vào Spring Boot bằng environment variables, không commit lên GitHub.
# Phase 3F — Test EC2 connect được RDS
Bạn không nên test RDS từ laptop nếu RDS là private. Cách đúng là:
```
SSH vào EC2 backend
   ↓
Dùng mysql-client connect tới RDS
```
Trên EC2:
```
sudo apt update
sudo apt install mysql-client -y
```
Connect:
```
mysql -h your-rds-endpoint -P 3306 -u auction_admin -p
```
Sau khi nhập password, kiểm tra database:
```
SHOW DATABASES;
USE auction_db;
SHOW TABLES;
```
Nếu connect lỗi, kiểm tra 4 thứ:
```
[ ] EC2 có nằm trong auction-backend-sg không?
[ ] RDS security group có allow 3306 từ auction-backend-sg không?
[ ] RDS public access đang No đúng chưa?
[ ] EC2 và RDS có cùng VPC không?
```
# Phase 3G — Tạo user database riêng cho app
Không nên để Spring Boot dùng master user lâu dài.  
Sau khi connect vào MySQL bằng master user, tạo user riêng:
```
CREATE USER 'auction_app'@'%' IDENTIFIED BY 'your_strong_password';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
ON auction_db.*
TO 'auction_app'@'%';
FLUSH PRIVILEGES;
```
Về sau production chặt hơn thì giảm quyền `CREATE`, `ALTER` và dùng migration tool như Flyway/Liquibase.  
Checklist:
```
[ ] Tạo user auction_app
[ ] Grant quyền trên auction_db
[ ] Không dùng master user cho app lâu dài
[ ] Lưu username/password app user
```
# Phase 3H — Cấu hình Spring Boot connect RDS
Trong `application-prod.properties`:
```
server.port=8080
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
```
Spring Boot hỗ trợ cấu hình SQL database qua các datasource/JDBC/JPA properties trong `application.properties` hoặc `application.yaml`.  
Trên EC2, trong file `.env`:
```
SPRING_PROFILES_ACTIVE=prod
DB_URL=jdbc:mysql://auction-mysql.xxxxxx.ap-southeast-1.rds.amazonaws.com:3306/auction_db
DB_USERNAME=auction_app
DB_PASSWORD=your_strong_password
```
Sau đó restart app:
```
sudo systemctl restart auction-backend
```
Xem logs:
```
journalctl -u auction-backend -f
```
# Phase 3I — Chọn cách tạo tables
Bạn có 2 cách.
## Cách 1: Dùng Hibernate `ddl-auto=update`
Phù hợp lúc học hoặc demo.
```
spring.jpa.hibernate.ddl-auto=update
```
Ưu điểm:
```
Nhanh
Dễ test
Entity thay đổi thì DB tự update tương đối
```
Nhược điểm:
```
Nhanh
Dễ test
Entity thay đổi thì DB tự update tương đối
```
## Cách 2: Dùng Flyway hoặc Liquibase
Phù hợp hơn khi project lớn.  
Ví dụ migration:
```
src/main/resources/db/migration/
 └── V1__create_initial_tables.sql
```
Sau này mình khuyên dùng:
```
spring.jpa.hibernate.ddl-auto=validate
```
Và để Flyway quản lý schema.  
Giai đoạn này bạn có thể làm:
```
Học/demo: ddl-auto=update
Bản portfolio tốt hơn: Flyway
```
# Phase 3K — Test API sau khi connect RDS
Sau khi Spring Boot connect được RDS, test theo thứ tự:
```
[ ] GET /api/health
[ ] POST /api/auth/register
[ ] POST /api/auth/login
[ ] GET /api/users/me
[ ] POST /api/auction-items
[ ] GET /api/auction-items
[ ] POST /api/auction-items/{id}/bids
```
Kiểm tra trong MySQL:
```
USE auction_db;
SELECT * FROM users;
SELECT * FROM wallets;
SELECT * FROM auction_items;
SELECT * FROM bids;
```
Nếu register thành công, bạn nên thấy:
```
1 record trong users
1 record trong wallets
```
Nếu create auction thành công:
```
1 record trong auction_items
```
Nếu bid thành công:
```
1 record trong bids
auction_items.current_price được update
wallets.locked_balance có thể thay đổi nếu bạn có logic ví
```
# Phase 3L — Backup cho RDS
Giai đoạn học thì backup đơn giản:
```
Backup retention: 1-7 days
```
Với app Auction, database chứa dữ liệu quan trọng:
```
users
wallets
bids
transactions
winners
```
Nên sau này cần:
```
[ ] Automated backup
[ ] Manual snapshot trước khi update lớn
[ ] Không xóa RDS khi chưa snapshot
[ ] Bật deletion protection nếu là môi trường quan trọng
```
# Phase 3M — Secrets Manager sau này
Ban đầu bạn có thể dùng `.env` trên EC2.  
Sau này nên chuyển sang AWS Secrets Manager để lưu:
```
DB username
DB password
JWT secret
S3 config nếu cần
```
AWS Secrets Manager được khuyến nghị để lưu credentials và thông tin nhạy cảm; RDS cũng có tích hợp với Secrets Manager để quản lý master password.  
Lộ trình hợp lý:
```
Giai đoạn 1:
.env trên EC2
Giai đoạn 2:
Secrets Manager lưu DB_PASSWORD và JWT_SECRET
Giai đoạn 3:
Cho EC2 IAM Role quyền đọc secret
Spring Boot đọc secret lúc startup
```
# Checklist tổng Phase 3
```
Network prerequisite
[ ] Có auction-vpc
[ ] Có 2 private subnets
[ ] Có auction-db-subnet-group
[ ] Có auction-backend-sg
[ ] Có auction-rds-sg
Create RDS
[ ] Engine: MySQL
[ ] DB identifier: auction-mysql
[ ] Initial DB name: auction_db
[ ] Master username/password
[ ] VPC: auction-vpc
[ ] DB subnet group: auction-db-subnet-group
[ ] Public access: No
[ ] Security group: auction-rds-sg
[ ] Backup retention: 1-7 days
Database user
[ ] Connect RDS từ EC2
[ ] Tạo user auction_app
[ ] Grant quyền cho auction_app trên auction_db
[ ] Không dùng master user cho Spring Boot lâu dài
Spring Boot config
[ ] application-prod.properties
[ ] DB_URL dùng RDS endpoint
[ ] DB_USERNAME=auction_app
[ ] DB_PASSWORD từ env
[ ] ddl-auto=update lúc học
[ ] show-sql=false trên prod
Testing
[ ] Restart backend
[ ] Check journalctl logs
[ ] Test /api/health
[ ] Test register
[ ] Test login
[ ] Test create auction
[ ] Check tables trong MySQL
Security
[ ] RDS không public
[ ] 3306 chỉ allow từ backend SG
[ ] Không commit DB password
[ ] Sau này dùng Secrets Manager
Backup
[ ] Enable automated backup
[ ] Tạo snapshot trước khi update schema lớn
```
# Thứ tự làm thực tế cho bạn
Bạn cứ làm theo thứ tự này là ổn:
```
1. Kiểm tra private subnet và DB subnet group
2. Tạo RDS MySQL
3. Đặt database name là auction_db
4. Gắn security group auction-rds-sg
5. Đảm bảo public access = No
6. SSH vào EC2
7. Cài mysql-client
8. Test connect từ EC2 tới RDS
9. Tạo user auction_app
10. Cấu hình Spring Boot DB_URL/DB_USERNAME/DB_PASSWORD
11. Restart backend
12. Test register/login/create auction
13. Kiểm tra bảng trong RDS
14. Bật backup/snapshot
15. Sau này chuyển DB password sang Secrets Manager
```
# Kết quả cần đạt sau Phase 3
Sau Phase 3, bạn phải đạt được:
```
RDS MySQL chạy trong private subnet
Database auction_db đã tạo
Spring Boot backend connect được RDS
API register/login/create auction lưu dữ liệu vào RDS
RDS không public ra internet
Database password không nằm trong GitHub
```
Nói đơn giản: **Phase 3 là đưa database của Auction app ra khỏi máy local và đặt nó vào AWS RDS một cách an toàn.**