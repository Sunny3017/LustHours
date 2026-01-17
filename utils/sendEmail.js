const resendLib = require('resend');

const { Resend } = resendLib;

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
    const fromAddress = process.env.FROM_EMAIL;
    const fromName = process.env.FROM_NAME;

    const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;

    try {
        const { data, error } = await resend.emails.send({
            from,
            to: options.email,
            subject: options.subject,
            text: options.message,
            html: options.html || `<p>${options.message}</p>`
        });

        if (error) {
            const meta = {
                name: error.name,
                message: error.message,
                statusCode: error.statusCode,
                details: error.details
            };
            console.error(JSON.stringify({ op: 'sendEmail', error: meta }));

            const e = new Error('EMAIL_SEND_FAILED');
            e.statusCode = 500;
            e.meta = meta;
            throw e;
        }

        console.log(`Email sent via Resend: ${data?.id || 'no-id'}`);
        return data;
    } catch (err) {
        const meta = {
            name: err.name,
            message: err.message,
            statusCode: err.statusCode,
            stack: err.stack
        };
        console.error(JSON.stringify({ op: 'sendEmail', error: meta }));

        const e = new Error('EMAIL_SEND_FAILED');
        e.statusCode = 500;
        e.meta = meta;
        throw e;
    }
};

module.exports = sendEmail;
