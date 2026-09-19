# LỜI CAM ĐOAN
Em xin cam đoan luận án: **“Nghiên cứu thuật toán metaheuristic giải bài toán định tuyến xe trong giao vận độ thị”** là công trình nghiên cứu của chính em dưới sự hướng dẫn khoa học của thầy Phan Tấn Quốc hướng dẫn.
Luận án sử dụng thông tin trích dẫn từ nhiều nguồn tham khảo khác nhau và các thông tin trích dẫn được ghi rõ nguồn gốc.
Các số liệu, kết quả được trình bày trong luận án là hoàn toàn trung thực và chưa từng được công bố trong bất kỳ một công trình nào khác ngoài các công trình công bố của tác giả.
Báo cáo được hoàn thành trong thời gian em nghiên cứu cho môn Đồ Án Chuyên Ngành trường Đại Học Sài Gòn
<div align="right">
*ngày 13 tháng 09 năm 2026*  
**Tác giả báo cáo**
<br><br>
**Lâm Thái Yến Nhi**
</div>



## LỜI CẢM ƠN
Em xin bày tỏ lòng biết ơn chân thành và sâu sắc tới thầy giáo hướng dẫn, Tiến Sĩ Phan Tấn Quốc, các thầy đã giành nhiều thời gian, công sức để định hướng và hướng dẫn em hoàn thành nghiên cứu của mình.
Em xin chân thành cảm ơn các bạn cùng chuyên môn giúp đỡ em trong suốt quá trình nghiên cứu.

<div align="right">
*ngày 13 tháng 09 năm 2026*  
**Tác giả luận án**
</div>

### 1. Lý do chọn đề tài
Trong bối cảnh đô thị hóa ngày càng phát triển, nhu cầu vận chuyển hàng hóa trong các thành phố tăng nhanh cả về số lượng và tần suất. Các doanh nghiệp giao vận phải tổ chức hoạt động phân phối hàng hóa đến nhiều địa điểm khác nhau trong điều kiện tồn tại nhiều ràng buộc như khoảng cách, thời gian giao hàng, tải trọng phương tiện, chi phí vận chuyển và mật độ giao thông. Vì vậy, việc xây dựng các tuyến đường vận chuyển hợp lý có ý nghĩa quan trọng trong việc giảm chi phí và nâng cao hiệu quả hoạt động giao vận.
Bài toán định tuyến xe, hay **Vehicle Routing Problem – VRP**, là một bài toán tối ưu tổ hợp có tính ứng dụng cao trong lĩnh vực logistics và giao vận đô thị. Khi số lượng khách hàng và phương tiện tăng lên, không gian tìm kiếm của bài toán tăng rất nhanh, khiến các phương pháp tìm kiếm chính xác khó có thể tìm được lời giải tối ưu trong thời gian hợp lý đối với các bài toán có quy mô lớn.
Các thuật toán **metaheuristic** như Genetic Algorithm, Ant Colony Optimization, Simulated Annealing, Tabu Search hoặc Particle Swarm Optimization có khả năng tìm kiếm lời giải tốt trong không gian nghiệm lớn với thời gian tính toán chấp nhận được. Đây là hướng tiếp cận phù hợp đối với các bài toán định tuyến xe có nhiều ràng buộc và có quy mô lớn.
Bên cạnh ý nghĩa về mặt nghiên cứu thuật toán, việc áp dụng metaheuristic cho bài toán định tuyến xe còn có giá trị thực tiễn trong việc hỗ trợ các doanh nghiệp giao hàng, thương mại điện tử và logistics tối ưu hóa quãng đường di chuyển, giảm chi phí nhiên liệu, giảm thời gian vận chuyển và nâng cao hiệu suất sử dụng phương tiện.
Xuất phát từ những lý do trên, đề tài **“Nghiên cứu thuật toán Metaheuristic giải bài toán định tuyến xe trong giao vận đô thị”** được lựa chọn nhằm nghiên cứu, áp dụng và đánh giá khả năng của các thuật toán metaheuristic trong việc tìm kiếm lời giải hiệu quả cho bài toán định tuyến xe trong môi trường giao vận đô thị.


