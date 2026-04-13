# Function List — generate-cv

> Danh sách đầy đủ các chức năng của hệ thống, bao gồm API backend và màn hình / component frontend.

---

## Backend API — Endpoints

### Auth — `/api/v1/auth`

| Method | Endpoint | Chức năng | Auth required |
|---|---|---|---|
| POST | `/auth/register` | Đăng ký tài khoản mới bằng email + password | ❌ |
| POST | `/auth/login` | Đăng nhập, trả về JWT access token + refresh token | ❌ |
| POST | `/auth/logout` | Hủy refresh token | ✅ |
| POST | `/auth/refresh` | Lấy access token mới từ refresh token | ❌ |
| GET | `/auth/google` | Redirect đến Google OAuth2 | ❌ |
| GET | `/auth/google/callback` | Xử lý callback từ Google, tạo session | ❌ |
| POST | `/auth/forgot-password` | Gửi email reset password | ❌ |
| POST | `/auth/reset-password` | Đặt lại password bằng token từ email | ❌ |

---

### User — `/api/v1/users`

| Method | Endpoint | Chức năng | Auth required |
|---|---|---|---|
| GET | `/users/me` | Lấy thông tin tài khoản hiện tại | ✅ |
| PATCH | `/users/me` | Cập nhật tên, avatar | ✅ |
| DELETE | `/users/me` | Xóa tài khoản | ✅ |
| GET | `/users/me/subscription` | Lấy thông tin gói đang dùng, ngày hết hạn | ✅ |

---

### CV — `/api/v1/cvs`

| Method | Endpoint | Chức năng | Auth required |
|---|---|---|---|
| GET | `/cvs` | Lấy danh sách CV của user hiện tại | ✅ |
| POST | `/cvs` | Tạo CV mới (từ template hoặc blank) | ✅ |
| GET | `/cvs/:id` | Lấy nội dung chi tiết 1 CV | ✅ |
| PATCH | `/cvs/:id` | Lưu nội dung CV (auto-save) | ✅ |
| DELETE | `/cvs/:id` | Xóa CV | ✅ |
| POST | `/cvs/:id/duplicate` | Nhân bản CV | ✅ |
| POST | `/cvs/:id/export` | Tạo job export PDF, trả về job ID | ✅ |
| GET | `/cvs/:id/export/:jobId` | Kiểm tra trạng thái export, lấy URL download | ✅ |

---

### Template — `/api/v1/templates`

| Method | Endpoint | Chức năng | Auth required |
|---|---|---|---|
| GET | `/templates` | Lấy danh sách template (free + premium) | ❌ |
| GET | `/templates/:id` | Lấy chi tiết 1 template | ❌ |

---

### AI — `/api/v1/ai`

| Method | Endpoint | Chức năng | Auth required |
|---|---|---|---|
| POST | `/ai/suggest-summary` | Gợi ý mục "Giới thiệu bản thân" dựa trên thông tin user nhập | ✅ Có gói |
| POST | `/ai/suggest-experience` | Gợi ý mô tả kinh nghiệm làm việc cho 1 vị trí | ✅ Có gói |
| POST | `/ai/analyze-jd` | Phân tích Job Description, trả về từ khóa và gợi ý chỉnh CV | ✅ Có gói |
| POST | `/ai/rewrite-section` | Viết lại 1 đoạn văn trong CV chuyên nghiệp hơn | ✅ Có gói |

---

### Payment — `/api/v1/payment`

| Method | Endpoint | Chức năng | Auth required |
|---|---|---|---|
| POST | `/payment/create` | Tạo link thanh toán VNPay hoặc MoMo, trả về URL redirect | ✅ |
| GET | `/payment/vnpay/callback` | Xử lý redirect callback từ VNPay sau khi thanh toán | ❌ |
| POST | `/payment/momo/webhook` | Nhận IPN webhook từ MoMo, kích hoạt subscription | ❌ |
| GET | `/payment/history` | Lấy lịch sử giao dịch của user | ✅ |

---

### Webhook — `/api/v1/webhook`

| Method | Endpoint | Chức năng | Auth required |
|---|---|---|---|
| POST | `/webhook/vnpay` | Nhận server-to-server IPN từ VNPay | ❌ (HMAC verify) |
| POST | `/webhook/momo` | Nhận server-to-server IPN từ MoMo | ❌ (signature verify) |

---

## Backend — Background Jobs (Asynq)

| Job | Trigger | Chức năng |
|---|---|---|
| `pdf:export` | Khi user bấm Export PDF | Dùng go-rod render CV thành PDF, upload lên GCS, trả URL |
| `email:welcome` | Sau khi đăng ký thành công | Gửi email chào mừng + hướng dẫn tạo CV đầu tiên |
| `email:payment_success` | Sau khi webhook payment xác nhận | Gửi email xác nhận đã kích hoạt gói, ngày hết hạn |
| `email:subscription_expiring` | Cron 1 ngày / lần | Gửi email nhắc nhở user 3 ngày trước khi hết gói |
| `email:cv_reminder` | Cron 30 ngày / lần | Gửi email nhắc user cập nhật CV — giảm churn |
| `subscription:expire` | Cron 1 giờ / lần | Kiểm tra và hạ cấp tài khoản hết hạn xuống Free |

