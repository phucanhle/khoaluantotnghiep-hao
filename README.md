# Hướng Dẫn Kỹ Thuật - Hệ Thống Cào Dữ Liệu & Chuẩn Hóa Màu Sắc Son Môi (KLTN)

Tài liệu này thuyết minh về kiến trúc kỹ thuật, cơ sở toán học xử lý không gian màu và hướng dẫn vận hành hệ thống cào dữ liệu son môi tự động cho 8 thương hiệu: **Dior, YSL, Tom Ford, Gucci, MAC, Hermes, BlackRouge, và Romand** (50+ sản phẩm). Hệ thống được thiết kế hoàn chỉnh phục vụ cho Khóa luận tốt nghiệp (KLTN).

---

## 1. Kiến Trúc Kỹ Thuật Hệ Thống

Dự án sử dụng mô hình kết hợp (Hybrid Architecture) chia làm hai thành phần chính độc lập:
1. **Bộ cào dữ liệu & Bộ xử lý màu sắc (Python Backend)**: 
   - Đảm nhiệm việc truy cập tự động vào các website chính hãng để lấy thông tin sản phẩm và tải ảnh cục bộ.
   - Chuyển đổi tọa độ màu và chạy thuật toán so khớp màu son dupe bằng toán học.
2. **Bảng điều khiển trực quan hóa tương tác (Frontend Dashboard)**:
   - Sử dụng ngôn ngữ HTML5, CSS3 Glassmorphism sang trọng và Vanilla JavaScript để lọc đa tiêu chí và hiển thị kết quả trực quan dạng đồ họa.
   - Có khả năng chạy ngoại tuyến (Offline) 100% nhờ bộ nhớ đệm hình ảnh cục bộ, đảm bảo không gặp bất kỳ sự cố kết nối nào khi trình bày trước hội đồng khóa luận.

```
e:\KLTN\
├── data/
│   ├── images/         # Thư mục lưu trữ hình ảnh sản phẩm tải về máy cục bộ
│   ├── lipsticks.json  # Cơ sở dữ liệu chính dạng cấu trúc JSON đã chuẩn hóa màu
│   ├── lipsticks.csv   # Bảng Excel phẳng phục vụ phân tích số liệu khóa luận
│   └── lipsticks.sql   # Script SQL chứa câu lệnh INSERT dữ liệu nhúng sẵn ảnh Base64
├── scrape.py           # Script chính cào dữ liệu, xử lý màu & tìm bản dupe
├── requirements.txt    # Danh sách thư viện Python phụ thuộc
├── index.html          # Giao diện Web Dashboard trực quan tiếng Việt
├── styles.css          # Định dạng phong cách giao diện tối (Dark Mode) Glassmorphism
├── app.js              # Xử lý logic tương tác lọc, tìm kiếm và phân tích dupe trên web
└── README.md           # Hướng dẫn kỹ thuật thuyết minh KLTN này
```

---

## 2. Cơ Sở Toán Học Phân Tích Không Gian Màu (Tư liệu viết KLTN)

Để chuẩn hóa mã màu son thu thập từ ảnh hoặc swatch CSS, hệ thống áp dụng các phép biến đổi toán học chặt chẽ giữa các không gian màu.

### A. Chuyển đổi RGB sang HSL (Hue, Saturation, Lightness)
Hệ màu HSL giúp phân loại nhóm màu son dựa trên góc màu H (0°–360°) đại diện cho sắc thái màu (Đỏ, Hồng, Cam, Mận...).
Cho các giá trị $R, G, B \in [0, 1]$. Đặt $Max = \max(R, G, B)$ và $Min = \min(R, G, B)$, $\Delta = Max - Min$.

* **Độ sáng (Lightness - L)**:
  $$L = \frac{Max + Min}{2}$$

* **Độ bão hòa (Saturation - S)**:
  $$S = \begin{cases} 0 & \text{nếu } \Delta = 0 \\ \frac{\Delta}{Max + Min} & \text{nếu } L < 0.5 \\ \frac{\Delta}{2.0 - Max - Min} & \text{nếu } L \ge 0.5 \end{cases}$$

* **Tông màu (Hue - H)**:
  $$H = \begin{cases} 0 & \text{nếu } \Delta = 0 \\ 60^\circ \times \left(\frac{G - B}{\Delta} \bmod 6\right) & \text{nếu } Max = R \\ 60^\circ \times \left(\frac{B - R}{\Delta} + 2\right) & \text{nếu } Max = G \\ 60^\circ \times \left(\frac{R - G}{\Delta} + 4\right) & \text{nếu } Max = B \end{cases}$$