#### 2. Lịch sử nghiên cứu vấn đề / Tổng quan
Bài toán định tuyến xe, hay **Vehicle Routing Problem (VRP)**, là một trong những bài toán tối ưu tổ hợp quan trọng trong lĩnh vực vận tải và logistics. Bài toán được giới thiệu từ năm **1959** bởi Dantzig và Ramser trong nghiên cứu về việc tối ưu hóa tuyến đường phân phối nhiên liệu. Từ mô hình ban đầu, VRP đã được mở rộng thành nhiều biến thể khác nhau nhằm phản ánh tốt hơn các yêu cầu thực tế của hoạt động vận tải.
Trong mô hình cơ bản, một tập phương tiện xuất phát từ một kho trung tâm và phải phục vụ một tập khách hàng với mục tiêu tối thiểu hóa tổng quãng đường hoặc chi phí vận chuyển. Từ đó, nhiều biến thể đã được nghiên cứu như **Capacitated Vehicle Routing Problem (CVRP)** với giới hạn tải trọng phương tiện, **Vehicle Routing Problem with Time Windows (VRPTW)** với ràng buộc thời gian phục vụ khách hàng, cũng như các mô hình định tuyến động, định tuyến ngẫu nhiên và định tuyến xanh.
VRP thuộc nhóm các bài toán có độ phức tạp tính toán cao. Khi số lượng khách hàng tăng, số lượng phương án tuyến đường có thể xem xét tăng rất nhanh. Vì vậy, các thuật toán chính xác như vét cạn, quy hoạch nguyên hoặc Branch and Bound có thể tìm được nghiệm tối ưu đối với những bài toán có quy mô nhỏ nhưng thường gặp khó khăn về thời gian tính toán khi kích thước bài toán tăng lớn.
Để giải quyết hạn chế này, các phương pháp **heuristic** và **metaheuristic** ngày càng được sử dụng rộng rãi. Các phương pháp heuristic thường khai thác những quy tắc cụ thể của bài toán để nhanh chóng xây dựng lời giải khả thi. Trong khi đó, metaheuristic cung cấp các chiến lược tìm kiếm tổng quát hơn, cho phép khám phá không gian nghiệm lớn và hạn chế việc mắc kẹt tại các nghiệm tối ưu cục bộ.
Nhiều thuật toán metaheuristic đã được áp dụng cho bài toán VRP, tiêu biểu như **Genetic Algorithm (GA)**, **Tabu Search (TS)**, **Simulated Annealing (SA)**, **Ant Colony Optimization (ACO)** và **Particle Swarm Optimization (PSO)**. Ngoài ra, các nghiên cứu gần đây còn tập trung vào việc kết hợp nhiều phương pháp khác nhau để xây dựng các thuật toán lai nhằm tận dụng ưu điểm của từng kỹ thuật và nâng cao chất lượng nghiệm.
Đối với **giao vận đô thị**, bài toán định tuyến trở nên phức tạp hơn do phải xem xét nhiều yếu tố thực tế như mật độ giao thông, thời gian giao hàng, tải trọng phương tiện, khoảng cách di chuyển, số lượng điểm giao nhận và sự thay đổi của điều kiện giao thông. Do đó, việc sử dụng các thuật toán metaheuristic là một hướng nghiên cứu phù hợp vì các thuật toán này có khả năng tìm được lời giải gần tối ưu trong thời gian tính toán hợp lý đối với các bài toán có không gian tìm kiếm lớn.
Từ các nghiên cứu đã có có thể thấy rằng metaheuristic đã chứng minh được khả năng giải quyết hiệu quả nhiều biến thể của VRP. Tuy nhiên, **không có một thuật toán metaheuristic duy nhất luôn đạt hiệu quả tốt nhất cho mọi trường hợp**. Chất lượng lời giải phụ thuộc vào đặc điểm dữ liệu, kích thước bài toán, các ràng buộc cũng như cách thiết kế toán tử và tham số của thuật toán. Vì vậy, việc nghiên cứu, triển khai và so sánh các thuật toán metaheuristic cho bài toán định tuyến xe trong giao vận đô thị vẫn là một hướng nghiên cứu có ý nghĩa cả về lý thuyết và thực tiễn.
##### Hướng nghiên cứu của đề tài
Trên cơ sở tổng quan các nghiên cứu trước, đề tài tập trung vào việc **nghiên cứu và áp dụng một hoặc một số thuật toán metaheuristic để giải bài toán định tuyến xe trong giao vận đô thị**, sau đó tiến hành thực nghiệm và đánh giá dựa trên các tiêu chí như:
- Tổng quãng đường di chuyển.
- Chi phí vận chuyển.
- Chất lượng lời giải.
- Thời gian thực thi thuật toán.
- Khả năng xử lý khi quy mô bài toán tăng.
Phần này sẽ giúp làm cơ sở để lựa chọn thuật toán phù hợp và tiến hành các bước nghiên cứu tiếp theo của đề tài.


