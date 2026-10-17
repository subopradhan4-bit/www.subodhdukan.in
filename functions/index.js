const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
exports.orderGhanti = functions.firestore.document("orders/{orderId}").onCreate(async (snap) => {
  const order = snap.data();
  await admin.messaging().send({
    notification: { title: "Naya Order Aaya!", body: `${order.customerName || 'Customer'} ka order` },
    topic: "admin_orders"
  });
  return null;
});
