**Phase 5: Deploy React Frontend để** đưa giao diện React của Auction app lên AWS.  
Mục tiêu cuối cùng:
```
User
  ↓
<https://auction.yourdomain.com>
  ↓
CloudFront
  ↓
S3 bucket chứa React build
  ↓
React gọi API
  ↓
<https://api.yourdomain.com>
  ↓
Spring Boot backend on EC2
```
# Phase 5A — Chuẩn bị React app trước khi build
Trước khi deploy, frontend cần biết backend API nằm ở đâu.  
Ví dụ backend của bạn là:
```
<https://api.yourdomain.com>
```
Trong React/Vite, tạo file:
```
.env.production
```
Nội dung:
```
VITE_API_URL=https://api.yourdomain.com
```
Trong code React, bạn gọi API như này:
```
constAPI_URL=import.meta.env.VITE_API_URL;
fetch(`${API_URL}/api/auth/login`, {
  method:"POST",
  headers: {
"Content-Type":"application/json"
  },
  body:JSON.stringify(data)
});
```
Checklist:
```
[ ] Tạo .env.production
[ ] Set VITE_API_URL=https://api.yourdomain.com
[ ] Đảm bảo code React không hard-code localhost
[ ] Kiểm tra API service đang đọc từ import.meta.env.VITE_API_URL
```
Không nên để production frontend gọi:
```
<http://localhost:8080>
<http://localhost:5000>
```
Vì khi deploy lên AWS, `localhost` nghĩa là máy của user, không phải backend của bạn.
# Phase 5B — Cấu hình CORS ở Spring Boot
React frontend sẽ chạy ở domain riêng, ví dụ:
```
<https://auction.yourdomain.com>
```
Backend Spring Boot chạy ở:
```
<https://api.yourdomain.com>
```
Vì khác domain, backend cần cho phép CORS.  
Ví dụ Spring Boot:
```
@Configuration
publicclassCorsConfig {
    @Bean
publicWebMvcConfigurercorsConfigurer() {
returnnewWebMvcConfigurer() {
            @Override
publicvoidaddCorsMappings(CorsRegistryregistry) {
registry.addMapping("/**")
.allowedOrigins(
"<http://localhost:5173>",
"<https://auction.yourdomain.com>"
                        )
.allowedMethods("GET","POST","PUT","PATCH","DELETE","OPTIONS")
.allowedHeaders("*")
.allowCredentials(true);
            }
        };
    }
}
```
Checklist:
```
[ ] Backend allow frontend domain
[ ] Backend allow methods GET/POST/PUT/PATCH/DELETE/OPTIONS
[ ] Nếu dùng JWT trong Authorization header, allowedHeaders phải cho phép Authorization
[ ] Restart backend sau khi sửa CORS
```
# Phase 5C — Build React app
Ở máy local, vào thư mục frontend:
```
cd frontend
```
Cài dependencies nếu chưa có:
```
npm install
```
Build production:
```
npm run build
```
Nếu dùng Vite, kết quả thường nằm ở:
```
dist/
```
Nếu dùng Create React App, kết quả thường nằm ở:
```
build/
```
Với Vite, cấu trúc sau build:
```
dist/
 ├── index.html
 ├── assets/
 │    ├── index-xxxxx.js
 │    └── index-xxxxx.css
 └── ...
```
Checklist:
```
[ ] npm install
[ ] npm run build
[ ] Kiểm tra thư mục dist hoặc build
[ ] Mở file index.html xem assets có được generate chưa
[ ] Không upload source code React, chỉ upload dist/build
```
# Phase 5D — Tạo S3 bucket cho frontend
Bạn tạo S3 bucket để chứa static files của React.  
Tên gợi ý:
```
auction-frontend-web
```
Hoặc nếu dùng domain:
```
auction.yourdomain.com
```
Checklist tạo bucket:
```
[ ] Vào S3 Console
[ ] Create bucket
[ ] Name: auction-frontend-web
[ ] Region: cùng region với các service khác nếu được
[ ] Block Public Access: giữ bật nếu dùng CloudFront OAC
[ ] Versioning: optional, có thể bật nếu muốn rollback
[ ] Create bucket
```
Có 2 cách deploy frontend:
```
Cách 1: S3 Static Website Hosting
Cách 2: S3 private + CloudFront
```
Mình khuyên bạn dùng:
```
S3 private + CloudFront
```
Vì sau này dễ dùng HTTPS, custom domain, cache, bảo mật tốt hơn.
# Phase 5E — Upload React build lên S3
Nếu dùng AWS Console:
```
[ ] Vào bucket auction-frontend-web
[ ] Upload
[ ] Chọn toàn bộ file bên trong dist/
[ ] Không upload folder dist, mà upload nội dung bên trong dist
[ ] Upload
```
Đúng:
```
S3 bucket
 ├── index.html
 ├── assets/
 └── favicon...
```
Sai:
```
S3 bucket
 └── dist/
      ├── index.html
      └── assets/
```
Nếu dùng AWS CLI:
```
aws s3 sync dist/ s3://auction-frontend-web--delete
```
Checklist:
```
[ ] Upload index.html vào root bucket
[ ] Upload assets folder
[ ] Kiểm tra không bị nested dist/dist
[ ] Nếu redeploy, dùng sync --delete để xóa file cũ không còn dùng
```
# Phase 5F — Tạo CloudFront Distribution
CloudFront sẽ đứng trước S3 để user truy cập nhanh hơn và dùng HTTPS.  
Kiến trúc:
```
User
  ↓
CloudFront
  ↓
S3 bucket private
```
Checklist tạo CloudFront:
```
[ ] Vào CloudFront Console
[ ] Create distribution
[ ] Origin domain: chọn S3 bucket auction-frontend-web
[ ] Origin access: dùng Origin Access Control OAC
[ ] Viewer protocol policy: Redirect HTTP to HTTPS
[ ] Default root object: index.html
[ ] Create distribution
```
Sau khi tạo CloudFront, AWS sẽ cho domain kiểu:
```
<https://dxxxxxxxxxxxx.cloudfront.net>
```
Bạn test thử domain này trước.
# Phase 5G — Cấu hình S3 bucket policy cho CloudFront
Nếu dùng CloudFront OAC, S3 bucket vẫn private. CloudFront sẽ có quyền đọc file trong bucket.  
Khi tạo CloudFront OAC, AWS thường gợi ý bucket policy. Bạn copy policy đó vào S3 bucket policy.  
Checklist:
```
[ ] Sau khi tạo CloudFront, lấy bucket policy được AWS gợi ý
[ ] Vào S3 bucket
[ ] Permissions
[ ] Bucket policy
[ ] Paste policy
[ ] Save
```
Kết quả mong muốn:
```
User không truy cập trực tiếp S3 object public
User truy cập qua CloudFront
CloudFront đọc được file từ S3
```
# Phase 5H — Fix React Router khi refresh page
Nếu app React dùng route như:
```
/login
/auction-items
/auction-items/123
/profile
```
Khi user refresh `/login`, CloudFront/S3 có thể báo 403/404 vì thật ra trong S3 chỉ có `index.html`.  
Bạn cần cấu hình CloudFront custom error response.  
Checklist:
```
[ ] Vào CloudFront distribution
[ ] Error pages
[ ] Create custom error response
[ ] HTTP error code: 403
[ ] Customize error response: Yes
[ ] Response page path: /index.html
[ ] HTTP response code: 200
```
Làm thêm cho 404:
```
[ ] HTTP error code: 404
[ ] Response page path: /index.html
[ ] HTTP response code: 200
```
Kết quả:
```
Refresh /login không lỗi
Refresh /auction-items/123 không lỗi
React Router tự xử lý route
```
# Phase 5I — Trỏ domain bằng Route 53
Bạn có thể dùng domain như:
```
auction.yourdomain.com
```
Hoặc:
```
www.yourdomain.com
```
Checklist:
```
[ ] Vào Route 53
[ ] Hosted zone của yourdomain.com
[ ] Create record
[ ] Record name: auction
[ ] Record type: A
[ ] Alias: Yes
[ ] Route traffic to: CloudFront distribution
[ ] Save
```
Kết quả:
```
auction.yourdomain.com → CloudFront → S3 React app
```
# Phase 5J — Cấu hình HTTPS cho frontend
Với CloudFront, SSL certificate nên dùng AWS Certificate Manager ở region:
```
us-east-1
```
Dù app bạn ở Singapore/Tokyo/... thì certificate cho CloudFront vẫn cần tạo ở `us-east-1`.  
Checklist:
```
[ ] Vào AWS Certificate Manager
[ ] Chuyển region sang us-east-1
[ ] Request public certificate
[ ] Domain: auction.yourdomain.com
[ ] Validation: DNS validation
[ ] Tạo DNS record validation trong Route 53
[ ] Chờ certificate status = Issued
[ ] Gắn certificate vào CloudFront distribution
```
Trong CloudFront:
```
Alternate domain name CNAME:
auction.yourdomain.com
Custom SSL certificate:
chọn certificate vừa tạo
```
Sau đó test:
```
<https://auction.yourdomain.com>
```
# Phase 5K — Kiểm tra frontend gọi backend
Sau khi frontend chạy trên CloudFront/domain, test các flow:
```
[ ] Mở <https://auction.yourdomain.com>
[ ] Register user
[ ] Login user
[ ] Xem danh sách auction items
[ ] Create auction item
[ ] Upload image nếu có
[ ] Bid thử
[ ] Logout/login lại
```
Mở DevTools → Network, kiểm tra API đang gọi:
```
<https://api.yourdomain.com/api/>...
```
Không được gọi:
```
<http://localhost:8080>
<http://localhost:5000>
```
Nếu bị CORS:
```
[ ] Kiểm tra Spring Boot CORS allow đúng frontend domain chưa
[ ] Kiểm tra backend có restart chưa
[ ] Kiểm tra preflight OPTIONS có bị Spring Security chặn không
[ ] Kiểm tra frontend dùng đúng VITE_API_URL chưa
```
# Phase 5L — Mỗi lần update frontend thì deploy lại thế nào?
Mỗi lần sửa React xong:
```
npm run build
```
Upload lại:
```
aws s3 sync dist/ s3://auction-frontend-web--delete
```
Sau đó cần invalidate CloudFront cache:
```
aws cloudfront create-invalidation \
--distribution-id YOUR_DISTRIBUTION_ID \
--paths"/*"
```
Nếu không invalidate, user có thể vẫn thấy bản cũ do CloudFront cache.  
Checklist redeploy:
```
[ ] npm run build
[ ] aws s3 sync dist/ s3://auction-frontend-web --delete
[ ] CloudFront invalidation /*
[ ] Test lại domain
```
# Phase 5M — Security cho frontend S3/CloudFront
Checklist bảo mật:
```
[ ] S3 bucket không public nếu dùng CloudFront OAC
[ ] CloudFront redirect HTTP to HTTPS
[ ] Không để secret trong React env
[ ] VITE_API_URL được phép public
[ ] Không lưu JWT secret ở frontend
[ ] Không hard-code admin credentials
[ ] Không upload .env lên S3
```
Cần nhớ:
```
React build là public.
Mọi biến VITE_ đều có thể bị user xem trong browser.
```
Vì vậy frontend chỉ nên chứa:
```
VITE_API_URL=https://api.yourdomain.com
```
Không được chứa:
```
DB_PASSWORD
JWT_SECRET
AWS_ACCESS_KEY
AWS_SECRET_KEY
```
# Checklist tổng Phase 5
```
Frontend preparation
[ ] Tạo .env.production
[ ] Set VITE_API_URL=https://api.yourdomain.com
[ ] Đảm bảo code dùng import.meta.env.VITE_API_URL
[ ] Không còn hard-code localhost
[ ] Backend đã allow CORS từ frontend domain
Build React
[ ] npm install
[ ] npm run build
[ ] Kiểm tra dist/ hoặc build/
[ ] Đảm bảo index.html nằm trong dist/
S3
[ ] Tạo bucket auction-frontend-web
[ ] Upload nội dung bên trong dist/ lên bucket
[ ] Không upload nhầm folder dist
[ ] Giữ bucket private nếu dùng CloudFront OAC
CloudFront
[ ] Tạo distribution
[ ] Origin là S3 bucket
[ ] Dùng Origin Access Control
[ ] Default root object: index.html
[ ] Redirect HTTP to HTTPS
[ ] Gắn bucket policy cho CloudFront đọc S3
[ ] Test bằng dxxxxx.cloudfront.net
React Router
[ ] Custom error response 403 → /index.html, status 200
[ ] Custom error response 404 → /index.html, status 200
[ ] Test refresh /login, /auction-items
Domain
[ ] Tạo certificate ở ACM us-east-1
[ ] Validate bằng DNS Route 53
[ ] Gắn certificate vào CloudFront
[ ] Add alternate domain name auction.yourdomain.com
[ ] Route 53 A Alias → CloudFront
[ ] Test <https://auction.yourdomain.com>
Testing
[ ] Register
[ ] Login
[ ] Get profile
[ ] List auction items
[ ] Create auction item
[ ] Upload image
[ ] Bid
[ ] Check DevTools Network
Redeploy
[ ] npm run build
[ ] aws s3 sync dist/ s3://auction-frontend-web --delete
[ ] CloudFront invalidation /*
```
# Thứ tự làm thực tế cho bạn
Bạn nên làm đúng thứ tự này:
```
1. Sửa React dùng VITE_API_URL
2. Tạo .env.production
3. Build React bằng npm run build
4. Tạo S3 bucket
5. Upload dist lên S3
6. Tạo CloudFront distribution
7. Gắn OAC/bucket policy
8. Test bằng CloudFront domain
9. Fix React Router bằng custom error response
10. Tạo SSL certificate ở ACM us-east-1
11. Trỏ domain Route 53 về CloudFront
12. Test <https://auction.yourdomain.com>
13. Test frontend gọi backend
14. Fix CORS nếu bị lỗi
15. Setup quy trình redeploy
```
# Với Auction app, sau Phase 5 bạn cần đạt được
```
React frontend chạy trên S3
User truy cập qua CloudFront
Có HTTPS
Có domain riêng
Frontend gọi được Spring Boot backend
Không còn localhost trong production build
Refresh route không bị 403/404
Có quy trình update frontend sau mỗi lần sửa code
```
Nói đơn giản: **Phase 5 là đưa giao diện Auction app lên internet bằng S3 + CloudFront, còn backend vẫn chạy riêng ở EC2 qua domain API.**