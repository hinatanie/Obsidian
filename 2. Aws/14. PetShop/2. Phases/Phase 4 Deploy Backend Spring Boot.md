**Phase 4: Deploy Backend Spring Boot**  
Mục tiêu cuối cùng:
```
User / React frontend
   ↓
<https://api.yourdomain.com>
   ↓
Nginx on EC2
   ↓
Spring Boot app port 8080
   ↓
RDS MySQL private subnet
```
# Phase 4A — Chuẩn bị backend Spring Boot trước khi deploy
Trước khi đưa lên EC2, backend của bạn cần sẵn sàng chạy production.
## Việc cần làm
```
[ ] Tạo file application-prod.properties hoặc application-prod.yml
[ ] Cấu hình database RDS
[ ] Cấu hình JWT secret bằng environment variable
[ ] Cấu hình CORS cho frontend domain
[ ] Tạo health check endpoint
[ ] Build backend thành file .jar
[ ] Test file .jar ở local trước
```
Ví dụ cấu trúc config:
```
src/main/resources/
 ├── application.properties
 ├── application-dev.properties
 └── application-prod.properties
```
Ví dụ `application-prod.properties`:
```
server.port=8080
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
jwt.secret=${JWT_SECRET}
jwt.expiration=${JWT_EXPIRATION}
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
```
Lưu ý: không hard-code password trong code.  
Không nên làm:
```
spring.datasource.password=123456
jwt.secret=mysecret
```
Nên làm:
```
spring.datasource.password=${DB_PASSWORD}
jwt.secret=${JWT_SECRET}
```
# Phase 4B — Tạo EC2 Ubuntu
Đây là server chạy backend Spring Boot.
## Việc cần làm trên AWS
```
[ ] Vào EC2 Console
[ ] Launch Instance
[ ] Name: auction-backend-ec2
[ ] AMI: Ubuntu Server 22.04 hoặc 24.04
[ ] Instance type: t2.micro hoặc t3.micro nếu học
[ ] Chọn key pair để SSH
[ ] Chọn VPC: auction-vpc
[ ] Chọn subnet: auction-public-subnet-1
[ ] Auto-assign public IP: Enable
[ ] Security Group: auction-backend-sg
[ ] IAM Role: auction-backend-ec2-role
```
Security group cho EC2 nên có:
```
HTTP  80    0.0.0.0/0
HTTPS 443   0.0.0.0/0
SSH   22    your-ip-only
```
Tạm thời lúc test có thể mở:
```
Custom TCP 8080 your-ip-only
```
Nhưng sau khi có Nginx thì nên đóng port 8080 public.
# Phase 4C — SSH vào EC2
Sau khi EC2 chạy, bạn SSH vào server.  
Ví dụ:
```
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```
Nếu bạn dùng Windows PowerShell:
```
ssh -i "C:\path\to\your-key.pem" ubuntu@your-ec2-public-ip
```
Sau khi vào EC2, update server:
```
sudo apt updatesudo apt upgrade -y
```
# Phase 4D — Cài Java trên EC2
Spring Boot cần Java để chạy file `.jar`.  
Nếu project dùng Java 17:
```
sudo apt install openjdk-17-jdk -y
```
Nếu project dùng Java 21:
```
sudo apt install openjdk-21-jdk -y
```
Kiểm tra:
```
java -version
```
Kết quả mong muốn:
```
openjdk version "17..."
```
hoặc:
```
openjdk version "21..."
```
# Phase 4E — Build Spring Boot thành file `.jar`
Ở máy local của bạn, vào folder backend:
```
cd backend
```
Nếu dùng Maven:
```
./mvnw clean package -DskipTests
```
Trên Windows:
```
mvnw clean package -DskipTests
```
Sau khi build xong, file `.jar` thường nằm ở:
```
target/your-app-name.jar
```
Ví dụ:
```
target/auction-backend-0.0.1-SNAPSHOT.jar
```
Test local trước:
```
java -jar target/auction-backend-0.0.1-SNAPSHOT.jar
```
Nếu chạy được local thì mới copy lên EC2.
# Phase 4F — Copy file `.jar` lên EC2
Trên máy local:
```
scp -i your-key.pem target/auction-backend-0.0.1-SNAPSHOT.jar ubuntu@your-ec2-public-ip:/home/ubuntu/
```
Sau đó SSH vào EC2 và tạo folder app:
```
sudo mkdir -p /opt/auction-backend
sudo mv /home/ubuntu/auction-backend-0.0.1-SNAPSHOT.jar /opt/auction-backend/app.jar
```
# Phase 4G — Tạo environment variables cho backend
Bạn cần truyền thông tin database/JWT vào app.  
Tạo file:
```
sudo nano /opt/auction-backend/.env
```
Nội dung ví dụ:
```
SPRING_PROFILES_ACTIVE=prod
DB_URL=jdbc:mysql://your-rds-endpoint:3306/auction_db
DB_USERNAME=auction_user
DB_PASSWORD=your_db_password
JWT_SECRET=your_long_jwt_secret
JWT_EXPIRATION=86400000
```
Lưu ý: file này không nên public.  
Set quyền:
```
sudo chmod 600 /opt/auction-backend/.env
```
# Phase 4H — Test chạy backend thủ công trên EC2
Chạy thử:
```
SPRING_PROFILES_ACTIVE=prod
DB_URL=jdbc:mysql://your-rds-endpoint:3306/auction_db
DB_USERNAME=auction_user
DB_PASSWORD=your_db_password
JWT_SECRET=your_long_jwt_secret
JWT_EXPIRATION=86400000
```
Nếu app chạy thành công, test API:
```
curl <http://localhost:8080/api/health>
```
Nếu có endpoint health check, kết quả có thể là:
```
OK
```
Hoặc:
```
{  "status": "UP"}
```
# Phase 4I — Tạo systemd service cho Spring Boot
Mục tiêu: app tự chạy khi EC2 restart.  
Tạo service file:
```
sudo nano /etc/systemd/system/auction-backend.service
```
Nội dung:
```
[Unit]
Description=Auction Backend Spring Boot Application
After=network.target
[Service]
User=ubuntu
WorkingDirectory=/opt/auction-backend
EnvironmentFile=/opt/auction-backend/.env
ExecStart=/usr/bin/java -jar /opt/auction-backend/app.jar
SuccessExitStatus=143
Restart=always
RestartSec=10
[Install]
WantedBy=multi-user.target
```
Reload systemd:
```
sudo systemctl daemon-reload
```
Start app:
```
sudo systemctl start auction-backend
```
Enable auto start:
```
sudo systemctl enable auction-backend
```
Check status:
```
sudo systemctl status auction-backend
```
Xem logs:
```
journalctl -u auction-backend -f
```
# Phase 4J — Cài Nginx làm reverse proxy
Không nên để user gọi trực tiếp:
```
<http://your-ec2-ip:8080>
```
Nên để user gọi:
```
<http://your-ec2-ip>
```
hoặc sau này:
```
<https://api.yourdomain.com>
```
Cài Nginx:
```
sudo apt install nginx -y
```
Tạo config:
```
sudo nano /etc/nginx/sites-available/auction-backend
```
Nội dung:
```
server {
    listen 80;
    server_name your-domain.com api.your-domain.com;
    location / {
        proxy_pass <http://localhost:8080>;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Enable config:
```
sudo ln -s /etc/nginx/sites-available/auction-backend /etc/nginx/sites-enabled/
```
Test Nginx config:
```
sudo nginx -t
```
Restart Nginx:
```
sudo systemctl restart nginx
```
Test:
```
curl <http://localhost/api/health>
```
Hoặc từ máy bạn:
```
<http://your-ec2-public-ip/api/health>
```
# Phase 4K — Cấu hình Security Group sau khi có Nginx
Sau khi Nginx chạy ổn, bạn nên chỉnh lại Security Group.  
Inbound nên là:
```
80    public
443   public
22    your-ip-only
```
Không nên public:
```
8080  0.0.0.0/0
```
Vì Spring Boot chỉ nên chạy nội bộ:
```
Nginx → localhost:8080 → Spring Boot
```
# Phase 4L — Kết nối Backend với RDS
Backend cần connect tới RDS MySQL private.  
Checklist:
```
[ ] RDS nằm trong private subnet
[ ] RDS security group cho phép 3306 từ auction-backend-sg
[ ] EC2 nằm trong auction-backend-sg
[ ] DB_URL dùng RDS endpoint
[ ] DB username/password đúng
[ ] Database auction_db đã được tạo
```
Test từ EC2:
```
sudo apt install mysql-client -y
```
Connect thử:
```
mysql -h your-rds-endpoint -u auction_user -p
```
Nếu connect được, backend cũng có khả năng connect được.
# Phase 4M — Cấu hình CORS cho React
Nếu React frontend sau này chạy ở:
```
<https://auction.yourdomain.com>
```
Backend phải cho phép domain đó.  
Ví dụ Spring Boot:
```
@Configuration
public class CorsConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins("<https://auction.yourdomain.com>")
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true);
            }
        };
    }
}
```
Giai đoạn test có thể thêm localhost:
```
.allowedOrigins(
    "<http://localhost:5173>",
    "<https://auction.yourdomain.com>"
)
```
# Phase 4N — Cài CloudWatch Agent
Mục tiêu: theo dõi EC2 và logs backend.  
Giai đoạn đầu bạn cần monitor:
```
CPU EC2
Memory EC2
Disk usage
Backend logs
Nginx logs
```
Việc cần làm:
```
[ ] Cài CloudWatch Agent
[ ] Gửi system logs lên CloudWatch
[ ] Gửi application logs nếu cần
[ ] Tạo alarm CPU cao
[ ] Tạo alarm disk gần đầy
```
Nếu chưa làm ngay cũng được, nhưng ít nhất bạn nên biết log hiện tại nằm ở:
```
journalctl -u auction-backend -f
```
Và Nginx log:
```
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```
# Phase 4O — Domain và HTTPS
Phần này có thể làm sau Route 53/CloudFront, nhưng backend nên chuẩn bị.  
Mục tiêu:
```
<https://api.yourdomain.com>
```
Bạn có 2 hướng:
## Hướng đơn giản
Dùng Nginx + Certbot trên EC2:
```
Route 53 DNS → EC2 public IP
Nginx → Spring Boot
Certbot → SSL
```
## Hướng AWS chuẩn hơn
Dùng Load Balancer + ACM:
```
Route 53
   ↓