---

## Frontend — Màn hình & Chức năng

### Landing Page `/`

| Component | Chức năng |
|---|---|
| `HeroSection` | Headline, CTA "Tạo CV miễn phí", preview CV mẫu |
| `TemplateShowcase` | Hiển thị 3–4 template nổi bật |
| `FeatureSection` | Giải thích AI features, export PDF |
| `PricingSection` | Bảng so sánh gói Free / Tuần / Tháng |
| `TestimonialSection` | Review người dùng |
| `Footer` | Link điều khoản, liên hệ |

---

### Auth `/login` · `/register`

| Component | Chức năng |
|---|---|
| `LoginForm` | Đăng nhập email/password + nút Google OAuth |
| `RegisterForm` | Đăng ký email/password, validate realtime |
| `ForgotPasswordForm` | Nhập email để nhận link reset |
| `ResetPasswordForm` | Đặt mật khẩu mới từ link email |

---

### Dashboard `/dashboard`

| Component | Chức năng |
|---|---|
| `CVList` | Danh sách CV của user dạng card, sắp xếp theo ngày chỉnh sửa |
| `CVCard` | Thumbnail preview, tên CV, ngày sửa, menu: Sửa / Nhân bản / Xóa |
| `CreateCVButton` | Nút tạo CV mới, redirect đến chọn template |
| `SubscriptionBanner` | Hiển thị gói hiện tại, ngày hết hạn, nút Nâng cấp |

---

### Chọn Template `/cv/new`

| Component | Chức năng |
|---|---|
| `TemplateGallery` | Grid tất cả template, filter theo màu / ngành nghề |
| `TemplateCard` | Thumbnail, nhãn "Free" / "Premium", nút Dùng template này |
| `TemplatePreviewModal` | Xem full-size template trước khi chọn |

---

### CV Editor `/cv/[id]`

| Component | Chức năng |
|---|---|
| `EditorLayout` | Layout 2 cột: panel chỉnh sửa (trái) + preview (phải) |
| `EditorPanel` | Danh sách section, kéo thả thứ tự, thêm / xóa section |
| `SectionBlock` | Form chỉnh sửa từng section (Thông tin, Kinh nghiệm, Học vấn, …) |
| `RichTextEditor` | Textarea với markdown cơ bản cho mô tả công việc |
| `CVPreview` | Render CV real-time theo template đã chọn |
| `AIAssistPanel` | Sidebar gợi ý AI: phân tích JD, gợi ý câu, viết lại đoạn văn |
| `JDInputModal` | Textarea dán Job Description vào để AI phân tích |
| `ExportButton` | Nút export PDF — kiểm tra subscription, hiện paywall nếu Free |
| `PaywallModal` | Modal hiện khi user Free bấm export — CTA mua gói |
| `AutoSaveIndicator` | Trạng thái "Đang lưu…" / "Đã lưu" ở header |
| `TemplateSelector` | Dropdown đổi template mà không mất nội dung |
| `ColorThemePicker` | Chọn màu chủ đạo cho template |

---

### Pricing `/pricing`

| Component | Chức năng |
|---|---|
| `PricingTable` | So sánh 3 gói Free / Tuần / Tháng chi tiết |
| `PricingCard` | Từng gói với CTA, highlight gói Tháng là "Phổ biến nhất" |
| `PaymentMethodSelector` | Chọn VNPay hoặc MoMo |
| `CheckoutModal` | Tóm tắt đơn hàng, confirm, redirect đến cổng thanh toán |
| `PaymentSuccessPage` | Màn hình cảm ơn sau khi thanh toán thành công |

---

### Settings `/settings`

| Component | Chức năng |
|---|---|
| `ProfileForm` | Chỉnh sửa tên, avatar |
| `ChangePasswordForm` | Đổi mật khẩu |
| `SubscriptionInfo` | Gói hiện tại, ngày hết hạn, lịch sử thanh toán |
| `DangerZone` | Nút xóa tài khoản |

---

## Zustand Stores

| Store | State quản lý |
|---|---|
| `authStore` | user, accessToken, isLoggedIn, subscription |
| `editorStore` | cvData, selectedTemplate, colorTheme, isDirty, isSaving |
| `uiStore` | sidebarOpen, activeModal, notifications |

---

## Middleware Backend

| Middleware | Chức năng |
|---|---|
| `AuthJWT` | Validate Bearer token, inject user vào context |
| `RequireSubscription` | Chặn endpoint AI / export nếu user không có gói active |
| `RateLimit` | Giới hạn request: AI endpoint 20 req/phút/user |
| `CORS` | Chỉ cho phép origin từ domain frontend |
| `RequestLogger` | Log method, path, status, latency |
| `Recover` | Bắt panic, trả 500 thay vì crash server |

---

*Cập nhật: Tháng 4/2026*
