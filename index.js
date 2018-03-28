import mongoose from 'mongoose';
const express = require('express');
import { User } from './models/models';
const { RTMClient, WebClient } = require('@slack/client');
import { generateAuthCB, googleRoutes, getEvents, setReminder, getAvail } from './google';
import { getUserEmailByID } from './routes';
import axios from 'axios';
const app = express();
app.use('/', googleRoutes);
import apiai from 'apiai';

var test = apiai(process.env.APIAI_CLIENT_TOKEN);


if (!process.env.MONGODB_URI) {
  console.error('Cannot find MONGODB_URI.  Run env.sh?');
  process.exit(1);
}
// connected to mongoose
mongoose.connect(process.env.MONGODB_URI);



/* RTM API to be used to respond to messages ?
*/
const rtm = new RTMClient(process.env.BOT_SLACK_TOKEN);
rtm.start();
// TODO: @Chris or @Trevor use this package to integrate with APIAI
// const apiai = require('apiai');
// const app = apiai(process.env.APIAI_CLIENT_TOKEN);
// console.log(rtm.users);
/*
* Web API to be used to parse through messages ?
*/
const web = new WebClient(process.env.SLACK_TOKEN);

/* WEBHOOK needed to communicate with slack server and slack server to our app */
const currentTime = new Date().toTimeString();

const defaultResponse = {
  reply_broadcast: true,
  subtype: 'bot_message',
}


// TODO
/*
1) database
2)
*/


rtm.on('message', async (event) => {
  // For structure of `event`, see https://api.slack.com/events/reaction_added
  let { message } = event;
  if(!message){ message = event; }
  if(message !== event) /*console.log('message: ', message);*/
  if ((message.subtype && message.subtype === 'bot_message') ||
       (!message.subtype && message.user === rtm.activeUserId) ) {
    return;
  }

  try {
    const user_email = await getUserEmailByID(event.user);
    if(typeof user_email !== "string") {
      throw `invalid email: type is ${typeof user_email}`;
    }
    let user = await User.findOrCreate(event.user, user_email);
    const botResponse = Object.assign({}, defaultResponse, {channel: event.channel});
    const request = test.textRequest(event.text, {
      sessionId: event.user
    });
    console.log('found user');
    request.on('response', function(response) {
        console.log('response.result: ', response.result);
        if(response.result.action === 'meeting.add' || response.result.action === 'reminder.add'){
          if(!user.googleCalAuth)
          {
            botResponse.text = `I need your permission to access google calendar: ${generateAuthCB(event.user)}`;
            let res = rtm.addOutgoingEvent(false, 'message', botResponse);
            return;
            // let res = await web.chat.postMessage({ channel: event.channel, text: response.text, subtype: 'bot_message' })
            // console.log('auth request sent in ', res.ts);
          }

          console.log('what to send back: ', response.result.fulfillment.speech);
          console.log('currently recorded params: ', response.result.parameters);
          console.log('this conversation is not yet complete: ', response.result.actionIncomplete);

          //TO-DO: Google calendar handling once all parameters are filled out
          if(!response.result.actionIncomplete) {
            //Add a google calendar event with [invitees, day, time] as params
            //& [subject, location] as optional params
            if(response.result.action === 'meeting.add') {
            }

            //Add a google calendar event with [date, subject] -> as params
            if (response.result.action === 'reminder.add') {
              setReminder(event.user, response.result.parameters.subject, response.result.parameters.date);
              // console.log('did it work? ', )
            }
          }
        }
        // console.log(response);
        botResponse.text = response.result.fulfillment.speech;
        // botResponse.thread_ts = event.ts;
        // console.log('time checkin: ', event);
        console.log("buddy's response: ", botResponse);
        rtm.addOutgoingEvent(response.result.actionIncomplete, 'message', botResponse);
        
      })


      request.on('error', function (error) {
        console.log(error);
      });

      request.end();
  } catch (err) {
    console.error(err);
  }
});



/*
* listen here
*/
app.listen(3000);
