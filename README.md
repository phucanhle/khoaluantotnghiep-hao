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
e:\Projects\outsource\ (Thư mục dự án)
├── data/                 # Thư mục dữ liệu cào được
│   ├── images/           # Ảnh mẫu sản phẩm cục bộ
│   ├── lipsticks.csv     # Dữ liệu xuất dạng CSV
│   ├── lipsticks.json    # Dữ liệu xuất dạng JSON
│   └── lipsticks.sql     # Dữ liệu xuất dạng SQL MySQL
├── static/               # Các tài nguyên tĩnh phục vụ web
│   ├── css/
│   │   └── styles.css    # Thiết kế phong cách và bố cục Glassmorphism cao cấp
│   ├── js/
│   │   ├── app.js        # Logic tương tác trang chủ, giỏ hàng và gợi ý màu
│   │   ├── ar-tryon.js   # Module xử lý camera WebRTC và bộ lọc son môi AR canvas
│   │   └── mediapipe/    # Bộ mô hình AI FaceMesh cục bộ phục vụ chạy offline
│   │       ├── face_mesh.js
│   │       ├── face_mesh.binarypb
│   │       └── ... (các file WASM và dữ liệu mô hình FaceMesh)
│   └── images/           # Ảnh thực tế của các dòng son
├── templates/            # Các tệp giao diện HTML mẫu (Flask Jinja2)
│   ├── base.html         # Khung giao diện chung của ứng dụng
│   ├── index.html        # Trang chủ bảng điều khiển
│   ├── shop.html         # Trang mua sắm bộ lọc son nâng cao
│   ├── product.html      # Trang chi tiết sản phẩm tích hợp Gương thử AR
│   ├── cart.html         # Giỏ hàng mua sắm giả lập
│   ├── profile.html      # Trang tài khoản cá nhân & Trắc nghiệm Personal Color
│   └── admin.html        # Trang quản trị phân tích số liệu hệ thống
├── database.py           # Module kết nối cơ sở dữ liệu (Hỗ trợ MySQL hoặc SQLite tự động)
├── server.py             # Máy chủ Flask trung tâm điều phối toàn bộ ứng dụng web
├── recommendation.py     # Module AI gợi ý màu son dựa trên cá nhân hóa
├── scrape.py             # Script cào, xử lý màu & phân tích dupe
├── apply_real_images.py  # Script cập nhật ảnh thật thay thế ảnh vector mặc định
├── requirements.txt      # Danh sách thư viện Python phụ thuộc
└── README.md             # Hướng dẫn kỹ thuật thuyết minh KLTN này
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

## 3. Hướng Dẫn Vận Hành & Cài Đặt Hệ Thống (Môi trường khác từ Git)

Làm theo các bước sau để thiết lập dự án hoạt động trên máy tính mới:

### Bước 1: Chuẩn bị mã nguồn
Clone dự án từ GitHub và di chuyển vào thư mục dự án:
```bash
git clone https://github.com/phucanhle/lipstick-ecommerce.git
cd lipstick-ecommerce
```

### Bước 2: Cài đặt và cấu hình Python
Hệ thống yêu cầu cài đặt **Python 3.8+** (khuyên dùng Python 3.10 hoặc 3.11).
1. Khởi tạo môi trường ảo (Virtual Environment) để quản lý các gói thư viện sạch sẽ:
   ```powershell
   python -m venv venv
   ```
2. Kích hoạt môi trường ảo:
   * **Windows PowerShell**:
     ```powershell
     .\venv\Scripts\activate
     ```
   * **Linux/macOS**:
     ```bash
     source venv/bin/activate
     ```
3. Cài đặt các thư viện bắt buộc trong `requirements.txt`:
   ```bash
   pip install -r requirements.txt
   ```

*(Lưu ý: Nếu bạn muốn chạy lại script cào dữ liệu `scrape.py` bằng Playwright, bạn cần cài đặt thêm các nhân trình duyệt bằng lệnh: `playwright install`).*

