Prim và Kruskal đều dùng để tìm **cây khung nhỏ nhất MST** của đồ thị vô hướng có trọng số, nhưng cách làm khác nhau.
- **Prim**: bắt đầu từ **một đỉnh**, rồi mở rộng cây ra từng bước bằng cách chọn cạnh nhẹ nhất nối từ cây hiện tại sang một đỉnh chưa thuộc cây.
- **Kruskal**: không cần bắt đầu từ đỉnh nào. Nó **sắp xếp tất cả cạnh theo trọng số tăng dần**, rồi lấy cạnh nhẹ nhất nếu cạnh đó không tạo chu trình.
Prim và Kruskal cũng ra tổng trọng số MST giống nhau, nhưng MST có thể khác nhau
Điểm khác dễ nhớ nhất:
- **Prim** chú ý vào **đỉnh/cây hiện tại**
- **Kruskal** chú ý vào **cạnh**
- **Prim** thường hợp với đồ thị khá dày
- **Kruskal** thường hợp với đồ thị thưa







