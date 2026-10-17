const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.orderGhanti = functions.firestore
  .document("orders/{orderId}")
  .onCreate(async (snap, context) => {
    const order = snap.data();
    const payload = {
      notification: {
        title: "Naya Order Aaya!",
        body: `${order.customerName || 'Customer'} ka order`,
      },
      topic: "admin_orders"
    };
    await admin.messaging().send(payload);
    return null;
  });