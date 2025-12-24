const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendOTP(email, otp) {
    // Kiểm tra cấu hình email
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('❌ Email service chưa được cấu hình! Vui lòng thiết lập EMAIL_USER và EMAIL_PASSWORD trong .env');
      throw new Error('Email service chưa được cấu hình. Vui lòng liên hệ quản trị viên.');
    }

    const mailOptions = {
      from: `"Hệ Thống Quản Lý" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Mã xác thực đặt lại mật khẩu',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔐 Đặt lại mật khẩu</h1>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="font-size: 16px; color: #333333; margin: 0 0 20px 0;">Xin chào,</p>
                      
                      <p style="font-size: 16px; color: #333333; margin: 0 0 30px 0;">
                        Bạn đã yêu cầu đặt lại mật khẩu. Sử dụng mã <strong>OTP</strong> sau để xác thực:
                      </p>
                      
                      <!-- OTP Box -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 10px; display: inline-block;">
                              <span style="color: #ffffff; font-size: 42px; font-weight: bold; letter-spacing: 10px; font-family: 'Courier New', monospace;">
                                ${otp}
                              </span>
                            </div>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Warning Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 5px;">
                            <p style="margin: 0; color: #856404; font-size: 14px;">
                              ⏱️ <strong>Mã OTP này sẽ hết hạn sau 5 phút</strong>
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="font-size: 14px; color: #666666; margin: 20px 0 0 0; line-height: 1.6;">
                        Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này và đảm bảo tài khoản của bạn an toàn.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                      <p style="margin: 0; color: #999999; font-size: 12px;">
                        Email này được gửi tự động, vui lòng không trả lời.
                      </p>
                      <p style="margin: 10px 0 0 0; color: #999999; font-size: 12px;">
                        © ${new Date().getFullYear()} Your Company. All rights reserved.
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error sending email:', error);
      console.error('❌ Error details:', {
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode
      });
      
      // Trả về thông báo lỗi chi tiết hơn
      let errorMessage = 'Không thể gửi email. Vui lòng thử lại!';
      
      if (error.code === 'EAUTH') {
        errorMessage = 'Lỗi xác thực email. Vui lòng kiểm tra cấu hình email server.';
      } else if (error.code === 'ECONNECTION') {
        errorMessage = 'Không thể kết nối đến email server. Vui lòng kiểm tra kết nối mạng.';
      } else if (error.responseCode === 535) {
        errorMessage = 'Lỗi xác thực email. Vui lòng kiểm tra tên đăng nhập và mật khẩu email.';
      } else if (error.response) {
        errorMessage = `Lỗi email server: ${error.response}`;
      }
      
      throw new Error(errorMessage);
    }
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log(' Email service is ready');
      return true;
    } catch (error) {
      console.error('❌ Email service error:', error.message);
      return false;
    }
  }
}

module.exports = new EmailService();