const { Paddle, Environment } = require('@paddle/paddle-node-sdk');

const paddle = new Paddle('pdl_live_apikey_01kwbkfj5cezsk8znmqrrxm6jx_74kwwDhrjaxW24Y2aVn1JR_A33', {
    environment: Environment.production, // Use production for LIVE
});

async function setupLivePlans() {
    try {
        console.log("Creating Premium Product in LIVE Environment...");
        const product = await paddle.products.create({
            name: 'DropConnect Premium',
            taxCategory: 'standard',
            description: 'Permanent clipboard history, unlimited spaces, and priority support.',
            imageUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
        });
        console.log('✅ Product created:', product.id);

        console.log("Creating Monthly ₹1 Price...");
        const monthlyPrice = await paddle.prices.create({
            productId: product.id,
            description: 'DropConnect Premium - Monthly (Early Access)',
            unitPrice: {
                amount: '100', // 1 INR (100 paise)
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
        console.log('✅ Monthly Price created:', monthlyPrice.id);

        console.log("Creating Yearly ₹999 Price...");
        const yearlyPrice = await paddle.prices.create({
            productId: product.id,
            description: 'DropConnect Premium - Yearly',
            unitPrice: {
                amount: '99900', // 999 INR
                currencyCode: 'INR'
            },
            billingCycle: {
                interval: 'year',
                frequency: 1
            },
            trialPeriod: {
                interval: 'day',
                frequency: 7
            }
        });
        console.log('✅ Yearly Price created:', yearlyPrice.id);

        console.log("\n=================================");
        console.log("Setup Complete! Use these in your code:");
        console.log("Monthly Price ID:", monthlyPrice.id);
        console.log("Yearly Price ID:", yearlyPrice.id);
        console.log("=================================\n");

    } catch (error) {
        console.error("Failed to setup plans:", error);
    }
}

setupLivePlans();
