/*
* This file is for requests made to SLACK API
*/
import axios from 'axios';

const getUserEmailByID = (userID) => {
  return axios.get(`https://slack.com/api/users.info?token=${process.env.SLACK_TOKEN}&user=${userID}`)
  .then(({data}) => data.user.profile.email)
  .catch((err) => err);
}

module.exports = {
  getUserEmailByID: getUserEmailByID
}
