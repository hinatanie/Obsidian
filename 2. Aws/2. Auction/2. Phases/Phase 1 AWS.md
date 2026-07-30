# 1. Tạo AWS Account — app của bạn cần gì?
Mục tiêu: tạo môi trường AWS để sau này deploy:
```
React frontend  → S3 / CloudFront
Spring Boot     → EC2
MySQL           → RDS
Image upload    → S3
Logs            → CloudWatch
```
### Bước 1: Tạo AWS account
Sau khi tạo xong account, bạn sẽ có **root user**.  
Không nên dùng root user để làm việc hằng ngày. AWS cũng khuyến nghị bảo vệ root user, bật MFA, và không tạo access key cho root user.
### Bước 2: Bật MFA cho root account
MFA là lớp xác thực thứ hai, ví dụ:
```
Password + mã từ app Google Authenticator/Authy
```
Bạn nên bật MFA ngay sau khi tạo account.  
Vì nếu ai đó lấy được password root account, họ có thể tạo EC2/RDS rất tốn tiền.
### Bước 3: Không dùng root để deploy app
Không dùng root để:
```
Deploy backend
Tạo EC2 hằng ngày
Tạo S3 bucket hằng ngày
Chạy AWS CLI
Tạo access key
```
Root chỉ dùng cho việc rất quan trọng như:
```
Billing
Account setting
Một số security setting đặc biệt
```
# 2. Quản lý chi phí — app của bạn cần gì?
Mục tiêu: tránh trường hợp học AWS xong quên tắt EC2/RDS rồi bị tính phí.  
Auction app của bạn sau này có thể dùng:
```
EC2
RDS
S3
CloudFront
Route 53
CloudWatch
NAT Gateway nếu có
```
Trong đó dễ phát sinh tiền nhất:
```
RDS
EC2
NAT Gateway
Load Balancer
EBS Volume
```
## Bạn cần làm cụ thể
### Bước 1: Tạo AWS Budget
Tạo budget monthly khoảng:
```
$5 hoặc $10 nếu chỉ học
```
AWS Budgets cho phép bạn tạo budget để theo dõi cost/usage và gửi cảnh báo theo ngưỡng bạn đặt.
### Bước 2: Tạo cảnh báo chi phí
Nên tạo 3 mức cảnh báo:
```
50%  → cảnh báo nhẹ
80%  → chuẩn bị kiểm tra tài nguyên
100% → phải kiểm tra ngay
```
Ví dụ nếu budget là `$10`:
```
$5  → gửi email
$8  → gửi email
$10 → gửi email
```
### Bước 3: Sau mỗi lần deploy, kiểm tra tài nguyên đang chạy
```
EC2 có đang chạy không?
RDS có đang chạy không?
Load Balancer có tồn tại không?
NAT Gateway có tồn tại không?
EBS volume có bị bỏ quên không?
Elastic IP có đang unused không?
```
Với app Auction giai đoạn đầu, để tiết kiệm, bạn nên:
```
Chạy EC2 khi cần test
Tắt EC2 khi không dùng
Dùng RDS nhỏ nhất có thể
Không dùng NAT Gateway nếu chưa cần
Chưa dùng Load Balancer lúc đầu
```
# 3. IAM cơ bản — app của bạn cần gì?
IAM dùng để quản lý **ai được phép làm gì trong AWS**. AWS mô tả IAM là dịch vụ giúp kiểm soát quyền truy cập vào AWS resources: ai được xác thực và ai được phép dùng tài nguyên nào.
# Với Auction app, bạn cần 3 loại quyền
## Loại 1: IAM user cho bạn
Dùng để bạn đăng nhập AWS Console và thao tác.  
Ví dụ:
```
auction-admin-user
```
User này dùng để:
```
Tạo EC2
Tạo RDS
Tạo S3 bucket
Cấu hình CloudFront
Cấu hình Route 53
Xem billing
```
## Loại 2: IAM role cho EC2 backend
Backend Spring Boot của bạn sẽ chạy trên EC2. Backend cần upload ảnh sản phẩm lên S3.  
Sai lầm thường gặp là để access key trong code:
```
aws.accessKey=...
aws.secretKey=...
```
Không nên làm vậy.  
Cách đúng hơn là:
```
EC2 được gắn IAM Role
Spring Boot chạy trong EC2
Spring Boot tự dùng quyền của EC2 Role để upload S3
```
AWS nói IAM role cho EC2 giúp application trên instance gọi AWS API mà không cần bạn tự quản lý credentials trong app.
## Loại 3: Policy cho quyền upload ảnh lên S3
Bạn tạo một policy chỉ cho phép backend thao tác với bucket ảnh của Auction app.  
Ví dụ bucket:
```
auction-app-images
```
Backend chỉ cần các quyền kiểu:
```
s3:PutObject    → upload ảnh
s3:GetObject    → đọc ảnh nếu cần
s3:DeleteObject → xóa ảnh nếu user xóa auction item
```
Không nên cho backend toàn quyền AWS.
# Việc cụ thể bạn nên làm cho app Auction
## A. Tạo IAM user cho bạn
Tên gợi ý:
```
auction-dev-admin
```
Dùng để:
```
Đăng nhập AWS ConsoleTạo EC2Tạo RDSTạo S3Tạo Budget
```
Không dùng root nữa.
## B. Tạo IAM role cho EC2 backend
Tên gợi ý:
```
auction-backend-ec2-role
```
Role này sẽ gắn vào EC2 chạy Spring Boot.  
Role này cần quyền:
```
Đọc/ghi S3 bucket chứa ảnh auctionGửi logs lên CloudWatch nếu bạn cấu hình logĐọc secret từ Secrets Manager nếu sau này bạn dùng
```
Ban đầu chỉ cần S3 là đủ.
## C. Tạo S3 bucket cho ảnh sản phẩm
Tên gợi ý:
```
auction-app-product-images
```
Dùng cho:
```
Ảnh sản phẩm đấu giáẢnh đại diện userẢnh banner auction nếu có
```
Backend Spring Boot sẽ upload ảnh lên bucket này.
## D. Không hard-code secret trong Spring Boot
Không nên để những thứ này trong GitHub:
```
spring.datasource.password=...jwt.secret=...aws.accessKey=...aws.secretKey=...
```
Giai đoạn đầu, bạn có thể dùng environment variable:
```
spring.datasource.password=${DB_PASSWORD}jwt.secret=${JWT_SECRET}
```
Sau này nâng cấp sang:
```
AWS Secrets Manager
```
# Mapping trực tiếp với Auction app
Bạn có thể hiểu như này:
```
AWS Account
→ nơi chứa toàn bộ hệ thống Auction app
Budget
→ chặn việc học AWS bị tốn tiền ngoài ý muốn
IAM User
→ tài khoản để bạn thao tác trên AWS
IAM Role for EC2
→ quyền cho backend Spring Boot chạy trên EC2
IAM Policy
→ quy định backend được làm gì, ví dụ upload ảnh lên S3
S3
→ nơi lưu ảnh sản phẩm đấu giá
EC2
→ nơi chạy backend Spring Boot
RDS
→ nơi lưu users, auctions, bids, wallets, transactions
```
# Checklist nên làm ngay
```
[ ] Tạo AWS account
[ ] Bật MFA cho root account
[ ] Không tạo access key cho root account
[ ] Tạo Budget $5 hoặc $10
[ ] Tạo cảnh báo 50%, 80%, 100%
[ ] Tạo IAM user: auction-dev-admin
[ ] Dùng IAM user thay root để làm việc
[ ] Tạo S3 bucket: auction-app-product-images
[ ] Tạo IAM role: auction-backend-ec2-role
[ ] Gắn policy cho role để upload/read/delete ảnh trong S3 bucket
[ ] Sau này khi tạo EC2, attach role này vào EC2
[ ] Spring Boot không chứa AWS access key
```
# Kết quả sau phần này là gì?
Sau khi làm xong 3 phần này, bạn **chưa cần deploy app ngay**, nhưng bạn đã có nền tảng đúng:
```
AWS account an toàn
Có giới hạn chi phí
Có IAM user để làm việc
Có IAM role cho backend
Có hướng bảo mật cho upload ảnh S3
Không dùng root để deploy
Không hard-code AWS key trong Spring Boot
```
Nói ngắn gọn: phần này là để chuẩn bị **môi trường AWS sạch, an toàn, ít tốn tiền** trước khi đưa Auction app lên EC2/RDS/S3.