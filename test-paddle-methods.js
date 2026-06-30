const { Paddle, Environment } = require('@paddle/paddle-node-sdk');
const paddle = new Paddle('pdl_sdbx_apikey_01kwbejpt7272rfv9p4pd7kvs7_t0HEPa3ZqpGhERq9FZ7QFx_AUk', { environment: Environment.sandbox });
console.log('clientTokens methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(paddle.clientTokens)));
console.log('notificationSettings methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(paddle.notificationSettings)));
console.log('products methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(paddle.products)));
console.log('prices methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(paddle.prices)));
