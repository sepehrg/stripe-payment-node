"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Replace if using a different env file or config.
dotenv_1.default.config({ path: "./.env.example" });
const body_parser_1 = __importDefault(require("body-parser"));
const express_1 = __importDefault(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2020-08-27",
    appInfo: {
        name: "stripe-samples/accept-a-payment",
        url: "https://github.com/stripe-samples",
        version: "0.0.2",
    },
    typescript: true,
});
const app = (0, express_1.default)();
const resolve = path_1.default.resolve;
app.use(express_1.default.static(process.env.STATIC_DIR));
app.use((req, res, next) => {
    if (req.originalUrl === "/webhook") {
        next();
    }
    else {
        body_parser_1.default.json()(req, res, next);
    }
});
app.get("/", (_, res) => {
    // Serve checkout page.
    const indexPath = resolve(process.env.STATIC_DIR + "/index.html");
    res.sendFile(indexPath);
});
app.get("/config", (_, res) => {
    // Serve checkout page.
    res.send({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
});
app.post("/create-payment-intent", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { currency, paymentMethodType } = req.body;
    // Create a PaymentIntent with the order amount and currency.
    const params = {
        amount: 1999,
        currency,
        payment_method_types: [paymentMethodType],
    };
    // If this is for an ACSS payment, we add payment_method_options to create
    // the Mandate.
    if (paymentMethodType === "acss_debit") {
        params.payment_method_options = {
            acss_debit: {
                mandate_options: {
                    payment_schedule: "sporadic",
                    transaction_type: "personal",
                },
            },
        };
    }
    try {
        const paymentIntent = yield stripe.paymentIntents.create(params);
        // Send publishable key and PaymentIntent client_secret to client.
        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    }
    catch (e) {
        res.status(400).send({
            error: {
                message: e.message,
            }
        });
    }
}));
// Expose a endpoint as a webhook handler for asynchronous events.
// Configure your webhook in the stripe developer dashboard:
// https://dashboard.stripe.com/test/webhooks
app.post("/webhook", 
// Use body-parser to retrieve the raw body as a buffer.
body_parser_1.default.raw({ type: "application/json" }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        console.log(`⚠️  Webhook signature verification failed.`);
        res.sendStatus(400);
        return;
    }
    // Extract the data from the event.
    const data = event.data;
    const eventType = event.type;
    if (eventType === "payment_intent.succeeded") {
        // Cast the event into a PaymentIntent to make use of the types.
        const pi = data.object;
        // Funds have been captured
        // Fulfill any orders, e-mail receipts, etc
        // To cancel the payment after capture you will need to issue a Refund (https://stripe.com/docs/api/refunds).
        console.log(`🔔  Webhook received: ${pi.object} ${pi.status}!`);
        console.log("💰 Payment captured!");
    }
    else if (eventType === "payment_intent.payment_failed") {
        // Cast the event into a PaymentIntent to make use of the types.
        const pi = data.object;
        console.log(`🔔  Webhook received: ${pi.object} ${pi.status}!`);
        console.log("❌ Payment failed.");
    }
    res.sendStatus(200);
}));
app.listen(4242, () => console.log(`Node server listening on port ${4242}!`));
//# sourceMappingURL=index.js.map