### Bước 3: Cấu hình Cơ Sở Dữ Liệu (Hệ thống Hybrid DB)
Hệ thống được thiết kế linh hoạt hỗ trợ cả MySQL và SQLite tự động:
* **Tự động chuyển đổi (SQLite Fallback)**: Mặc định, nếu hệ thống phát hiện không có cơ sở dữ liệu MySQL chạy trên `localhost:3306`, nó sẽ **tự động chuyển sang sử dụng SQLite** (tạo file tại [data/lipsticks.db](file:///e:/Projects/outsource/data/lipsticks.db)), tự sinh toàn bộ cấu trúc bảng và nạp dữ liệu mẫu vào thỏi son. Bạn **không cần** thực hiện cấu hình phức tạp nào.
* **Cấu hình MySQL (Nếu muốn chạy trên server MySQL)**:
  1. Đảm bảo dịch vụ MySQL đang chạy trên cổng mặc định `3306`.
  2. Mở file [database.py](file:///e:/Projects/outsource/database.py) và cập nhật thông số tài khoản đăng nhập (Host, Port, User, Password) trong biến `DB_CONFIG` ở đầu file.
  3. Hệ thống sẽ tự động tạo cơ sở dữ liệu `kltn_lipsticks` và khởi tạo toàn bộ bảng khi server khởi chạy lần đầu.

### Bước 4: Khởi chạy máy chủ Web Flask
Ứng dụng sử dụng Flask để xử lý backend, kết nối cơ sở dữ liệu và cung cấp API.

* **Chạy thử nghiệm trên máy tính nội bộ (Localhost Only)**:
  ```powershell
  python server.py
  ```
  Truy cập vào ứng dụng tại: `http://127.0.0.1:5000`

* **Chạy thử nghiệm trên điện thoại / Thiết bị khác trong mạng LAN (HTTPS bắt buộc)**:
  Công nghệ camera WebRTC trên các trình duyệt hiện đại bắt buộc phải chạy dưới **Secure Context (HTTPS)** thì mới được phép bật camera. Flask đã tích hợp cơ chế tự ký chứng chỉ SSL (adhoc SSL):
  ```powershell
  python server.py --https
  ```
  1. Khi chạy lệnh này, màn hình sẽ hiển thị địa chỉ IP máy tính của bạn trong mạng LAN (ví dụ: `https://192.168.2.2:5000`).
  2. Đảm bảo điện thoại của bạn kết nối **cùng một mạng Wi-Fi** với máy tính.
  3. Truy cập địa chỉ IP đó trên điện thoại. Trình duyệt di động sẽ hiển thị cảnh báo chứng chỉ tự ký không an toàn (Not Secure / Connection not private).
  4. Bạn hãy bấm vào nút **"Nâng cao" (Advanced)** -> chọn **"Tiếp tục truy cập (Không an toàn)" (Proceed to... / Visit this website)** để bỏ qua cảnh báo bảo mật.
  5. Click **"Kích Hoạt Camera"** trên điện thoại để trải nghiệm gương thử son AR.

---

## 4. Các Tài Khoản Mặc Định & Chức Năng Quản Trị

* **Tài khoản quản trị viên (Admin Dashboard)**:
  * **Tên đăng nhập**: `admin`
  * **Mật khẩu**: `admin123`
  * Chức năng: Đăng nhập tại trang tài khoản để truy cập giao diện quản trị Admin, trực quan hóa biểu đồ doanh thu, cơ cấu phân khúc son, xuất các báo cáo SQL/JSON/CSV để phục vụ thuyết minh khóa luận tốt nghiệp.
* **Bảo mật Secret Key**:
  Hệ thống bảo mật Session của Flask bằng biến môi trường `FLASK_SECRET_KEY` nhằm vượt qua các bộ kiểm tra mã độc GitHub (GitGuardian). Nếu biến này không được thiết lập, server sẽ tự động sinh mã khóa ngẫu nhiên mới mỗi lần khởi động. Để cố định Session trong môi trường production, bạn có thể thiết lập biến môi trường trước khi chạy:
  * Windows PowerShell: `$env:FLASK_SECRET_KEY="your_custom_secret_key"`
  * Linux/macOS: `export FLASK_SECRET_KEY="your_custom_secret_key"`

---

## 5. Tạo Dữ Liệu Huấn Luyện Gợi Ý (Recommendation System Addon)

Hệ thống tích hợp sẵn mô-đun **Bộ Thu Thập & Tạo Dữ Liệu Huấn Luyện** tương tác trực tiếp trên Dashboard của người dùng:
* **Tính năng Thu Thập Thủ Công**: Người dùng điền thông tin hồ sơ cá nhân và đánh giá xếp hạng (1-5 sao) cho 6 thỏi son ngẫu nhiên bên phải, nhấn **"Thêm mẫu thử"** để lưu trữ.
* **Tính năng Giả Lập Tự Động (Synthetic Data Generator)**: Click **"Tự động tạo 100 mẫu"** để lập tức giả lập 100 hồ sơ người dùng thực tế. Thuật toán giả lập tự động áp dụng các quy tắc chuyên gia sắc đẹp (Beauty Rules) thực tế để gán điểm đánh giá.
* **Xuất tập dữ liệu huấn luyện**: Bạn có thể xuất tập dữ liệu thu thập được ra file JSON (`recommendation_training_data.json`) hoặc CSV phẳng (`recommendation_training_data.csv`). File CSV được chuẩn hóa hoàn hảo để nạp trực tiếp vào các mô hình học máy gợi ý (ví dụ: Collaborative Filtering sử dụng thư viện `scikit-surprise` của Python).

