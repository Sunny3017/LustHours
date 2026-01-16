const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER || process.env.SMTP_USERNAME;
    const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
    const fromAddress = process.env.SMTP_FROM || process.env.FROM_EMAIL || user;
    const fromName = process.env.FROM_NAME;

    const from = fromName ? `"${fromName}" <${fromAddress}>` : fromAddress;

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: false, // true for 465, false for other ports
        auth: { user, pass },
        pool: true,
        maxConnections: 3,
        maxMessages: 50,
        // Timeouts to prevent ETIMEDOUT hangs on Render
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 5000,    // 5 seconds
        socketTimeout: 15000,     // 15 seconds
        // TLS settings for better compatibility
        tls: {
            rejectUnauthorized: false,
            ciphers: 'SSLv3'
        },
        debug: process.env.NODE_ENV !== 'production',
        logger: process.env.NODE_ENV !== 'production'
    }, { from });

    const mailOptions = {
        from,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html || `<p>${options.message}</p>`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.messageId}`);
        return info;
    } catch (error) {
        // Log the full error for debugging
        const meta = {
            code: error.code,
            response: error.response,
            message: error.message,
            command: error.command
        };
        console.error(JSON.stringify({ op: 'sendEmail', error: meta }));
        
        // Enhance error object
        const e = new Error('EMAIL_SEND_FAILED');
        e.statusCode = 500;
        e.meta = meta;
        throw e;
    }
};

module.exports = sendEmail;
