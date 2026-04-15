// Package email provides email-sending utilities via Resend (https://resend.com).
package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"time"
)

const resendSendURL = "https://api.resend.com/emails"

// ResendSender sends transactional emails using the Resend HTTP API.
// Satisfies service.EmailSender interface.
type ResendSender struct {
	apiKey  string
	from    string
	appName string
	appURL  string
	client  *http.Client
}

// NewResendSender creates a production-ready Resend email sender.
//   - apiKey  : Resend API key (re_xxx...)
//   - from    : verified sender address e.g. "CV Generator <noreply@yourdomain.com>"
//   - appName : displayed in email body e.g. "CV Generator"
//   - appURL  : base URL of frontend e.g. "https://yourdomain.com"
func NewResendSender(apiKey, from, appName, appURL string) *ResendSender {
	return &ResendSender{
		apiKey:  apiKey,
		from:    from,
		appName: appName,
		appURL:  appURL,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// ─── SendPasswordReset ───────────────────────────────────────────────────────

// SendPasswordReset sends a beautifully formatted HTML reset-password email.
func (r *ResendSender) SendPasswordReset(ctx context.Context, toEmail, resetToken string) error {
	resetURL := fmt.Sprintf("%s/reset-password?token=%s", r.appURL, resetToken)

	html, err := renderPasswordResetHTML(passwordResetData{
		AppName:  r.appName,
		AppURL:   r.appURL,
		ResetURL: resetURL,
		ToEmail:  toEmail,
	})
	if err != nil {
		return fmt.Errorf("render email template: %w", err)
	}

	return r.send(ctx, toEmail, "Đặt lại mật khẩu — "+r.appName, html)
}

// ─── Internal send ───────────────────────────────────────────────────────────

type resendPayload struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

func (r *ResendSender) send(ctx context.Context, to, subject, html string) error {
	payload := resendPayload{
		From:    r.from,
		To:      []string{to},
		Subject: subject,
		HTML:    html,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal resend payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, resendSendURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+r.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := r.client.Do(req)
	if err != nil {
		return fmt.Errorf("resend http request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		var errBody map[string]any
		_ = json.NewDecoder(resp.Body).Decode(&errBody)
		return fmt.Errorf("resend API error %d: %v", resp.StatusCode, errBody)
	}

	return nil
}

// ─── HTML Template ───────────────────────────────────────────────────────────

type passwordResetData struct {
	AppName  string
	AppURL   string
	ResetURL string
	ToEmail  string
}

var passwordResetTmpl = template.Must(template.New("password_reset").Parse(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Đặt lại mật khẩu</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f4f4f7;
      color: #1a1a2e;
      -webkit-font-smoothing: antialiased;
    }

    .email-wrapper {
      max-width: 600px;
      margin: 40px auto;
      padding: 0 16px 48px;
    }

    /* Header */
    .email-header {
      text-align: center;
      padding: 32px 0 24px;
    }
    .email-header .logo-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
    }
    .email-header .logo-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .email-header .logo-icon svg {
      width: 22px;
      height: 22px;
    }
    .email-header .logo-text {
      font-size: 20px;
      font-weight: 700;
      color: #1a1a2e;
      letter-spacing: -0.3px;
    }

    /* Card */
    .email-card {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }

    /* Banner */
    .card-banner {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%);
      padding: 40px 32px 36px;
      text-align: center;
      position: relative;
    }
    .card-banner::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 24px;
      background: #ffffff;
      border-radius: 24px 24px 0 0;
    }
    .banner-icon {
      width: 64px;
      height: 64px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      backdrop-filter: blur(4px);
    }
    .banner-icon svg {
      width: 32px;
      height: 32px;
    }
    .card-banner h1 {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.4px;
      line-height: 1.3;
    }

    /* Body */
    .card-body {
      padding: 8px 40px 40px;
    }

    .greeting {
      font-size: 16px;
      color: #374151;
      margin-bottom: 16px;
      line-height: 1.6;
    }

    .description {
      font-size: 15px;
      color: #6b7280;
      line-height: 1.7;
      margin-bottom: 32px;
    }

    /* CTA Button */
    .cta-wrapper {
      text-align: center;
      margin-bottom: 32px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 40px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.1px;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
      transition: all 0.2s;
    }

    /* Divider */
    .divider {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 28px 0;
    }

    /* Expiry info */
    .expiry-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 14px 18px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 24px;
    }
    .expiry-box svg {
      flex-shrink: 0;
      margin-top: 2px;
    }
    .expiry-box p {
      font-size: 13px;
      color: #92400e;
      line-height: 1.5;
    }
    .expiry-box strong {
      font-weight: 600;
    }

    /* Fallback link */
    .fallback {
      margin-bottom: 24px;
    }
    .fallback p {
      font-size: 13px;
      color: #9ca3af;
      margin-bottom: 8px;
    }
    .fallback .link-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 12px;
      color: #6366f1;
      word-break: break-all;
      font-family: 'Courier New', monospace;
      line-height: 1.5;
    }

    /* Security note */
    .security-note {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 14px 18px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .security-note svg {
      flex-shrink: 0;
      margin-top: 1px;
    }
    .security-note p {
      font-size: 13px;
      color: #166534;
      line-height: 1.5;
    }

    /* Footer */
    .email-footer {
      text-align: center;
      padding: 24px 0 0;
    }
    .email-footer p {
      font-size: 12px;
      color: #9ca3af;
      line-height: 1.6;
    }
    .email-footer a {
      color: #6366f1;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">

    <!-- Header / Logo -->
    <div class="email-header">
      <a href="{{.AppURL}}" class="logo-badge">
        <span class="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </span>
        <span class="logo-text">{{.AppName}}</span>
      </a>
    </div>

    <!-- Card -->
    <div class="email-card">

      <!-- Banner -->
      <div class="card-banner">
        <div class="banner-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h1>Đặt lại mật khẩu</h1>
      </div>

      <!-- Body -->
      <div class="card-body">
        <p class="greeting">Xin chào,</p>
        <p class="description">
          Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>{{.ToEmail}}</strong>.
          Nhấn vào nút bên dưới để tạo mật khẩu mới. Nếu bạn không thực hiện yêu cầu này,
          hãy bỏ qua email này.
        </p>

        <!-- CTA -->
        <div class="cta-wrapper">
          <a href="{{.ResetURL}}" class="cta-button">
            🔐 &nbsp;Đặt lại mật khẩu
          </a>
        </div>

        <hr class="divider" />

        <!-- Expiry warning -->
        <div class="expiry-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <p><strong>Lưu ý:</strong> Liên kết này sẽ hết hạn sau <strong>1 giờ</strong>. Sau thời gian đó, bạn cần gửi lại yêu cầu mới.</p>
        </div>

        <!-- Fallback URL -->
        <div class="fallback">
          <p>Nếu nút không hoạt động, hãy sao chép và dán đường dẫn sau vào trình duyệt:</p>
          <div class="link-box">{{.ResetURL}}</div>
        </div>

        <!-- Security note -->
        <div class="security-note">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <p>Vì lý do bảo mật, liên kết này chỉ dùng được một lần. Sau khi đặt lại thành công, tất cả phiên đăng nhập hiện tại sẽ bị đăng xuất.</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="email-footer">
      <p>
        Email này được gửi tự động từ <a href="{{.AppURL}}">{{.AppName}}</a>.<br/>
        Bạn nhận được email này vì có yêu cầu đặt lại mật khẩu cho tài khoản <strong>{{.ToEmail}}</strong>.
      </p>
    </div>

  </div>
</body>
</html>`))

func renderPasswordResetHTML(data passwordResetData) (string, error) {
	var buf bytes.Buffer
	if err := passwordResetTmpl.Execute(&buf, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}
