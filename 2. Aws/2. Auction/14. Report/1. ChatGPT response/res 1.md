Dựa trên các phần đã đọc từ **5.4.1 đến 5.4.8**, mục **5.5 – Kiểm thử hệ thống** nên được chia theo luồng kiểm thử thực tế, không nên chỉ lặp lại từng dịch vụ AWS.
## Cấu trúc đề xuất cho 5.5
### 5.5.1. Tổng quan và môi trường kiểm thử
Nội dung cần có:
- Mục tiêu kiểm thử hệ thống.
- Phạm vi kiểm thử.
- Kiến trúc/môi trường được kiểm thử.
- Region AWS: `ap-southeast-1`.
- User Frontend và Admin Frontend.
- Các dịch vụ tham gia:
    - Amazon Cognito.
    - Amazon API Gateway REST.
    - API Gateway WebSocket.
    - AWS Lambda.
    - Amazon DynamoDB.
    - Amazon SQS FIFO.
    - Amazon S3.
    - Amazon CloudFront.
    - Amazon CloudWatch.
- Tài khoản kiểm thử:
    - User.
    - Admin.
- Quy ước kết quả: `PASS`, `FAIL`, `BLOCKED`.
Không đưa Access Token, Secret Key, mật khẩu hoặc thông tin nhạy cảm vào ảnh minh họa.

---
### 5.5.2. Phương pháp và định dạng test case
Giải thích cách nhóm thực hiện và ghi nhận kiểm thử.
Mỗi test case nên có các trường:

| Trường               | Nội dung                              |
| -------------------- | ------------------------------------- |
| Mã kiểm thử          | Ví dụ: `AUTH-01`                      |
| Tên kiểm thử         | Tên trường hợp kiểm thử               |
| Mục tiêu             | Chức năng hoặc điều kiện cần xác minh |
| Điều kiện tiên quyết | Dữ liệu và trạng thái cần có          |
| Các bước thực hiện   | Trình tự kiểm thử                     |
| Dữ liệu đầu vào      | Token, giá đặt, ID phiên...           |
| Kết quả mong đợi     | Hành vi đúng của hệ thống             |
| Kết quả thực tế      | Kết quả quan sát được                 |
| Trạng thái           | PASS/FAIL/BLOCKED                     |
| Bằng chứng           | Ảnh giao diện, log hoặc dữ liệu AWS   |

---
### 5.5.3. Kiểm thử xác thực và phân quyền
Phần này kiểm tra Amazon Cognito, API Authorizer và IAM ở cấp độ hệ thống.
Các test case cần có:
- Đăng ký tài khoản User thành công.
- Xác nhận tài khoản thành công.
- Lambda Post Confirmation được kích hoạt.
- Xử lý lặp Post Confirmation không tạo trùng dữ liệu.
- Đăng nhập đúng thông tin.
- Đăng nhập sai mật khẩu.
- Đăng nhập bằng tài khoản chưa xác nhận.
- Gọi API không có token.
- Gọi API bằng token không hợp lệ.
- Gọi API bằng token hết hạn.
- User gọi API thông thường thành công.
- User gọi API quản trị bị từ chối.
- Admin gọi API quản trị thành công.
- Hệ thống sử dụng claim đã xác minh như `sub` và `cognito:groups`.
- Không tin `userId` hoặc `role` được gửi từ request body.
Ví dụ mã:
```
AUTH-01 đến AUTH-13
```
Bằng chứng:
- Giao diện đăng ký/đăng nhập.
- HTTP status `200`, `400`, `401`, `403`.
- Cognito User Pool.
- CloudWatch Logs của Post Confirmation Lambda.
- Bản ghi người dùng trong DynamoDB.

