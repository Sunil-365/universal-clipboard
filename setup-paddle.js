const { Paddle, Environment } = require('@paddle/paddle-node-sdk');
const fs = require('fs');
const path = require('path');

const API_KEY = 'pdl_sdbx_apikey_01kwbejpt7272rfv9p4pd7kvs7_t0HEPa3ZqpGhERq9FZ7QFx_AUk';
const paddle = new Paddle(API_KEY, { environment: Environment.sandbox });

async function setupPaddle() {
    try {
        let clientToken = 'your_paddle_client_token_here';
        console.log('1. Client Token (Please generate one in Dashboard)...');
        console.log('Client Token to use:', clientToken);

        console.log('\n2. Fetching existing Premium Product...');
        let product = null;
        for await (const p of paddle.products.list()) {
            if (p.name === 'Universal Clipboard Premium') {
                product = p;
                break;
            }
        }
        
        if (!product) {
             product = await paddle.products.create({
                name: 'Universal Clipboard Premium',
                description: 'Premium subscription for Universal Clipboard',
                taxCategory: 'standard'
            });
            console.log('Product created:', product.id);
        } else {
            console.log('Product found:', product.id);
        }

        console.log('\n3. Fetching existing Prices...');
        let monthlyPrice = null;
        let yearlyPrice = null;
        for await (const p of paddle.prices.list({ productId: product.id })) {
            if (p.billingCycle && p.billingCycle.interval === 'month') monthlyPrice = p;
            if (p.billingCycle && p.billingCycle.interval === 'year') yearlyPrice = p;
        }

        if (!monthlyPrice) {
            monthlyPrice = await paddle.prices.create({
                description: 'Monthly Subscription',
                productId: product.id,
                unitPrice: { amount: '99', currencyCode: 'USD' }, // $0.99
                billingCycle: { interval: 'month', frequency: 1 }
            });
            console.log('Monthly Price Created:', monthlyPrice.id);
        } else {
            console.log('Monthly Price found:', monthlyPrice.id);
        }

        if (!yearlyPrice) {
            yearlyPrice = await paddle.prices.create({
                description: 'Yearly Subscription',
                productId: product.id,
                unitPrice: { amount: '999', currencyCode: 'USD' }, // $9.99
                billingCycle: { interval: 'year', frequency: 1 }
            });
            console.log('Yearly Price Created:', yearlyPrice.id);
        } else {
            console.log('Yearly Price found:', yearlyPrice.id);
        }

        console.log('\n4. Configuring Webhook...');
        const webhookUrl = 'https://dropconnect.up.railway.app/api/webhooks/paddle';
        
        let webhook = null;
        // notificationSettings.list() actually returns an array directly based on our test
        const settingsRes = await paddle.notificationSettings.list();
        webhook = settingsRes.find(s => s.destination === webhookUrl);

        let webhookSecret = null;
        if (webhook) {
            console.log('Webhook already exists, deleting to fetch a fresh secret...');
            await paddle.notificationSettings.delete(webhook.id);
            webhook = null;
        }
        
        if (!webhook) {
            webhook = await paddle.notificationSettings.create({
                description: 'Backend Webhook for DropConnect',
                destination: webhookUrl,
                subscribedEvents: [
                    'transaction.completed',
                    'subscription.activated'
                ],
                type: 'url',
                includeApiVersion: 1
            });
            webhookSecret = webhook.endpointSecretKey;
        }
        console.log('Webhook created. Secret:', webhookSecret ? 'Received' : 'Not available');

        console.log('\n5. Updating .env file...');
        const envPath = path.join(__dirname, '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        envContent = envContent.replace(/PADDLE_API_KEY=.*/g, `PADDLE_API_KEY=${API_KEY}`);
        envContent = envContent.replace(/PADDLE_CLIENT_TOKEN=.*/g, `PADDLE_CLIENT_TOKEN=${clientToken}`);
        if (webhookSecret) {
            envContent = envContent.replace(/PADDLE_WEBHOOK_SECRET=.*/g, `PADDLE_WEBHOOK_SECRET=${webhookSecret}`);
        }
        fs.writeFileSync(envPath, envContent);
        console.log('.env updated successfully!');

        console.log('\n6. Updating public/pricing.html with Token and Price IDs...');
        const pricingPath = path.join(__dirname, 'public', 'pricing.html');
        let pricingContent = fs.readFileSync(pricingPath, 'utf8');
        pricingContent = pricingContent.replace(/token:\s*'[^']+'/g, `token: '${clientToken}'`);
        pricingContent = pricingContent.replace(/const priceId = plan === 'yearly' \? '[^']+' : '[^']+'/g, `const priceId = plan === 'yearly' ? '${yearlyPrice.id}' : '${monthlyPrice.id}'`);
        fs.writeFileSync(pricingPath, pricingContent);
        console.log('pricing.html updated successfully!');

        console.log('\nSetup Complete! All Paddle dependencies are ready.');
    } catch (e) {
        console.error('Setup failed:', e);
        if (e.response) {
            console.error('API Error:', e.response.data);
        }
    }
}

setupPaddle();
