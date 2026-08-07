# 1. Tạo VPC riêng cho Auction app
tạo một VPC riêng
```
Name: auction-vpcCIDR: 10.0.0.0/16
```
VPC này sẽ chứa toàn bộ hệ thống:
```
auction-vpc
 ├── public subnet
 │    └── EC2 backend
 └── private subnet
      └── RDS MySQL
```
# 2. Tạo public subnet cho EC2 backend
Public subnet là nơi đặt server có thể nhận request từ internet.  
dùng nó cho:
```
Spring Boot backend chạy trên EC2
Nginx reverse proxy
Public API endpoint
```
Tạo subnet:
```
Name: auction-public-subnet-1
CIDR: 10.0.1.0/24
AZ: ap-southeast-1a hoặc region bạn chọn
```
Public subnet cần route ra Internet Gateway. Một subnet được xem là public khi route table của nó có route gửi internet traffic đến Internet Gateway.  
Việc cần làm:
```
[ ] Tạo public subnet
[ ] CIDR: 10.0.1.0/24
[ ] Enable auto-assign public IPv4 nếu muốn EC2 có public IP
[ ] Sau này tạo EC2 backend trong subnet này
```
# 3. Tạo private subnet cho RDS MySQL
Private subnet là nơi đặt database. Database **không nên public ra internet**.  
dùng nó cho:
```
RDS MySQL
```
Tạo ít nhất 2 private subnets nếu dùng RDS đúng chuẩn, vì RDS cần DB subnet group với subnets ở nhiều Availability Zones. AWS RDS yêu cầu VPC có ít nhất 2 subnets ở 2 Availability Zones khác nhau cho DB instance trong VPC.  
Tạo:
```
Name: auction-private-subnet-1
CIDR: 10.0.2.0/24
AZ: ap-southeast-1a
Name: auction-private-subnet-2
CIDR: 10.0.3.0/24
AZ: ap-southeast-1b
```
Việc cần làm:
```
[ ] Tạo private subnet 1
[ ] Tạo private subnet 2
[ ] Không bật auto-assign public IPv4
[ ] Sau này tạo DB Subnet Group cho RDS từ 2 subnet này
```
# 4. Tạo Internet Gateway
Internet Gateway cho phép tài nguyên trong public subnet đi ra/vào internet.
```
User gọi API backend
EC2 tải package bằng apt/yum
EC2 kết nối internet
```
AWS Internet Gateway setup cơ bản gồm tạo Internet Gateway, attach vào VPC, rồi thêm route vào route table.  
Việc cần làm:
```
[ ] Create Internet Gateway
[ ] Name: auction-igw
[ ] Attach vào auction-vpc
```
# 5. Tạo Route Table
Route table quyết định subnet đi đường nào.  
AWS route table dùng để chỉ định VPC có thể giao tiếp với network nào, ví dụ route ra Internet Gateway, NAT Gateway hoặc VPC khác.
## Public route table
Dùng cho public subnet.
```
Name: auction-public-rt
```
Routes:
```
10.0.0.0/16  → local
0.0.0.0/0   → auction-igw
```
Associate với:
```
auction-public-subnet-1
```
Việc cần làm:
```
[ ] Tạo public route table
[ ] Add route 0.0.0.0/0 → Internet Gateway
[ ] Associate với public subnet
```
## Private route table
Dùng cho private subnet chứa RDS.
```
Name: auction-private-rt
```
Routes ban đầu:
```
10.0.0.0/16 → local
```
Không thêm route ra Internet Gateway.  
Associate với:
```
auction-private-subnet-1auction-private-subnet-2
```
Việc cần làm:
```
[ ] Tạo private route table
[ ] Không add route 0.0.0.0/0 ra Internet Gateway
[ ] Associate với 2 private subnets
```
# 6. Tạo Security Group cho Backend EC2
Security Group giống firewall cho AWS resource; chỉ traffic được allow trong rule mới vào được resource.  
Tạo:
```
Name: auction-backend-sg
```
Inbound rules giai đoạn đầu:
```
HTTP  80    0.0.0.0/0
HTTPS 443   0.0.0.0/0
SSH   22    your-ip-only
```
Nếu bạn chưa cài Nginx và cần test nhanh Spring Boot:
```
Custom TCP 8080 your-ip-only
```
Không nên để:
```
8080 0.0.0.0/0
```
Vì như vậy ai cũng gọi trực tiếp vào Spring Boot.  
Việc cần làm:
```
[ ] Tạo security group cho EC2
[ ] Mở port 80 public
[ ] Mở port 443 public nếu có HTTPS
[ ] Mở port 22 chỉ cho IP máy bạn
[ ] Không public port 8080 lâu dài
```
# 7. Tạo Security Group cho RDS MySQL
Tạo:
```
Name: auction-rds-sg
```
Inbound rule:
```
MySQL/Aurora 3306 → source: auction-backend-sg
```
Nghĩa là:
```
Chỉ EC2 backend được connect vào RDS
Máy bên ngoài internet không connect được RDS
```
Không nên để:
```
3306 0.0.0.0/0
```
Việc cần làm:
```
[ ] Tạo security group cho RDS
[ ] Inbound MySQL 3306
[ ] Source là auction-backend-sg
[ ] Không public RDS
```
# 8. Tạo DB Subnet Group cho RDS
RDS cần biết nó được phép đặt database trong subnet nào.  
Tạo:
```
Name: auction-db-subnet-group
Subnets:
- auction-private-subnet-1
- auction-private-subnet-2
```
Việc cần làm:
```
[ ] Vào RDS Console
[ ] Tạo DB Subnet Group
[ ] Chọn auction-vpc
[ ] Chọn 2 private subnets
[ ] Sau này tạo RDS MySQL bằng subnet group này
```
# 9. NAT Gateway — có cần không?
Giai đoạn đầu: **chưa cần NAT Gateway**.  
NAT Gateway dùng khi resource trong private subnet cần đi ra internet, nhưng không nhận inbound từ internet. AWS mô tả NAT Gateway dùng trong public subnet để private subnet có outbound internet traffic.  
Với kiến trúc ban đầu:
```
EC2 backend ở public subnet
RDS ở private subnet
```
RDS không cần tự đi internet, nên chưa cần NAT Gateway.  
Chưa dùng NAT để tiết kiệm tiền.  
Bạn chỉ cần NAT Gateway nếu sau này:
```
Backend chuyển vào private subnet
ECS task nằm private subnet cần pull image/package
Private EC2 cần update package
Private service cần gọi API bên ngoài
```
Checklist:
```
[ ] Phase 2 ban đầu: không tạo NAT Gateway
[ ] Chỉ tạo NAT khi thật sự cần
```
# 10. S3 VPC Endpoint — có cần không?
Giai đoạn đầu: **chưa bắt buộc**.  
S3 VPC Endpoint cho phép resource trong VPC truy cập S3 mà không cần Internet Gateway hoặc NAT Gateway; S3 gateway endpoint không tính thêm phí.  
Với app Auction:
```
Spring Boot backend upload ảnh sản phẩm lên S3
```
Nếu EC2 backend nằm public subnet, nó có thể gọi S3 qua internet được.  
Nhưng sau này nên thêm S3 Gateway Endpoint để:
```
EC2/ECS gọi S3 private hơn
Không cần đi qua public internet
Giảm phụ thuộc NAT Gateway
```
Checklist phase đầu:
```
[ ] Chưa bắt buộc tạo S3 Endpoint
[ ] Sau khi upload ảnh S3 chạy ổn, tạo thêm Gateway Endpoint cho S3
[ ] Associate endpoint với route table cần dùng
```
# 11. VPC Flow Logs — dùng để làm gì?
VPC Flow Logs giúp capture thông tin IP traffic đi vào/ra network interfaces trong VPC; log có thể publish đến CloudWatch Logs, S3 hoặc Data Firehose.  
Với app Auction, dùng để debug:
```
Tại sao EC2 không connect được RDS?
Tại sao API timeout?
Có traffic lạ vào backend không?
Security Group có block nhầm không?
```
Giai đoạn đầu có thể chưa bật để tránh phức tạp. Nhưng khi deploy thật hoặc viết report thì nên bật.  
Việc cần làm:
```
[ ] Sau khi EC2 + RDS chạy, bật VPC Flow Logs
[ ] Destination: CloudWatch Logs hoặc S3
[ ] Dùng để kiểm tra network traffic
```
# Kiến trúc bạn nên làm ở Phase 2
```
auction-vpc 10.0.0.0/16
Public subnet:
10.0.1.0/24
- EC2 Spring Boot
- Nginx
- Public IP
Private subnet 1:
10.0.2.0/24
- RDS MySQL
Private subnet 2:
10.0.3.0/24
- RDS standby/required subnet group
Internet Gateway:
auction-igw
Route tables:
auction-public-rt
- 0.0.0.0/0 → Internet Gateway
auction-private-rt
- local only
Security Groups:
auction-backend-sg
- 80 public
- 443 public
- 22 only your IP
auction-rds-sg
- 3306 only from auction-backend-sg
```
# Checklist tổng Phase 2
```
[ ] Create VPC: auction-vpc, CIDR 10.0.0.0/16
[ ] Create public subnet:
    auction-public-subnet-1, 10.0.1.0/24
[ ] Create private subnet 1:
    auction-private-subnet-1, 10.0.2.0/24
[ ] Create private subnet 2:
    auction-private-subnet-2, 10.0.3.0/24
[ ] Create Internet Gateway:
    auction-igw
[ ] Attach Internet Gateway to auction-vpc
[ ] Create public route table:
    auction-public-rt
[ ] Add route:
    0.0.0.0/0 → auction-igw
[ ] Associate public route table with public subnet
[ ] Create private route table:
    auction-private-rt
[ ] Associate private route table with private subnets
[ ] Create EC2 security group:
    auction-backend-sg
[ ] Add inbound rules:
    HTTP 80 from 0.0.0.0/0
    HTTPS 443 from 0.0.0.0/0
    SSH 22 from your IP only
[ ] Create RDS security group:
    auction-rds-sg
[ ] Add inbound rule:
    MySQL 3306 from auction-backend-sg only
[ ] Create DB Subnet Group:
    auction-db-subnet-group
    includes private subnet 1 and private subnet 2
[ ] Do not create NAT Gateway yet
[ ] Do not public RDS
[ ] Later: enable VPC Flow Logs
[ ] Later: create S3 Gateway Endpoint
```
# Sau Phase 2 xong thì app dùng được gì?
Sau khi làm xong phase này, bạn đã chuẩn bị network để qua phase sau làm:
```
EC2 chạy Spring Boot backend
RDS MySQL nằm private an toàn
Backend connect được database
User gọi API qua port 80/443
RDS không bị public ra internet
Sẵn sàng deploy React frontend lên S3/CloudFront
```
Nói đơn giản: **Phase 2 là dựng “mạng nhà” cho Auction app**. EC2 là phòng tiếp khách có cửa ra internet, còn RDS là phòng riêng bên trong, chỉ backend mới được vào.