---
### 5.5.4. Kiểm thử REST API và nghiệp vụ quản lý đấu giá
Kiểm tra các nghiệp vụ được cung cấp qua API Gateway REST và Business Logic Lambda.
Các nhóm test case:
- Lấy danh sách phiên đấu giá.
- Xem chi tiết phiên hoặc vật phẩm.
- Tạo phiên đấu giá bằng Admin.
- Cập nhật phiên đấu giá.
- Bắt đầu phiên đấu giá.
- Kết thúc phiên đấu giá.
- User không được tạo hoặc sửa phiên.
- Dữ liệu đầu vào thiếu trường bắt buộc.
- ID tài nguyên không tồn tại.
- Trạng thái phiên không cho phép thao tác.
- DynamoDB được cập nhật đúng sau nghiệp vụ.
- API trả về đúng mã HTTP và cấu trúc JSON.
Ví dụ mã:
```
API-01 đến API-12
```
Không chỉ kiểm tra Lambda trả về `200`; phải kiểm tra dữ liệu thực sự được lưu và giao diện nhận đúng kết quả.

---
### 5.5.5. Kiểm thử kết nối WebSocket và cập nhật thời gian thực
Kiểm tra API Gateway WebSocket, Lambda WebSocket Handler, bảng kết nối và Lambda Broadcast.
Các test case:
- User kết nối WebSocket thành công.
- Kết nối không hợp lệ bị từ chối.
- Sự kiện `$connect` lưu Connection ID.
- User tham gia đúng phòng đấu giá.
- Hai người dùng cùng tham gia một vật phẩm.
- User gửi thông điệp hợp lệ.
- Thông điệp sai định dạng bị từ chối.
- Trạng thái đấu giá được gửi đến tất cả người tham gia.
- Một user rời trang hoặc ngắt kết nối.
- Sự kiện `$disconnect` xóa hoặc vô hiệu hóa kết nối.
- Kết nối đã hết hạn không làm Lambda Broadcast thất bại toàn bộ.
- Kết nối cũ nhận lỗi `GoneException` được dọn khỏi DynamoDB.
- Người dùng không thuộc phiên không nhận dữ liệu riêng của phiên đó.
Ví dụ mã:
```
WS-01 đến WS-13
```
Bằng chứng:
- Hai cửa sổ trình duyệt hoạt động đồng thời.
- Log `$connect`, `$disconnect` và broadcast.
- Bản ghi Connection ID trong DynamoDB.
- Nội dung WebSocket message nhận được.

---
### 5.5.6. Kiểm thử luồng đặt giá đầu cuối
Đây là phần quan trọng nhất của hệ thống Live Auction.
Luồng phải được kiểm tra:
```
Frontend
→ WebSocket API
→ la-ws-handler
→ SQS FIFO
→ la-bid-processor
→ DynamoDB
→ la-broadcast
→ WebSocket API
→ Frontend
```
Các test case cần có:
- Đặt giá hợp lệ.
- Giá đặt bằng hoặc thấp hơn giá hiện tại.
- Giá đặt không đáp ứng bước giá tối thiểu.
- Đặt giá khi phiên chưa bắt đầu.
- Đặt giá khi phiên đã kết thúc.
- User không hợp lệ hoặc chưa đăng nhập đặt giá.
- User không thuộc phiên gửi yêu cầu.
- Cùng một yêu cầu đặt giá được gửi lại.
- Nhiều người đặt giá lần lượt.
- Người đặt giá cao nhất được cập nhật đúng.
- Lịch sử đặt giá được lưu đúng.
- Kết quả được broadcast đến các user đang theo dõi.
- Giao diện hiển thị giá mới mà không cần tải lại trang.
Ví dụ mã:
```
BID-01 đến BID-13
```

---
### 5.5.7. Kiểm thử đồng thời và thứ tự đặt giá với SQS FIFO
Phần này chứng minh lý do sử dụng FIFO, không chỉ chứng minh Queue tồn tại.
Các test case:
- Hai yêu cầu đặt giá được gửi gần như đồng thời.
- Nhiều yêu cầu của cùng vật phẩm sử dụng cùng `MessageGroupId`.
- Thông điệp trong cùng nhóm được xử lý theo thứ tự.
- Các vật phẩm khác nhau có thể được xử lý song song.
- `MessageDeduplicationId` ngăn yêu cầu trùng trong khoảng deduplication của SQS.
- Lambda xử lý lặp nhưng không tạo hai lượt giá giống nhau.
- Lambda thất bại và thông điệp xuất hiện lại sau Visibility Timeout.
- Thông điệp được xóa sau khi xử lý thành công.
- Thông điệp lỗi vượt quá `maxReceiveCount` được chuyển vào DLQ.
- Một thông điệp lỗi không làm mất các thông điệp hợp lệ.
Ví dụ mã:
```
FIFO-01 đến FIFO-10
```
Bằng chứng:
- SQS Metrics:
    - Messages sent.
    - Messages received.
    - Messages deleted.
    - Age of oldest message.
