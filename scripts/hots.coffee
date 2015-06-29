# Description:
#   When asked, tells users about the current Heroes of the Storm rotation.
#   Will eventually learn to tell users about their MMR and other data tracked
#   at hotslogs.com.
#
# Dependencies:
#   "cheerio": "^0.19.0"
#   "request": "^2.55.0"
#
# Commands:
#   hubot hots rotation - fetches the current rotation
#   hubot hots mmr <username> - fetches the MMR of the given player
#   hubot hots mmr - fetches the MMR of the requesting user, given they've registered it
#   hubot hots register <id> - remembers the requesting user's hotslogs ID
#
# Author:
#   frio

cheerio = require 'cheerio'
request = require 'request'
_       = require 'lodash'

module.exports = (robot) ->

  fetchMMR = (id, robotResponse) ->
    request "https://www.hotslogs.com/API/Players/#{id}", (err, httpResponse, body) ->

      if err
        robot.logger.error err
        robotResponse.send 'I\'m sorry, something went wrong :('
        return

      stats = JSON.parse body

      name = stats.Name
      mmrs = _.map stats.LeaderboardRankings, (val) ->
        return "#{ val.CurrentMMR } (#{ val.GameMode })"

      robotResponse.send "#{ name } -- #{ mmrs.join ', ' }"


  robot.respond /hots rotation/i, (robotResponse) ->

    request 'http://heroesofthestorm.github.io/free-hero-rotation', (err, httpResponse, body) ->

        if err
          robot.logger.error err
          robotResponse.send 'I\'m sorry, something went wrong :('
          return

        $ = cheerio.load body

        validFor = $ 'h2'
          .first()
          .text()

        # Adapted from https://github.com/chadrien/hots-irc-bot
        heroes = $ 'button.btn:not(.dropdown-toggle)'
          .map (i, e) -> e.children[0].data
          .slice 0, 7
          .get()

        robotResponse.send "#{ validFor }: #{ heroes.join ', ' }"


  robot.respond /hots mmr( \@[\w\d]+)?$/i, (robotResponse) ->

    username = robotResponse.match[1]?.trim().slice(1) || robotResponse.message.user.name
    user = robot.brain.usersForFuzzyName(username)[0]

    if not user?
      robotResponse.reply "Sorry, I don\'t know who #{ username } is :("
      return

    if user.hotsLogsId?
      fetchMMR user.hotsLogsId, robotResponse
    else if username?
      robotResponse.reply "Sorry, #{ username } hasn't registered their hotslogs ID.  Bully them until they do."
    else
      robotResponse.reply 'Sorry, your ID isn\'t registered. Please register your ID with `hots register <id>`, where your ID is the numeric ID for your hotslogs profile.'


  robot.respond /hots register (\d+)/i, (robotResponse) ->

    hotsLogsId = robotResponse.match[1]

    user = robot.brain.userForId robotResponse.message.user.id,
      name: robotResponse.message.user.name

    user.hotsLogsId = hotsLogsId
    robotResponse.reply "assigned #{ hotsLogsId } as your hotslogs id"
