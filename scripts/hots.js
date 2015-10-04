// Description:
//   When asked, tells users about the current Heroes of the Storm rotation.
//   Will eventually learn to tell users about their MMR and other data tracked
//   at hotslogs.com.
//
// Dependencies:
//   "cheerio": "^0.19.0"
//   "request": "^2.55.0"
//   "lodash": "^3.9.3"
//
// Commands:
//   hubot hots rotation - fetches the current rotation
//   hubot hots mmr @<username> - fetches the MMR of the given player
//   hubot hots mmr @<autocompleted discord name> - fetches the MMR of the given player
//   hubot hots mmr <hotslog id> - fetches the MMR of the given id
//   hubot hots mmr - fetches the MMR of the requesting user, given they've registered it
//   hubot hots register <id> - remembers the requesting user's hotslogs ID
//
// Author:
//   bryan792
//   frio

var _, cheerio, request, rp;
cheerio = require('cheerio');
request = require('request');
_ = require('lodash');
rp = require('request-promise');

module.exports = function(robot) {

  var fetchMMR = function(id, robotResponse) {
    console.log(id);
    rp("https://www.hotslogs.com/API/Players/" + id).then(function(body) {
      return console.log(body);
    });
    return request("https://www.hotslogs.com/API/Players/" + id, function(err, httpResponse, body) {
      var mmrs, name, stats;
      if (err) {
        robot.logger.error(err);
        robotResponse.send("I'm sorry, something went wrong :(");
        return;
      }
      stats = JSON.parse(body);
      name = stats.Name;
      mmrs = _.map(stats.LeaderboardRankings, function(val) {
        return val.CurrentMMR + " (" + val.GameMode + ")";
      });
      return robotResponse.send(name + " -- " + (mmrs.join(', ')));
    });
  };

  robot.respond(/hots rotation/i, function(robotResponse) {
    return request('http://heroesofthestorm.github.io/free-hero-rotation', function(err, httpResponse, body) {
        var $, heroes, validFor;
        if (err) {
          robot.logger.error(err);
          robotResponse.send("I'm sorry, something went wrong :(");
          return;
        }
        $ = cheerio.load(body);
        validFor = $('h2').first().text();
        heroes = $('button.btn:not(.dropdown-toggle)').map(function(i, e) {
          return e.children[0].data;
        }).slice(0, 7).get();
        return robotResponse.send(validFor + ": " + (heroes.join(', ')));
        });
  });

  var replyUserMMR = function(robotResponse, user, username) {
    if (user == null) {
      robotResponse.reply("Sorry, I don\'t know who " + username + " is :(");
      return;
    }
    if (user.hotsLogsId != null) {
      return fetchMMR(user.hotsLogsId, robotResponse);
    } else if (username != null) {
      return robotResponse.reply("Sorry, " + username + " hasn't registered their hotslogs ID.  Bully them until they do.");
    } else {
      return robotResponse.reply('Sorry, your ID isn\'t registered. Please register your ID with `hots register <id>`, where your ID is the numeric ID for your hotslogs profile.');
    }
  }

  robot.respond(/hots mmr$/i, function(robotResponse) {
    var user = robot.brain.userForId(robotResponse.message.user.id); 
    return replyUserMMR(robotResponse, user, user.name);
  });

  robot.respond(/hots mmr (\@[\w\d]+)$/i, function(robotResponse) {
    var user, username;
    username = robotResponse.match[1];
    user = robot.brain.usersForFuzzyName(username)[0];
    return replyUserMMR(robotResponse, user, username);
  });

  robot.respond(/hots mmr <\@([\d]+)?>$/i, function(robotResponse) {
    var ref, user, username;
    username = robotResponse.match[1];
    user = robot.brain.userForId(username);
    return replyUserMMR(robotResponse, user, username);
  });

  robot.respond(/hots mmr (\d+)/i, function(robotResponse) {
    var hotsLogsId;
    hotsLogsId = robotResponse.match[1];
    return fetchMMR(hotsLogsId, robotResponse);
  });

  robot.respond(/hots all mmr/i, function(robotResponse) {
    var key, ref, results, user;
    ref = robot.brain.data.users;
    results = [];
    for (key in ref) {
      user = ref[key];
      if (user.hotsLogsId) {
        results.push(fetchMMR(user.hotsLogsId, robotResponse));
      } else {
        results.push(void 0);
      }
    }
    return results;
  });

  robot.respond(/hots register (\d+)/i, function(robotResponse) {
    var hotsLogsId, user;
    hotsLogsId = robotResponse.match[1];
    user = robot.brain.userForId(robotResponse.message.user.id, {
      name: robotResponse.message.user.name
    });
    user.hotsLogsId = hotsLogsId;
    return robotResponse.reply("assigned " + hotsLogsId + " as your hotslogs id");
  });

  robot.respond(/hots register <(\@[\d]+)?> (\d+)$/i, function(robotResponse) {
    var hotsLogsId, ref, user, username;
    username = (ref = robotResponse.match[1]) != null ? ref.trim().slice(1) : void 0;
    hotsLogsId = robotResponse.match[2];
    user = robot.brain.userForId(username);
    user.hotsLogsId = hotsLogsId;
    return robotResponse.reply("assigned " + hotsLogsId + " as " + user.name + " hotslogs id");
  });

  robot.respond(/hots builds (.*)/i, function(robotResponse) {
    return robotResponse.reply("http://www.hotsbuilds.info/" + robotResponse.match[1]);
  });
};
