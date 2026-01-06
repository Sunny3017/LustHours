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
        secure: false,
        auth: { user, pass },
        pool: true,
        maxConnections: 3,
        maxMessages: 50,
        connectionTimeout: 15000,
        socketTimeout: 20000,
        tls: { minVersion: 'TLSv1.2' }
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
        return info;
    } catch (error) {
        try {
            await transporter.verify();
            const info2 = await transporter.sendMail(mailOptions);
            return info2;
        } catch (err2) {
            const meta = {
                code: err2.code || error.code,
                response: err2.response || error.response,
                message: err2.message || error.message
            };
            console.error(JSON.stringify({ op: 'sendEmail', error: meta }));
            const e = new Error('EMAIL_SEND_FAILED');
            e.statusCode = 500;
            e.meta = meta;
            throw e;
        }
    }
};

module.exports = sendEmail;
