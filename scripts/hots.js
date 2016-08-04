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
const heroprotocol = require('heroprotocoljs');
var fs = require('fs');
var path = require('path');
var Table = require('easy-table');

module.exports = function(robot) {

	// Return only base file name without dir
	function getMostRecentFileName(dir) {
		var files = fs.readdirSync(dir);

		// use underscore for max()
		return path.join(dir, _.max(files, function(f) {
			var fullpath = path.join(dir, f);

			// ctime = creation time is used
			// replace with mtime for modification time
			return fs.statSync(fullpath).ctime;
		}));
	}

	function fetchMMR(id) {
		return rp({
			uri: "https://www.hotslogs.com/API/Players/" + id,
			json: true // Automatically parses the JSON string in the response 
		});
		/*
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
		*/
	}

	robot.respond(/last game/i, function(robotResponse) {
		var replayFile = getMostRecentFileName("/mnt/hgfs/4tb/Replays/Multiplayer/");
		var replayDecoder = new heroprotocol.ReplayDecoder(replayFile);

		replayDecoder.parse('details');

		// display the players name alphabetically
		var players = replayDecoder.details.m_playerList.map(player => {
			return {
				"name": player.m_name,
				"win": player.m_result
			}
		});
		var sorted = players.sort((a, b) => {
			return a.win - b.win;
		});
		robot.adapter.reply(null, sorted.slice(0, 5).map(player => player.name) + " won vs " + sorted.slice(5, 10).map(player => player.name) + " on " + replayDecoder.details.m_title);
	});

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
			return fetchMMR(user.hotsLogsId);
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
		return fetchMMR(hotsLogsId);
	});

	robot.respond(/hots all mmr/i, function(robotResponse) {
		var key, ref, results, user;
		ref = robot.brain.data.users;
		promises = [];
		for (key in ref) {
			user = ref[key];
			if (user.hotsLogsId) {
				promises.push(fetchMMR(user.hotsLogsId));
			}
		}
		Promise.all(promises).then((values) => {
			table = values.map((stats) => {
				console.log(stats);
				out = _.reduce(stats.LeaderboardRankings, (out, d) => {
					out[d.GameMode] = d.CurrentMMR;
					return out;
				}, {
					Name: stats.Name
				});
				console.log(out);
				return out;
				/*
				name = stats.Name;
				mmrs = _.map(stats.LeaderboardRankings, function(val) {
				  return val.CurrentMMR + " (" + val.GameMode + ")";
				});
				*/
				//return robotResponse.send(name + " -- " + (mmrs.join(', ')));
			});
			console.log(table);
			var t = new Table

			table.forEach(function(user) {
				t.cell('id', user.Name)
				t.cell('qm', user.QuickMatch)
				t.cell('hl', user.HeroLeague)
				t.cell('tl', user.TeamLeague)
				t.newRow()
			})

			console.log(t.toString());
      return robotResponse.send(t.toString());
		});
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
