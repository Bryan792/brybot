// Description:
//   Twitch integrations
//
// Dependencies:
//
// Commands:
//   hubot twitch|ttv register <twitchId> - registers the twitchId to you
//   hubot twitch|ttv register @<user> <twitchId> - registers the twitchId to the user
//
// Author:
//   bryan792

var rp = require('request-promise');
var moment = require('moment');
var _ = require('lodash');

module.exports = function(robot) {
  robot.respond(/(twitch|ttv) register (\S+)$/i, function(robotResponse) {
    var user = robot.brain.userForId(robotResponse.message.user.id, {
      name: robotResponse.message.user.name
    });
    var twitchId = robotResponse.match[2];
    user.twitchId = twitchId;
    return robotResponse.reply("assigned " + twitchId + " as " + user.name + " twitch id");
  });

  setInterval(function() {
    _.forOwn(robot.brain.data.users, function(value, key) {
      var user = value;
      if (user.twitchId) {
        var stream = user.twitchId;
        var options2 = {
          uri: 'https://api.twitch.tv/kraken/streams/' + stream,
          qs: {
            client_id: 'n4ffd7csbsa4anuvi6zp320ftzsmbd2'
          },
          json: true // Automatically stringifies the body to JSON 
        };
        rp(options2)
          .then(function(parsedBody) {
            if (parsedBody.stream != null) {
              //online
              var now = moment();
              if (!user.twitchLastNotify) {
                robot.adapter.send(null, user.name + " start streaming:\n" + parsedBody.stream.channel.url);
                console.log(stream + " is online");
                console.log(moment(parsedBody.stream.created_at).fromNow());
                user.twitchLastNotify = now;
              }
            } else {
              //offline
              delete user.twitchLastNotify;
            }
          });
      }
    });
  }, 60000);
};
