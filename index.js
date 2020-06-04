const fetch = require("node-fetch")
const sqlite3 = require("sqlite3").verbose()
const cfg = require("./config.js")

const main = async (cfg) => {
  const url = `http://${cfg.host}:10080/1/channellist`
  const options = {
      method: "post",
      headers: {
          'x-api-key': cfg.api,
          'Content-Type': 'application/json'
      }
  }

  const response = await fetch(url,options)
  const body = await response.json()
  const arrayChannels = body.body
  const channelsStats = arrayChannels.map(x => ({ cid: x.cid, name: x.channel_name, users: x.total_clients, date: Date.now() }))

  const db = new sqlite3.Database('botDB.sqlite3')
  db.serialize(() => {

    db.run(`
    CREATE TABLE IF NOT EXISTS channels (
      cid INTEGER,
      name TEXT,
      users INTEGER,
      date DATETIME,
      PRIMARY KEY (cid)
    );`);

    updateChannelUserCounter(db, channelsStats, 1)

    listAllDBChannels(db)

  })
}

const updateChannelUserCounter = (db, channelsStats, debugLevel) => {
  channelsStats.forEach(channel => {
    db.get(`SELECT * FROM channels WHERE cid=${channel.cid};`,(err,row) => {
      if (err != null) {
        if (debugLevel >= 0) console.log('-> ERROR: ', err)
      } else if (row != undefined) {
        if (row.users < channel.users) {
          db.run(`UPDATE channels SET name="${channel.name}", users=${channel.users}, date=${channel.date} WHERE cid=${channel.cid};`)
          if (debugLevel >= 1) console.log(`-> { ${(channel.name).toString().padEnd(56," ")} } \t - updated`)
        } else {
          if (debugLevel >= 2) console.log(`-> { ${(channel.name).toString().padEnd(56," ")} } \t - already updated`)
        }
      } else {
        db.run(`INSERT INTO channels (cid, name, users, date) VALUES (${channel.cid}, "${channel.name}", ${channel.users}, ${channel.date})`)
        if (debugLevel >= 1) console.log(`-> { ${(channel.name).toString().padEnd(56," ")} } \t - created`)
      }
    });
  });
}

const listAllDBChannels = (db) => {
  db.each('SELECT * FROM channels', (err, row) => {
    if (err != null) {
      if (debugLevel >= 0) console.log('-> ERROR: ', err)
    } else {
      console.log(
        `{ ${
          (row.cid).toString().padStart(3," ")
        } } [ ${
          (row.name).toString().padEnd(56," ")
        } ] \t ${
          (row.users == 0 ? "" : row.users).toString().padStart(2," ")
        } \t Updated at ${
          new Date(row.date).toLocaleString()
        } `)
    }
  })
}

main(cfg[0])