- CloudWatch Logs có request ID và bid ID.
- Dữ liệu cuối cùng trong DynamoDB.
- Nội dung DLQ nếu có.
Nếu dự án chưa cấu hình DLQ, phải ghi `BLOCKED` hoặc “chưa triển khai”, không ghi là đã kiểm thử thành công.

---
### 5.5.8. Kiểm thử DynamoDB và tính toàn vẹn dữ liệu
Kiểm tra kết quả dữ liệu sau các luồng nghiệp vụ.
Các test case:
- Dữ liệu phiên đấu giá được lưu đúng.
- Dữ liệu vật phẩm được lưu đúng.
- Lượt đặt giá được liên kết đúng với user và vật phẩm.
- Giá hiện tại khớp với lượt giá hợp lệ cao nhất.
- Conditional Write ngăn ghi đè trạng thái cũ.
- Yêu cầu xử lý lặp không tạo bản ghi trùng.
- Không tạo dữ liệu một phần khi nghiệp vụ thất bại.
- Truy vấn theo partition key và sort key trả về đúng kết quả.
- Kết nối WebSocket hết hạn được dọn đúng cách.
- User không được đọc hoặc sửa dữ liệu ngoài phạm vi được cấp quyền.
Ví dụ mã:
```
DB-01 đến DB-10
```

---
### 5.5.9. Kiểm thử S3, tải ảnh và CloudFront
Kiểm tra ba bucket: User Frontend, Admin Frontend và Item Media.
Các test case:
- Truy cập User Frontend qua CloudFront.
- Truy cập Admin Frontend qua CloudFront.
- `index.html`, JavaScript và CSS được tải thành công.
- Tải lại một React route không trả về lỗi không mong muốn.
- Truy cập trực tiếp object trong private S3 bucket bị từ chối.
- CloudFront OAC đọc được object.
- User hợp lệ tải ảnh vật phẩm lên.
- CORS cho phép đúng origin và HTTP method.
- Origin không được tin cậy bị CORS từ chối.
- Tệp sai loại bị từ chối.
- Tệp vượt quá kích thước cho phép bị từ chối.
- Ảnh tải lên hiển thị đúng trên frontend.
- Versioning tạo phiên bản mới khi object bị thay thế.
- Lambda không thể ghi vào bucket ngoài phạm vi IAM.
Ví dụ mã:
```
STORAGE-01 đến STORAGE-14
```
Cần kiểm tra phương thức tải ảnh thực tế là `POST` hay `PUT` để cấu hình và test CORS chính xác.

---
### 5.5.10. Kiểm thử xử lý lỗi và khả năng phục hồi
Các test case:
- Lambda phát sinh lỗi nhưng hệ thống trả về thông báo phù hợp.
- SQS tự động thử lại thông điệp thất bại.
- Thông điệp lỗi được chuyển đến DLQ.
- DynamoDB Conditional Check thất bại không làm sai giá hiện tại.
- Broadcast đến một kết nối lỗi không ảnh hưởng các kết nối còn lại.
- Request bị timeout không tạo dữ liệu trùng khi người dùng thử lại.
- Frontend hiển thị lỗi khi REST API không khả dụng.
- Frontend tự kết nối lại WebSocket nếu mất kết nối.
- Không hiển thị stack trace hoặc thông tin nội bộ cho người dùng.
- CloudWatch Logs ghi đủ thông tin để truy vết lỗi.
Ví dụ mã:
```
RECOVERY-01 đến RECOVERY-10
```

