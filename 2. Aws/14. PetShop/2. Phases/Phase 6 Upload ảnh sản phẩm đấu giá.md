**Phase 6: Upload ảnh sản phẩm đấu giá** là phần nối **React + Spring Boot + S3 + RDS** lại với nhau.  
Mục tiêu cuối cùng:
```
User chọn ảnh trên React
   ↓
React gửi ảnh lên Spring Boot
   ↓
Spring Boot upload ảnh lên S3
   ↓
Spring Boot lưu image_key / image_url vào RDS
   ↓
Frontend hiển thị ảnh sản phẩm
```
# 1. Quyết định cách upload ảnh
có 2 cách chính.
## Cách 1 — Upload qua backend Spring Boot
Flow:
```
React
  ↓ multipart/form-data
Spring Boot
  ↓ PutObject
S3
  ↓
RDS lưu image_url
```
Đây là cách dễ hiểu nhất cho project của bạn.  
Ưu điểm:
```
Dễ kiểm tra quyền user
Dễ validate file
Dễ lưu database cùng lúc
Dễ học Spring Boot + AWS SDK
```
Nhược điểm:
```
File đi qua backend nên backend chịu tải nhiều hơn
Không tối ưu nếu file lớn hoặc user rất đông
```
Giai đoạn hiện tại, bạn nên chọn **cách này trước**.
## Cách 2 — Upload bằng presigned URL
Flow:
```
React hỏi backend xin upload URL
   ↓
Backend tạo presigned URL
   ↓
React upload trực tiếp lên S3
   ↓
React gọi backend lưu metadata vào DB
```
AWS presigned URL cho phép upload hoặc download object S3 trong thời gian giới hạn mà client không cần AWS credentials.  
Cách này chuyên nghiệp hơn, nhưng nên làm sau khi bạn đã làm xong cách 1.
# 2. Tạo S3 bucket cho ảnh auction
cần một bucket riêng để lưu ảnh.  
Tên gợi ý:
```
auction-product-images
```
Checklist:
```
[ ] Vào S3 Console
[ ] Create bucket
[ ] Bucket name: auction-product-images
[ ] Region: cùng region với EC2/RDS nếu được
[ ] Block Public Access: bật
[ ] Bucket versioning: optional
[ ] Default encryption: bật SSE-S3 hoặc SSE-KMS
[ ] Create bucket
```
AWS khuyến nghị dùng **S3 Block Public Access** để giới hạn public access ở cấp bucket/account.  
Giai đoạn đầu bạn nên để:
```
S3 bucket private
Backend upload ảnh
Frontend xem ảnh qua CloudFront hoặc presigned URL
```
Không nên public bừa bucket ảnh.
# 3. Thiết kế folder/key trong S3
Trong S3 không có folder thật như file system, nhưng bạn có thể đặt object key theo dạng path.  
Gợi ý:
```
auction-items/{auctionItemId}/{uuid}.jpg
users/{userId}/avatar/{uuid}.jpg
payments/{paymentId}/proof/{uuid}.jpg
```
Ví dụ:
```
auction-items/123/550e8400-e29b-41d4-a716-446655440000.jpg
```
Lợi ích:
```
Dễ tìm ảnh theo auction item
Tránh trùng tên file
Dễ xóa toàn bộ ảnh của một item nếu cần
```
Checklist:
```
[ ] Không dùng tên file gốc làm key chính
[ ] Dùng UUID để tránh trùng
[ ] Có prefix rõ ràng: auction-items/, users/, payments/
[ ] Lưu object key vào database
```
# 4. Tạo IAM Role cho EC2 upload S3
Backend Spring Boot chạy trên EC2 thì không nên dùng access key trong code.  
Cách đúng:
```
EC2 gắn IAM Role
Spring Boot dùng quyền từ IAM Role
AWS SDK tự lấy credentials từ EC2 metadata
```
AWS IAM role cho EC2 cho phép application trên instance gọi AWS API mà không cần bạn tự quản lý credentials trong app.  
Tạo role:
```
Name: auction-backend-ec2-role
```
Policy tối thiểu cho bucket ảnh:
```
{
  "Version":"2012-10-17",
  "Statement": [
    {
      "Effect":"Allow",
      "Action": [
"s3:PutObject",
"s3:GetObject",
"s3:DeleteObject"
      ],
      "Resource":"arn:aws:s3:::auction-product-images/*"
    },
    {
      "Effect":"Allow",
      "Action": [
"s3:ListBucket"
      ],
      "Resource":"arn:aws:s3:::auction-product-images"
    }
  ]
}
```
Checklist:
```
[ ] Tạo IAM policy cho S3 bucket ảnh
[ ] Gắn policy vào auction-backend-ec2-role
[ ] Attach role này vào EC2 backend
[ ] Không để AWS access key trong application.properties
[ ] Không commit AWS secret lên GitHub
```
# 5. Cập nhật database design
có 2 cách lưu ảnh.
## Cách đơn giản — 1 ảnh chính trong `auction_items`
```
auction_items
 ├── id
 ├── title
 ├── description
 ├── starting_price
 ├── current_price
 ├── image_url
 ├── seller_id
 ├── status
 ├── created_at
 └── end_time
```
Phù hợp nếu mỗi sản phẩm chỉ có 1 ảnh.
## Cách tốt hơn — tách bảng `auction_images`
Vì sản phẩm đấu giá thường có nhiều ảnh, nên nên tách bảng riêng.
```
auction_items
 ├── id
 ├── title
 ├── description
 ├── starting_price
 ├── current_price
 ├── seller_id
 ├── status
 ├── created_at
 └── end_time
auction_images
 ├── id
 ├── auction_item_id
 ├── image_key
 ├── image_url
 ├── sort_order
 ├── is_primary
 └── created_at
```
Mình khuyên bạn dùng cách này.  
Checklist:
```
[ ] Tạo bảng auction_images
[ ] Mỗi auction item có thể có nhiều ảnh
[ ] Lưu image_key để xóa/update ảnh sau này
[ ] Lưu image_url hoặc public_url để frontend hiển thị
[ ] Có is_primary để chọn ảnh đại diện
```
# 6. Backend Spring Boot nhận file upload
API gợi ý:
```
POST /api/auction-items/{itemId}/images
Content-Type: multipart/form-data
```
Request:
```
file: image.jpg
isPrimary: true
```
Response:
```
{
  "id":1,
  "auctionItemId":123,
  "imageUrl":"<https://cdn.yourdomain.com/auction-items/123/uuid.jpg>",
  "isPrimary":true
}
```
Checklist backend:
```
[ ] Tạo endpoint upload image
[ ] Nhận MultipartFile
[ ] Kiểm tra user đã login chưa
[ ] Kiểm tra auction item tồn tại
[ ] Kiểm tra user có phải seller của item không
[ ] Validate file
[ ] Upload file lên S3
[ ] Lưu metadata vào auction_images
[ ] Trả image URL về frontend
```
# 7. Validate file upload
Không nên cho user upload mọi loại file.  
Bạn cần validate:
```
[ ] File không được null
[ ] File không được empty
[ ] File size <= 5MB hoặc 10MB
[ ] Content-Type phải là image/jpeg, image/png, image/webp
[ ] Extension hợp lệ: .jpg, .jpeg, .png, .webp
[ ] Không dùng filename gốc làm object key
```
Ví dụ rule:
```
Max size: 5MB
Allowed types:
- image/jpeg
- image/png
- image/webp
```
Vì Auction app có user upload ảnh, bước này rất quan trọng.
# 8. Thêm AWS SDK vào Spring Boot
Nếu bạn dùng Maven, thêm dependency AWS SDK S3 Java 2.x.
```
<dependency>
<groupId>software.amazon.awssdk</groupId>
<artifactId>s3</artifactId>
<version>2.29.52</version>
</dependency>
```
AWS SDK for Java 2.x có các ví dụ và API để làm việc với Amazon S3, bao gồm upload object lên bucket.  
Config trong `application-prod.properties`:
```
aws.region=ap-southeast-1
aws.s3.bucket=auction-product-images
aws.s3.public-base-url=https://cdn.yourdomain.com
```
Lưu ý:
```
Không cần aws.accessKey
Không cần aws.secretKey
```
Nếu chạy trên EC2 có IAM Role, SDK sẽ tự lấy credentials từ environment/instance role.
# 9. Tạo S3 service trong Spring Boot
Logic service nên là:
```
S3Service.uploadAuctionImage(itemId, file)
  ↓
validate file
  ↓
generate object key
  ↓
putObject lên S3
  ↓
return imageKey + imageUrl
```
Pseudo flow:
```
1. Nhận MultipartFile
2. Lấy contentType
3. Check contentType hợp lệ
4. Generate UUID
5. Tạo key: auction-items/{itemId}/{uuid}.jpg
6. Upload lên S3 bằng PutObject
7. Trả về key/url
```
Checklist:
```
[ ] Tạo S3Config
[ ] Tạo S3Client bean
[ ] Tạo S3Service
[ ] Tạo method uploadFile
[ ] Tạo method deleteFile
[ ] Handle exception khi S3 upload fail
```
# 10. Lưu ảnh vào database
Sau khi upload S3 thành công, lưu record:
```
auction_images
 ├── auction_item_id = itemId
 ├── image_key = auction-items/123/uuid.jpg
 ├── image_url = <https://cdn.yourdomain.com/auction-items/123/uuid.jpg>
 ├── is_primary = true/false
 └── created_at = now
```
Flow chuẩn:
```
1. Validate auction item
2. Upload image lên S3
3. Lưu image metadata vào RDS
4. Trả response
```
Lưu ý nhỏ: nếu upload S3 thành công nhưng lưu DB fail, bạn nên xóa object vừa upload để tránh file rác.  
Checklist:
```
[ ] Upload S3 thành công
[ ] Save auction_images thành công
[ ] Nếu save DB fail thì delete object trên S3
[ ] Nếu user xóa ảnh thì delete record DB + delete object S3
```
# 11. Cấu hình cách frontend xem ảnh
Có 3 cách.
## Cách 1 — Public S3 object
Dễ nhất nhưng không khuyên dùng lâu dài.
```
image_url = <https://auction-product-images.s3.amazonaws.com/>...
```
Nhược điểm:
```
Bucket/object dễ bị public quá rộng
Khó kiểm soát bảo mật
Không đẹp bằng CDN domain
```
## Cách 2 — CloudFront trước S3
Khuyên dùng cho ảnh sản phẩm public.
```
User
  ↓
CloudFront
  ↓
S3 private bucket
```
Image URL:
```
<https://cdn.yourdomain.com/auction-items/123/uuid.jpg>
```
Đây là hướng đẹp nhất cho product images, vì ảnh sản phẩm đấu giá thường được public cho người mua xem.
## Cách 3 — Presigned URL khi ảnh private
Dùng cho ảnh nhạy cảm như:
```
Payment proof
Private documents
KYC images nếu sau này có
```
AWS presigned URLs cho phép cấp quyền truy cập tạm thời đến object mà không cần mở public access.  
Gợi ý cho app:
```
Product images: CloudFront public read
Payment proof: S3 private + presigned URL
Avatar: CloudFront public hoặc private tùy app
```
# 12. Frontend React upload ảnh
React gửi `multipart/form-data`.  
Flow:
```
User chọn ảnh
  ↓
React preview ảnh
  ↓
User bấm Upload
  ↓
POST /api/auction-items/{itemId}/images
  ↓
Backend trả imageUrl
  ↓
React hiển thị ảnh
```
Checklist frontend:
```
[ ] Tạo input type=file
[ ] Chỉ accept image/*
[ ] Preview ảnh trước khi upload
[ ] Validate size ở frontend
[ ] Gửi FormData
[ ] Gửi Authorization Bearer token
[ ] Hiển thị loading khi upload
[ ] Hiển thị lỗi nếu upload fail
```
Ví dụ request:
```
constformData=newFormData();
formData.append("file",file);
formData.append("isPrimary","true");
awaitfetch(`${API_URL}/api/auction-items/${itemId}/images`, {
  method:"POST",
  headers: {
    Authorization:`Bearer${token}`
  },
  body:formData
});
```
Lưu ý: khi dùng `FormData`, không tự set `"Content-Type": "multipart/form-data"`. Browser sẽ tự set boundary.
# 13. Tạo S3 VPC Endpoint sau này
Giai đoạn đầu chưa bắt buộc.  
Nếu backend EC2 nằm public subnet, nó có thể upload S3 qua internet.  
Nhưng sau này nên thêm **S3 Gateway Endpoint** để traffic từ VPC tới S3 đi qua AWS network, không cần Internet Gateway/NAT. AWS nói S3 Gateway Endpoint giúp truy cập S3 từ VPC mà không cần internet gateway hoặc NAT device, và không tính thêm phí cho gateway endpoint.  
Checklist sau này:
```
[ ] Tạo Gateway Endpoint cho S3
[ ] Chọn VPC: auction-vpc
[ ] Associate với route table của backend subnet
[ ] Cập nhật endpoint policy nếu cần
[ ] Test backend upload ảnh vẫn chạy
```
# 14. Encryption với S3/KMS
Giai đoạn đầu bạn có thể bật:
```
SSE-S3
```
Nếu muốn học KMS:
```
SSE-KMS
```
Với Auction app:
```
Product images: SSE-S3 là đủ cho demo
Payment proof/private documents: nên dùng SSE-KMS nếu muốn nghiêm túc hơn
```
Checklist:
```
[ ] Bật default encryption cho bucket
[ ] Demo dùng SSE-S3
[ ] Nếu dùng KMS, tạo KMS key riêng
[ ] IAM Role EC2 cần quyền kms:Encrypt/kms:Decrypt nếu dùng SSE-KMS
```
# 15. API cần có cho ảnh
Bạn nên có các API này:
```
POST   /api/auction-items/{itemId}/images
GET    /api/auction-items/{itemId}/images
DELETE /api/auction-items/{itemId}/images/{imageId}
PATCH  /api/auction-items/{itemId}/images/{imageId}/primary
```
Ý nghĩa:
```
POST   upload ảnh
GET    lấy danh sách ảnh của item
DELETE xóa ảnh
PATCH  đặt ảnh chính
```
Rule bảo mật:
```
Seller mới được upload ảnh cho item của mình
Seller mới được xóa ảnh
Admin có thể xóa ảnh vi phạm
Guest chỉ được xem ảnh public
```
# 16. Checklist tổng Phase 6
```
S3 bucket
[ ] Tạo bucket auction-product-images
[ ] Block Public Access bật
[ ] Bật default encryption
[ ] Quyết định URL hiển thị ảnh: CloudFront hoặc presigned URL
IAM
[ ] Tạo policy S3 PutObject/GetObject/DeleteObject
[ ] Gắn policy vào auction-backend-ec2-role
[ ] Attach role vào EC2 backend
[ ] Không dùng access key trong code
Database
[ ] Tạo bảng auction_images
[ ] Có auction_item_id
[ ] Có image_key
[ ] Có image_url
[ ] Có is_primary
[ ] Có sort_order
[ ] Có created_at
Backend
[ ] Thêm AWS SDK S3
[ ] Tạo S3Client bean
[ ] Tạo S3Service
[ ] Tạo upload endpoint multipart/form-data
[ ] Validate file type
[ ] Validate file size
[ ] Check user là seller
[ ] Upload object lên S3
[ ] Lưu metadata vào RDS
[ ] Nếu DB save fail thì xóa object S3
[ ] Tạo delete image API
[ ] Tạo set primary image API
Frontend
[ ] Tạo file input
[ ] Preview ảnh
[ ] Validate size trước khi upload
[ ] Gửi FormData
[ ] Gửi Bearer token
[ ] Hiển thị upload loading
[ ] Hiển thị ảnh bằng imageUrl backend trả về
Security
[ ] Không public bucket bừa bãi
[ ] Không upload file không phải ảnh
[ ] Không dùng filename gốc làm S3 key
[ ] Không để AWS key trong frontend/backend code
[ ] Payment proof nên private
[ ] Product images có thể public qua CloudFront
Later improvement
[ ] Thêm CloudFront cho ảnh
[ ] Thêm S3 Gateway Endpoint
[ ] Thêm presigned URL cho ảnh private
[ ] Thêm KMS nếu cần
```
# Thứ tự làm thực tế cho bạn
Bạn nên làm theo thứ tự này:
```
1. Tạo S3 bucket auction-product-images
2. Bật Block Public Access và encryption
3. Tạo IAM policy cho bucket ảnh
4. Gắn policy vào EC2 role
5. Thêm AWS SDK S3 vào Spring Boot
6. Tạo bảng auction_images
7. Tạo S3Service upload/delete
8. Tạo API upload ảnh cho auction item
9. Validate file
10. Lưu image_key/image_url vào RDS
11. Test upload bằng Postman
12. Test upload từ React
13. Hiển thị ảnh trong auction detail/list
14. Tạo API delete image
15. Sau này thêm CloudFront/S3 endpoint/presigned URL
```
# Kết quả cần đạt sau Phase 6
Sau Phase 6, app của bạn phải làm được:
```
Seller tạo auction item
Seller upload ảnh sản phẩm
Ảnh được lưu trong S3
Thông tin ảnh được lưu trong RDS
Frontend hiển thị ảnh sản phẩm
User khác xem được ảnh sản phẩm
Backend không chứa AWS access key
S3 bucket không bị public bừa bãi
```
Nói đơn giản: **Phase 6 là biến Auction app từ app chỉ có text thành app có ảnh sản phẩm thật, lưu ảnh ở S3 và lưu metadata ở MySQL RDS.**