###### 3. Mục đích và nhiệm vụ nghiên cứu
###### 3.1. Mục đích nghiên cứu
Đề tài hướng đến việc **nghiên cứu và áp dụng các thuật toán metaheuristic để giải bài toán định tuyến xe trong giao vận đô thị**, từ đó tìm kiếm các phương án định tuyến có chất lượng tốt trong thời gian tính toán hợp lý.
Cụ thể, nghiên cứu tập trung vào việc tối ưu một hoặc nhiều tiêu chí như **tổng quãng đường di chuyển, chi phí vận chuyển, thời gian thực hiện tuyến và hiệu quả sử dụng phương tiện**, đồng thời xem xét các ràng buộc thường gặp trong giao vận đô thị như tải trọng phương tiện, số lượng điểm giao nhận và yêu cầu phục vụ khách hàng.
Bên cạnh đó, đề tài cũng nhằm **đánh giá và so sánh hiệu quả của các thuật toán metaheuristic** thông qua thực nghiệm trên các bộ dữ liệu phù hợp, từ đó xác định phương pháp có khả năng áp dụng tốt cho bài toán được nghiên cứu.
###### 3.2. Nhiệm vụ nghiên cứu
Để đạt được mục đích trên, đề tài thực hiện các nhiệm vụ chính sau:
- Nghiên cứu cơ sở lý thuyết về bài toán **Vehicle Routing Problem (VRP)** và các biến thể liên quan đến giao vận đô thị.
- Khảo sát các phương pháp đã được sử dụng để giải VRP, đặc biệt là các thuật toán heuristic và metaheuristic.
- Xây dựng mô hình toán học cho bài toán định tuyến xe được lựa chọn, bao gồm hàm mục tiêu và các ràng buộc.
- Lựa chọn một hoặc một số thuật toán metaheuristic phù hợp để nghiên cứu và triển khai.
- Thiết kế cách biểu diễn nghiệm, phương pháp khởi tạo nghiệm và các toán tử tìm kiếm cần thiết cho thuật toán.
- Xây dựng chương trình thực nghiệm để giải bài toán.
- Thực hiện thí nghiệm trên các bộ dữ liệu có kích thước và đặc điểm khác nhau.
- Đánh giá kết quả dựa trên các tiêu chí như chất lượng nghiệm, tổng quãng đường, chi phí và thời gian thực thi.
- So sánh kết quả giữa các thuật toán hoặc với các phương pháp tham chiếu.
- Phân tích ưu điểm, hạn chế và khả năng áp dụng của phương pháp đề xuất đối với bài toán giao vận đô thị.
Bạn nên viết phần này theo hướng **“nghiên cứu thuật toán” hơn là “xây dựng ứng dụng giao hàng”**, vì trọng tâm đề tài của bạn là metaheuristic và VRP.


