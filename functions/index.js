const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
/*exports.helloWorld = functions.https.onRequest((request, response) => {


  admin.auth().listUsers(1000, nextPageToken)
    .then(function (listUsersResult) {
      listUsersResult.users.forEach(function (userRecord) {
        console.log('user', userRecord.toJSON());
      });
      if (listUsersResult.pageToken) {
        // List next batch of users.
        listAllUsers(listUsersResult.pageToken);
      }
    })
    .catch(function (error) {
      console.log('Error listing users:', error);
    });
  response.send("Hello from Firebase!");
});*/

exports.addMessage = functions.https.onRequest(async (req, res) => {
  // Grab the text parameter.
  const original = req.query.text;
  console.log("param : " + req.query.text)
  // Push the new message into the Realtime Database using the Firebase Admin SDK.
  const snapshot = await admin.database().ref('/').push({
    original: original
  });
  // Redirect with 303 SEE OTHER to the URL of the pushed object in the Firebase console.
  res.redirect(303, snapshot.ref.toString());
});

exports.sendNotificationOnCreate = functions.database.ref('/user_records/{pushId}/shouldSendNotification')
  .onCreate((snapshot, context) => {
    console.log("---onCreate----");
    // Grab the current value of what was written to the Realtime Database.
    const shouldSendNotification = snapshot.val();
    console.log("shouldSendNotification", shouldSendNotification);
    if (shouldSendNotification) {
      return snapshot.ref.parent.child('shouldSendNotification').set("false");
    } else {
      return snapshot.ref.parent.child('shouldSendNotification').set("true");
    }
  });

exports.sendNotificationOnWrite = functions.database.ref('/user_records/{pushId}')
  .onWrite((change, context) => {
    console.log("---onWrite event called----");

    // Exit when the data is deleted.
    if (!change.after.exists()) {
      return null;
    }

    var shouldSendNotificationAfter = change.after.child('shouldSendNotification').val();
    var pageUrlAfter = change.after.child('pageUrl').val();
    var topic = change.after.child('topic').val();
    var name = change.after.child('name').val();
    var message = change.after.child('message').val();
    console.log("topic: ", topic);

    var rootSnapshot = change.after.ref.parent.child(context.params.pushId);
    rootSnapshot.child('shouldSendNotification').set("false");

    const payload = {
      notification: {
        title: name,
        body: message
      }
    };
    return admin.messaging().sendToTopic(topic, payload);

  });