### B. Chuyển đổi sRGB sang XYZ (Linearized XYZ)
Không gian sRGB mặc định của màn hình là phi tuyến tính (được nén gamma). Để chuyển sang CIELAB, trước tiên ta phải tuyến tính hóa các kênh màu và chuyển sang không gian trung gian CIE XYZ 1931:

1. **Tuyến tính hóa các kênh sRGB (Gamma correction removal)**:
   Với $C_{sRGB} \in [R, G, B]$ chia cho $255$:
   $$C_{linear} = \begin{cases} \frac{C_{sRGB}}{12.92} & \text{nếu } C_{sRGB} \le 0.04045 \\ \left(\frac{C_{sRGB} + 0.055}{1.055}\right)^{2.4} & \text{nếu } C_{sRGB} > 0.04045 \end{cases}$$

2. **Nhân ma trận chuyển đổi sRGB sang XYZ (Dựa trên nguồn sáng chuẩn D65)**:
   $$\begin{bmatrix} X \\ Y \\ Z \end{bmatrix} = \begin{bmatrix} 0.4124 & 0.3576 & 0.1805 \\ 0.2126 & 0.7152 & 0.0722 \\ 0.0193 & 0.1192 & 0.9505 \end{bmatrix} \times \begin{bmatrix} R_{linear} \\ G_{linear} \\ B_{linear} \end{bmatrix}$$

### C. Chuyển đổi XYZ sang CIELAB (L* a* b*)
Không gian CIELAB được thiết kế nhằm đạt độ đồng nhất về mặt cảm nhận thị giác (Perceptually Uniform), tức là khoảng cách toán học giữa hai điểm màu tỷ lệ thuận với sự khác biệt màu mà mắt người cảm nhận được. Điều này vượt trội hoàn toàn so với việc so sánh màu trong không gian RGB.

Chuẩn hóa XYZ với điểm trắng D65 ($X_n = 0.95047$, $Y_n = 1.00000$, $Z_n = 1.08883$):
$$x_r = \frac{X}{X_n}, \quad y_r = \frac{Y}{Y_n}, \quad z_r = \frac{Z}{Z_n}$$

Định nghĩa hàm phi tuyến $f(t)$:
$$f(t) = \begin{cases} t^{1/3} & \text{nếu } t > 0.008856 \\ 7.787t + \frac{16}{116} & \text{nếu } t \le 0.008856 \end{cases}$$

Tọa độ màu CIELAB được tính bằng:
$$L^* = 116 \times f(y_r) - 16$$
$$a^* = 500 \times \left(f(x_r) - f(y_r)\right)$$
$$b^* = 200 \times \left(f(y_r) - f(z_r)\right)$$
*(Trong đó: $L^*$ là độ sáng từ 0–100; $a^*$ chỉ mức độ chuyển từ xanh lá sang đỏ; $b^*$ chỉ mức độ chuyển từ xanh dương sang vàng).*

### D. Thuật toán Tính Khoảng Cách Khác Biệt Màu Sắc Delta-E (CIE76)
Để tìm ra cây son bình dân (đối chiếu) giống màu nhất với cây son xa xỉ gốc, ta áp dụng công thức **Khoảng cách hình học Euclid Delta-E ($\Delta E^*$)** giữa hai tọa độ màu CIELAB $(L^*_1, a^*_1, b^*_1)$ và $(L^*_2, a^*_2, b^*_2)$:

$$\Delta E^* = \sqrt{(L^*_1 - L^*_2)^2 + (a^*_1 - a^*_2)^2 + (b^*_1 - b^*_2)^2}$$

* **Định mức đánh giá thị giác của mắt người (Theo CIE)**:
  - $\Delta E^* < 1.0$: Mắt người không thể phát hiện sự khác biệt.
  - $1.0 \le \Delta E^* < 2.0$: Sự khác biệt cực nhỏ, chỉ các chuyên gia màu sắc giàu kinh nghiệm mới nhận ra.
  - $2.0 \le \Delta E^* < 3.5$: Người bình thường có thể phát hiện sự khác biệt nếu đặt hai thỏi son cạnh nhau.
  - $\Delta E^* \ge 3.5$: Sự khác biệt rõ ràng, dễ dàng nhìn thấy ở mọi góc độ.

* **Công thức Quy đổi Tỷ lệ tương đồng (%)** phục vụ hiển thị trực quan trên giao diện:
  $$\text{Độ Tương Đồng (\%)} = \max\left(0, 100 - (\Delta E^* \times 3.5)\right)$$
  *(Đảm bảo khi hai màu trùng khít, độ tương đồng đạt 100%. Nếu khoảng cách màu càng lớn thì độ tương đồng giảm dần).*

