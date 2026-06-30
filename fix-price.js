const { Paddle, Environment } = require('@paddle/paddle-node-sdk');

const paddle = new Paddle('pdl_live_apikey_01kwbkfj5cezsk8znmqrrxm6jx_74kwwDhrjaxW24Y2aVn1JR_A33', {
    environment: Environment.production,
});

async function fixMonthlyPrice() {
    try {
        console.log("Creating new Monthly ₹60 Price...");
        const monthlyPrice = await paddle.prices.create({
            productId: 'pro_01kwbkgjks6htcrp277atp2wpv', // The existing Premium Product
            description: 'DropConnect Premium - Monthly (Early Access)',
            unitPrice: {
                amount: '6000', // 60 INR (6000 paise) - Absolute minimum allowed by Paddle
                currencyCode: 'INR'
            },
            billingCycle: {
                interval: 'month',
                frequency: 1
            },
            trialPeriod: {
                interval: 'day',
                frequency: 7
            }
        });
        console.log('✅ NEW Monthly Price created:', monthlyPrice.id);
    } catch (error) {
        console.error("Failed to setup plans:", error);
    }
}

fixMonthlyPrice();
