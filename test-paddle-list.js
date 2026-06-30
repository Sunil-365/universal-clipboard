const { Paddle, Environment } = require('@paddle/paddle-node-sdk');
const paddle = new Paddle('pdl_sdbx_apikey_01kwbejpt7272rfv9p4pd7kvs7_t0HEPa3ZqpGhERq9FZ7QFx_AUk', { environment: Environment.sandbox });
async function run() {
    console.log(await paddle.clientTokens.list());
}
run();