###### 4. Đối tượng và phạm vi nghiên cứu
###### 4.1. Đối tượng nghiên cứu
Đối tượng nghiên cứu của đề tài là **bài toán định tuyến xe trong giao vận đô thị** và các **thuật toán metaheuristic** được sử dụng để tìm kiếm lời giải cho bài toán này.
Cụ thể, đề tài tập trung nghiên cứu:
- Mô hình **Vehicle Routing Problem (VRP)** và một số biến thể phù hợp với giao vận đô thị.
- Các yếu tố ảnh hưởng đến việc xây dựng tuyến đường như số lượng khách hàng, nhu cầu giao hàng, tải trọng phương tiện, khoảng cách và thời gian di chuyển.
- Một số thuật toán metaheuristic có khả năng áp dụng cho VRP như **Genetic Algorithm, Ant Colony Optimization, Simulated Annealing, Tabu Search** hoặc các thuật toán tương tự.
- Cách biểu diễn nghiệm, xây dựng hàm mục tiêu và các toán tử tìm kiếm trong quá trình tối ưu.
- Chất lượng lời giải và hiệu năng của thuật toán khi áp dụng trên các bộ dữ liệu thử nghiệm.
###### 4.2. Phạm vi nghiên cứu
Trong phạm vi đề tài, bài toán được giới hạn nhằm tập trung vào việc nghiên cứu thuật toán thay vì mô phỏng toàn bộ hệ thống giao vận thực tế.
Đề tài chủ yếu xem xét các trường hợp:
- Có một tập khách hàng cần được phục vụ bởi một hoặc nhiều phương tiện.
- Các phương tiện xuất phát và kết thúc tại một điểm kho hoặc trung tâm phân phối.
- Mỗi khách hàng được phục vụ một lần.
- Phương tiện có giới hạn về tải trọng.
- Mục tiêu chính là **tối thiểu hóa tổng quãng đường hoặc tổng chi phí vận chuyển**.
- Các thuật toán được đánh giá bằng dữ liệu mô phỏng hoặc các bộ dữ liệu chuẩn của bài toán VRP.
Đề tài **không tập trung sâu** vào các yếu tố phức tạp ngoài phạm vi thuật toán như giao diện ứng dụng, quản lý doanh nghiệp logistics, thanh toán, quản lý tài xế hoặc hệ thống GPS thời gian thực.
Trong trường hợp có xét yếu tố giao thông đô thị, đề tài có thể sử dụng các giá trị khoảng cách hoặc thời gian di chuyển đã được xác định trước, thay vì xây dựng một hệ thống giao thông thời gian thực hoàn chỉnh.
Phạm vi như vậy sẽ giúp đề tài giữ đúng trọng tâm: **nghiên cứu và đánh giá thuật toán metaheuristic giải VRP**, thay vì bị mở rộng thành một dự án phần mềm logistics quá lớn.


###### 5. Phương pháp nghiên cứu
Để thực hiện đề tài **“Nghiên cứu thuật toán Metaheuristic giải bài toán định tuyến xe trong giao vận đô thị”**, nghiên cứu sử dụng kết hợp các phương pháp sau:
- **Phương pháp nghiên cứu tài liệu:** thu thập và tổng hợp các tài liệu liên quan đến bài toán định tuyến xe, các biến thể của VRP và các thuật toán metaheuristic đã được áp dụng trong những nghiên cứu trước.
- **Phương pháp phân tích và mô hình hóa:** phân tích đặc điểm của bài toán giao vận đô thị, xác định các yếu tố đầu vào, hàm mục tiêu và các ràng buộc để xây dựng mô hình bài toán phù hợp.
- **Phương pháp thiết kế thuật toán:** lựa chọn và xây dựng một hoặc một số thuật toán metaheuristic phù hợp với bài toán nghiên cứu; xác định cách biểu diễn nghiệm, cách khởi tạo nghiệm, hàm đánh giá và các toán tử tìm kiếm.
- **Phương pháp thực nghiệm:** cài đặt các thuật toán và tiến hành thử nghiệm trên các bộ dữ liệu chuẩn hoặc dữ liệu mô phỏng với nhiều kích thước bài toán khác nhau.
- **Phương pháp so sánh và đánh giá:** đánh giá hiệu quả của các thuật toán dựa trên các tiêu chí như tổng quãng đường, chi phí vận chuyển, chất lượng nghiệm, thời gian tính toán và khả năng xử lý khi quy mô bài toán tăng.
- **Phương pháp thống kê:** thực hiện thuật toán nhiều lần trên cùng một bộ dữ liệu để giảm ảnh hưởng của tính ngẫu nhiên, sau đó phân tích các giá trị như nghiệm tốt nhất, nghiệm trung bình và độ ổn định của kết quả.
Thông qua các phương pháp trên, đề tài hướng đến việc đánh giá một cách khách quan khả năng của các thuật toán metaheuristic trong việc giải bài toán định tuyến xe trong giao vận đô thị.


