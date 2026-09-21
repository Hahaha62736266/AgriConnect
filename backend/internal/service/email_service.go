package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

// EmailService sends transactional emails via the Brevo (Sendinblue) API.
type EmailService struct {
	apiKey     string
	senderName string
	senderEmail string
}

// NewEmailService creates a new Brevo email service.
func NewEmailService(apiKey string) *EmailService {
	return &EmailService{
		apiKey:      apiKey,
		senderName:  "AgriConnect",
		senderEmail: "noreply@agriconnect.ph",
	}
}

// brevoPayload is the JSON structure for Brevo's transactional email API.
type brevoPayload struct {
	Sender      brevoContact   `json:"sender"`
	To          []brevoContact `json:"to"`
	Subject     string         `json:"subject"`
	HTMLContent string         `json:"htmlContent"`
}

type brevoContact struct {
	Name  string `json:"name,omitempty"`
	Email string `json:"email"`
}

// SendPasswordResetEmail dispatches a branded password reset email via Brevo.
func (s *EmailService) SendPasswordResetEmail(toEmail, toName, resetLink string) error {
	if s.apiKey == "" {
		log.Println("⚠️  BREVO_API_KEY not set — skipping email to", toEmail)
		log.Println("🔗 Reset link (dev only):", resetLink)
		return nil
	}

	htmlBody := buildResetEmailHTML(toName, resetLink)

	payload := brevoPayload{
		Sender:      brevoContact{Name: s.senderName, Email: s.senderEmail},
		To:          []brevoContact{{Name: toName, Email: toEmail}},
		Subject:     "Reset Your AgriConnect Password",
		HTMLContent: htmlBody,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal brevo payload: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.brevo.com/v3/smtp/email", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create brevo request: %w", err)
	}

	req.Header.Set("accept", "application/json")
	req.Header.Set("content-type", "application/json")
	req.Header.Set("api-key", s.apiKey)

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("brevo HTTP error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		var errBody map[string]interface{}
		_ = json.NewDecoder(resp.Body).Decode(&errBody)
		return fmt.Errorf("brevo API error (HTTP %d): %v", resp.StatusCode, errBody)
	}

	log.Printf("📧 Password reset email sent to %s via Brevo\n", toEmail)
	return nil
}

// buildResetEmailHTML returns a branded HTML email template.
func buildResetEmailHTML(name, resetLink string) string {
	displayName := name
	if displayName == "" {
		displayName = "there"
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#14532D 0%%,#166534 100%%);padding:32px 28px;text-align:center;">
              <span style="font-size:28px;">🌾</span>
              <h1 style="margin:12px 0 4px;font-size:22px;font-weight:800;color:#ffffff;">AgriConnect</h1>
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.85);">Password Recovery Service</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 28px;">
              <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi %s,</p>
              <p style="margin:0 0 24px;font-size:14px;color:#4B5563;line-height:1.7;">
                We received a request to reset the password for your AgriConnect account. Click the button below to set a new password. This link will expire in <strong>30 minutes</strong>.
              </p>
              <!-- CTA Button -->
              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="%s" target="_blank" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#14532D 0%%,#166534 100%%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;box-shadow:0 4px 12px rgba(20,83,45,0.3);">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px;font-size:13px;color:#6B7280;">If the button doesn't work, copy and paste this URL into your browser:</p>
              <p style="margin:0 0 24px;font-size:12px;color:#166534;word-break:break-all;background-color:#F0FDF4;padding:12px;border-radius:8px;border:1px solid #BBF7D0;">
                %s
              </p>
              <div style="border-top:1px solid #E5E7EB;padding-top:16px;margin-top:8px;">
                <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">
                  🔒 If you did not request this reset, you can safely ignore this email. Your password will remain unchanged.<br/>
                  🌾 For in-person verification, visit your Municipal Agriculture Office with your RSBSA stub.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#F9FAFB;padding:20px 28px;text-align:center;border-top:1px solid #E5E7EB;">
              <p style="margin:0;font-size:11px;color:#9CA3AF;">
                © 2026 AgriConnect · Connect. Grow. Prosper.<br/>
                Department of Agriculture – Philippines
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, displayName, resetLink, resetLink)
}
