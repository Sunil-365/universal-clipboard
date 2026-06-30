require('dotenv').config();
const Razorpay = require('razorpay');

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const monthlyPlan = {
  period: "monthly",
  interval: 1,
  item: {
    name: "Premium Monthly",
    amount: 7900, // Amount in paise (79 INR)
    currency: "INR",
    description: "Premium Monthly Subscription"
  }
};

const yearlyPlan = {
  period: "yearly",
  interval: 1,
  item: {
    name: "Premium Yearly",
    amount: 79900, // Amount in paise (799 INR)
    currency: "INR",
    description: "Premium Yearly Subscription"
  }
};

async function createPlans() {
    try {
        console.log('Creating Razorpay monthly plan...');
        const res = await instance.plans.create(monthlyPlan);
        console.log('Monthly plan created! Plan ID:', res.id);
    } catch (e) {
        console.error('Monthly plan error:', e);
    }
    
    try {
        console.log('Creating Razorpay yearly plan...');
        const res = await instance.plans.create(yearlyPlan);
        console.log('Yearly plan created! Plan ID:', res.id);
    } catch (e) {
        console.error('Yearly plan error:', e);
    }
}

createPlans();