###### 6. Giả thuyết khoa học
Đề tài đặt ra giả thuyết rằng việc áp dụng các **thuật toán metaheuristic** có thể tìm được các phương án định tuyến xe có chất lượng tốt trong thời gian tính toán hợp lý đối với bài toán giao vận đô thị, đặc biệt khi kích thước bài toán lớn và các phương pháp tìm kiếm chính xác gặp khó khăn về chi phí tính toán.
Cụ thể, giả thuyết nghiên cứu được xác định như sau:
- Các thuật toán metaheuristic có khả năng tìm được nghiệm gần tối ưu cho bài toán định tuyến xe trong thời gian ngắn hơn so với các phương pháp tìm kiếm chính xác khi quy mô bài toán tăng.
- Việc thiết kế phù hợp cách biểu diễn nghiệm, hàm đánh giá và các toán tử tìm kiếm có thể cải thiện đáng kể chất lượng nghiệm của thuật toán.
- Mỗi thuật toán metaheuristic có ưu điểm và hạn chế riêng; hiệu quả của thuật toán phụ thuộc vào kích thước bài toán, đặc điểm dữ liệu và các ràng buộc của bài toán.
- Việc điều chỉnh tham số hoặc kết hợp các kỹ thuật tìm kiếm cục bộ có thể giúp thuật toán tránh rơi vào tối ưu cục bộ và nâng cao khả năng tìm kiếm nghiệm tốt.
- Các thuật toán metaheuristic phù hợp có thể giúp giảm tổng quãng đường, chi phí vận chuyển hoặc thời gian thực hiện tuyến so với các phương pháp xây dựng tuyến đơn giản.
Từ đó, đề tài sẽ tiến hành thực nghiệm để kiểm chứng giả thuyết thông qua việc so sánh **chất lượng nghiệm, thời gian thực thi và độ ổn định của thuật toán** trên các bộ dữ liệu thử nghiệm khác nhau.


###### 7. Những đóng góp mới của đề tài
Những đóng góp dự kiến của đề tài tập trung vào việc **nghiên cứu, triển khai và đánh giá thuật toán metaheuristic cho bài toán định tuyến xe trong giao vận đô thị**, cụ thể như sau:
- Xây dựng mô hình bài toán định tuyến xe phù hợp với bối cảnh giao vận đô thị, có xét đến các yếu tố như số lượng khách hàng, tải trọng phương tiện, khoảng cách và chi phí vận chuyển.
- Áp dụng và triển khai một hoặc một số thuật toán metaheuristic để giải bài toán VRP, từ đó đánh giá khả năng tìm kiếm nghiệm gần tối ưu trong thời gian hợp lý.
- Thiết kế hoặc điều chỉnh cách biểu diễn nghiệm, hàm đánh giá và các toán tử tìm kiếm nhằm phù hợp hơn với đặc điểm của bài toán định tuyến xe được nghiên cứu.
- Thực hiện so sánh thực nghiệm giữa các thuật toán metaheuristic dựa trên các tiêu chí như **tổng quãng đường, chất lượng nghiệm, thời gian thực thi và độ ổn định**.
- Phân tích ảnh hưởng của các tham số thuật toán và quy mô dữ liệu đến hiệu quả tìm kiếm lời giải.
- Đề xuất hướng cải tiến thuật toán, chẳng hạn như kết hợp metaheuristic với tìm kiếm cục bộ hoặc xây dựng thuật toán lai, nhằm nâng cao chất lượng nghiệm và khả năng hội tụ.
Nếu đề tài của bạn **chỉ áp dụng và so sánh các thuật toán có sẵn**, thì nên gọi phần này là **“Đóng góp của đề tài”** thay vì khẳng định mạnh là “đóng góp mới”, vì “đóng góp mới” thường nên có một cải tiến thuật toán, mô hình mới, cách lai mới hoặc kết quả thực nghiệm mới rõ ràng.