Application Load Balancer + ACM SSL
   ↓
EC2 Spring Boot
```
Giai đoạn đầu bạn có thể dùng Nginx + Certbot để dễ học.
# Checklist đầy đủ Phase 4 — EC2 Deploy
```
Backend preparation
[ ] Tạo application-prod.properties
[ ] Dùng environment variables cho DB/JWT
[ ] Cấu hình CORS
[ ] Tạo /api/health endpoint
[ ] Build .jar
[ ] Test .jar local
EC2 setup
[ ] Tạo EC2 Ubuntu
[ ] Chọn auction-vpc
[ ] Chọn public subnet
[ ] Gắn auction-backend-sg
[ ] Gắn auction-backend-ec2-role
[ ] SSH vào EC2
[ ] Update packages
[ ] Cài Java 17 hoặc 21
Deploy app
[ ] Copy .jar lên EC2
[ ] Đặt app ở /opt/auction-backend/app.jar
[ ] Tạo file .env
[ ] Test java -jar app.jar
[ ] Test curl localhost:8080/api/health
Systemd
[ ] Tạo auction-backend.service
[ ] systemctl daemon-reload
[ ] systemctl start auction-backend
[ ] systemctl enable auction-backend
[ ] Check journalctl logs
Nginx
[ ] Cài Nginx
[ ] Tạo reverse proxy config
[ ] proxy_pass <http://localhost:8080>
[ ] nginx -t
[ ] Restart Nginx
[ ] Test <http://ec2-public-ip/api/health>
Security
[ ] Port 80 public
[ ] Port 443 public
[ ] Port 22 only your IP
[ ] Port 8080 không public
[ ] RDS 3306 chỉ allow từ backend security group
Database
[ ] Test EC2 connect RDS
[ ] Backend connect RDS
[ ] Test register/login/create auction
Monitoring
[ ] Xem log bằng journalctl
[ ] Xem Nginx log
[ ] Sau này cài CloudWatch Agent
```
# Thứ tự làm thực tế cho bạn
Bạn nên làm theo thứ tự này:
```
1. Chuẩn bị application-prod.properties
2. Build Spring Boot .jar ở local
3. Tạo EC2 Ubuntu
4. SSH vào EC2
5. Cài Java
6. Copy .jar lên EC2
7. Tạo .env
8. Chạy java -jar để test
9. Tạo systemd service
10. Cài Nginx
11. Test API qua port 80
12. Kết nối backend với RDS
13. Đóng port 8080 public
14. Cấu hình domain/HTTPS sau
15. Thêm CloudWatch logs sau
```
# Với Auction app, API nào nên test sau khi deploy?
Bạn nên test theo thứ tự:
```
[ ] GET /api/health
[ ] POST /api/auth/register
[ ] POST /api/auth/login
[ ] GET /api/users/me
[ ] POST /api/auction-items
[ ] GET /api/auction-items
[ ] POST /api/auction-items/{id}/bids
[ ] GET /api/auction-items/{id}/bids
```
Nếu app có upload ảnh:
```
[ ] POST /api/auction-items/{id}/images
[ ] Kiểm tra ảnh có vào S3 không
[ ] Kiểm tra image_url có lưu vào RDS không
```
# Option 2: Lightsail — bạn làm khi nào?
Lightsail phù hợp nếu bạn muốn:
```
Deploy nhanh
Ít cấu hình VPC
Ít học networking sâu
Server đơn giản
```
Nhưng với mục tiêu học AWS cho project, mình khuyên:
```
Không dùng Lightsail ở bản chính.
Có thể dùng thử sau để so sánh với EC2.
```
Checklist nếu làm Lightsail:
```
[ ] Tạo Lightsail instance Ubuntu
[ ] Cài Java
[ ] Copy .jar
[ ] Cài Nginx
[ ] Tạo database riêng hoặc dùng RDS
[ ] Gắn static IP
[ ] Gắn domain
```
# Option 3: ECS + Docker — làm sau khi EC2 ổn
ECS phù hợp khi bạn đã hiểu:
```
Docker
Image
Container
ECR
Task Definition
Service
Load Balancer
Environment variables
Security Group
```
Với Auction app, ECS architecture sẽ là:
```
Docker
Image
Container
ECR
Task Definition
Service
Load Balancer
Environment variables
Security Group
```
Checklist ECS sau này:
```
React S3/CloudFront
   ↓
Application Load Balancer
   ↓
ECS Fargate Service
   ↓
RDS MySQL
   ↓
S3 Images
```
Nhưng chưa nên làm ECS ngay nếu bạn chưa deploy EC2 thành công.
# Kết luận
Với project hiện tại của bạn, Phase 4 nên làm theo hướng này:
```
Ưu tiên: EC2 deploy thủ công trước
Sau đó: systemd + Nginx
Sau đó: RDS + S3 integration
Sau đó: CloudWatch
Sau cùng: Docker + ECS + CI/CD
```
Kết quả cần đạt ở Phase 4:
```
Spring Boot backend chạy trên EC2
App tự restart khi server reboot
API gọi được qua port 80 hoặc domain
Backend connect được RDS MySQL
Backend có thể upload ảnh lên S3
Không public port 8080
Không hard-code secret trong source code
```
Bạn chỉ cần nhớ câu này: **EC2 là nơi chạy backend, Nginx là cửa trước, Spring Boot là app bên trong, RDS là database riêng phía sau.**