---
### 5.5.11. Kiểm thử hiệu năng và tải đồng thời
Không cần mô phỏng tải quá lớn nếu đây là workshop, nhưng phải có một mức tải đo được.
Nội dung cần kiểm tra:
- Thời gian phản hồi của REST API.
- Thời gian từ lúc gửi bid đến lúc giao diện nhận giá mới.
- Nhiều user kết nối WebSocket đồng thời.
- Nhiều yêu cầu đặt giá trong một khoảng thời gian ngắn.
- SQS có tồn đọng thông điệp hay không.
- `AgeOfOldestMessage`.
- Lambda Duration, Errors, Throttles và Concurrent Executions.
- DynamoDB throttling.
- Tỷ lệ yêu cầu thành công.
- Hệ thống có giữ đúng thứ tự và dữ liệu khi có tải hay không.
Ví dụ mã:
```
PERF-01 đến PERF-06
```
Nên trình bày rõ:
```
Số người dùng ảo
Số yêu cầu
Thời gian kiểm thử
Tỷ lệ thành công
Thời gian phản hồi trung bình
Thời gian phản hồi P95
Số lỗi
```

---
### 5.5.12. Kiểm thử bảo mật hệ thống
Tập trung vào hành vi bảo mật thực tế:
- API từ chối request không có token.
- Token giả mạo bị từ chối.
- Token hết hạn bị từ chối.
- User không thể truy cập API Admin.
- Không thể thay đổi quyền bằng trường `role` trong request.
- Không thể thao tác tài nguyên của user khác bằng cách đổi ID.
- S3 bucket không cho phép truy cập công khai.
- CORS chỉ cho phép origin được tin cậy.
- Lambda bị từ chối khi truy cập tài nguyên ngoài IAM Policy.
- WebSocket message được xác thực và kiểm tra định dạng.
- Log không chứa mật khẩu, token hoặc Secret Key.
- Thông báo lỗi không tiết lộ cấu trúc hệ thống.
Ví dụ mã:
```
SEC-01 đến SEC-12
```

---
### 5.5.13. Tổng hợp kết quả kiểm thử
Phần cuối nên có bảng tổng hợp:

|Nhóm kiểm thử|Tổng số|PASS|FAIL|BLOCKED|Tỷ lệ đạt|
|---|---|---|---|---|---|
|Xác thực và phân quyền|13|
|REST API|12|
|WebSocket|13|
|Đặt giá|13|
|SQS FIFO|10|
|DynamoDB|10|
|S3 và CloudFront|14|
|Khả năng phục hồi|10|
|Hiệu năng|6|
|Bảo mật|12|
Sau bảng cần trình bày:
- Những chức năng đã đạt.
- Những test case thất bại.
- Nguyên nhân.
- Cách khắc phục.
- Các giới hạn chưa kiểm thử.
- Đánh giá hệ thống có đáp ứng mục tiêu hay không.
## Danh sách mục hoàn chỉnh
```
5.5. Kiểm thử hệ thống
├── 5.5.1. Tổng quan và môi trường kiểm thử
├── 5.5.2. Phương pháp và định dạng test case
├── 5.5.3. Kiểm thử xác thực và phân quyền
├── 5.5.4. Kiểm thử REST API và nghiệp vụ quản lý đấu giá
├── 5.5.5. Kiểm thử WebSocket và cập nhật thời gian thực
├── 5.5.6. Kiểm thử luồng đặt giá đầu cuối
├── 5.5.7. Kiểm thử đồng thời và thứ tự với SQS FIFO
├── 5.5.8. Kiểm thử DynamoDB và tính toàn vẹn dữ liệu
├── 5.5.9. Kiểm thử S3, tải ảnh và CloudFront
├── 5.5.10. Kiểm thử xử lý lỗi và khả năng phục hồi
├── 5.5.11. Kiểm thử hiệu năng và tải đồng thời
├── 5.5.12. Kiểm thử bảo mật hệ thống
└── 5.5.13. Tổng hợp kết quả kiểm thử
```
Cấu trúc này phân biệt rõ giữa **kiểm tra cấu hình dịch vụ ở 5.4** và **kiểm tra toàn bộ hệ thống thực sự hoạt động ở 5.5**. `terraform validate`, `terraform plan` và ảnh tài nguyên trên AWS Console chỉ là bằng chứng bổ trợ, không thay thế các test case đầu cuối.