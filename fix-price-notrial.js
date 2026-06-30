const { Paddle, Environment } = require('@paddle/paddle-node-sdk');

const paddle = new Paddle('pdl_live_apikey_01kwbkfj5cezsk8znmqrrxm6jx_74kwwDhrjaxW24Y2aVn1JR_A33', {
    environment: Environment.production,
});

async function fixPriceWithoutTrial() {
    try {
        console.log("Creating new Monthly ₹60 Price WITHOUT Free Trial...");
        const monthlyPrice = await paddle.prices.create({
            productId: 'pro_01kwbkgjks6htcrp277atp2wpv', // The existing Premium Product
            description: 'DropConnect Premium - Monthly (Instant Checkout)',
            unitPrice: {
                amount: '6000', // 60 INR
                currencyCode: 'INR'
            },
            billingCycle: {
                interval: 'month',
                frequency: 1
            }
            // NO TRIAL PERIOD
        });
        console.log('✅ NEW Price created:', monthlyPrice.id);
    } catch (error) {
        console.error("Failed to setup plans:", error);
    }
}

fixPriceWithoutTrial();