---

## 3. Hướng Dẫn Vận Hành Hệ Thống

### Bước 1: Cài đặt môi trường Python
Hệ thống yêu cầu cài đặt Python 3.8 trở lên. Mở PowerShell trong thư mục dự án và thực hiện cài đặt các thư viện cần thiết:
```powershell
pip install -r requirements.txt
```

Nếu bạn muốn chạy cào dữ liệu động qua trình duyệt Playwright, hãy cài đặt các trình duyệt đi kèm:
```powershell
playwright install
```

### Bước 2: Chạy script cào & xử lý chuẩn hóa dữ liệu son
Chạy script Python để bắt đầu quy trình cào dữ liệu, xử lý không gian màu Lab/HSL, ghép cặp son dupe và tự động tải hình ảnh về máy:
```powershell
python scrape.py
```
Sau khi chạy xong, trong thư mục dự án sẽ tự động xuất hiện:
- Thư mục `data/images/` chứa toàn bộ tệp ảnh tải về.
- File `data/lipsticks.json` chứa dữ liệu cấu trúc chi tiết dùng cho dashboard.
- File `data/lipsticks.csv` chứa bảng dữ liệu phẳng dạng Excel để làm báo cáo KLTN.
- File `data/lipsticks.sql` chứa mã lệnh SQL INSERT nhúng ảnh Base64 sẵn để nạp dữ liệu thẳng vào DB.

### Bước 3: Mở Bảng điều khiển Web Dashboard
Bạn chỉ cần mở trực tiếp file `index.html` bằng bất kỳ trình duyệt web hiện đại nào (Chrome, Edge, Firefox, Safari) để hiển thị giao diện:
- Nhấp đúp chuột vào file `index.html` hoặc mở bằng trình duyệt.
- Bạn có thể lọc danh sách theo hãng (8 hãng), theo nhóm màu đã chuẩn hóa (Đỏ, Hồng, Cam, Nude...), theo phân khúc giá hoặc nhập văn bản tìm kiếm nhanh.
- Nhấp vào nút **"PHÂN TÍCH BẢN DUPE"** dưới bất kỳ thỏi son xa xỉ nào, hoặc nhấp vào chấm tròn màu trên **Bảng quang phổ Swatch Wall** để xem bảng đối chiếu song song và phân tích các chỉ số màu sắc toán học chi tiết.
- Sử dụng các nút **"Xuất file JSON"**, **"Xuất file CSV"** và **"Xuất file SQL (Nhúng Base64)"** ở góc dưới giao diện để tải các tệp dữ liệu về máy nhanh chóng.

---

## 4. Bộ Thu Thập & Tạo Dữ Liệu Huấn Luyện Gợi Ý (KLTN Addon)

Để huấn luyện một hệ thống gợi ý (Recommendation System) cho khóa luận tốt nghiệp, hệ thống tích hợp sẵn mô-đun **Bộ Thu Thập & Tạo Dữ Liệu Huấn Luyện** tương tác trực tiếp trên Dashboard:

* **Tính năng Thu Thập Thủ Công**:
  - Người dùng điền thông tin hồ sơ (Tông da, Sắc tố phụ Undertone, Màu sắc cá nhân, Chất son ưa thích).
  - Đánh giá xếp hạng (1-5 sao) cho 6 thỏi son ngẫu nhiên bên phải.
  - Click **"Thêm mẫu thử"** để đóng gói thành 1 bản ghi dữ liệu huấn luyện.
* **Tính năng Giả Lập Tự Động (Synthetic Data Generator)**:
  - Click **"Tự động tạo 100 mẫu"** để lập tức giả lập 100 hồ sơ người dùng thực tế.
  - Thuật toán giả lập tự động áp dụng các quy tắc chuyên gia sắc đẹp (Beauty Rules) thực tế để gán điểm đánh giá (1-5 sao) cho son (ví dụ: người có sắc tố da Ấm/Warm sẽ ưu tiên đánh giá cao các màu đỏ đất/cam/san hô, da Sáng/Fair sẽ đánh giá cao tone hồng ngọt...).
* **Xuất tập dữ liệu huấn luyện**:
  - Bạn có thể xuất tập dữ liệu huấn luyện thu thập được ra file JSON (`recommendation_training_data.json`) hoặc CSV phẳng (`recommendation_training_data.csv`).
  - File CSV được chuẩn hóa hoàn hảo để nạp trực tiếp vào các thuật toán gợi ý của Python (như Collaborative Filtering sử dụng thư viện `scikit-surprise` hoặc các mô hình học sâu PyTorch/TensorFlow).

