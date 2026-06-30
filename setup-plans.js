require('dotenv').config();
const axios = require('axios');

const cashfreeEnv = (process.env.CASHFREE_ENV || '').toUpperCase() === 'PRODUCTION' 
    ? 'PRODUCTION' 
    : 'SANDBOX';

const cashfreeBaseUrl = cashfreeEnv === 'PRODUCTION' 
    ? 'https://api.cashfree.com/pg' 
    : 'https://sandbox.cashfree.com/pg';

const cashfreeHeaders = {
    'x-client-id': process.env.CASHFREE_APP_ID,
    'x-client-secret': process.env.CASHFREE_SECRET_KEY,
    'x-api-version': '2023-08-01',
    'Content-Type': 'application/json'
};

const monthlyPlan = {
    plan_id: "premium_monthly_01",
    plan_name: "Premium Monthly",
    plan_type: "PERIODIC",
    plan_recurring_amount: 79.00,
    plan_max_amount: 500.00,
    plan_currency: "INR",
    plan_interval_type: "MONTH",
    plan_intervals: 1,
    plan_max_cycles: 12
};
const yearlyPlan = {
    plan_id: "premium_yearly_01",
    plan_name: "Premium Yearly",
    plan_type: "PERIODIC",
    plan_recurring_amount: 799.00,
    plan_max_amount: 2000.00,
    plan_currency: "INR",
    plan_interval_type: "YEAR",
    plan_intervals: 1,
    plan_max_cycles: 5
};

async function createPlans() {
    try {
        console.log('Creating monthly plan...');
        await axios.post(`${cashfreeBaseUrl}/plans`, monthlyPlan, { headers: cashfreeHeaders });
        console.log('Monthly plan created.');
    } catch (e) {
        console.error('Monthly plan error:', e.response ? e.response.data : e.message);
    }
    
    try {
        console.log('Creating yearly plan...');
        await axios.post(`${cashfreeBaseUrl}/plans`, yearlyPlan, { headers: cashfreeHeaders });
        console.log('Yearly plan created.');
    } catch (e) {
        console.error('Yearly plan error:', e.response ? e.response.data : e.message);
    }
}

createPlans();
