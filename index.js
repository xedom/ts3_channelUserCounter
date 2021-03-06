const fs = require("fs")
const path = require("path")
const fetch = require("node-fetch")
const sqlite3 = require("sqlite3")
const param = process.argv[2]

const updateChannelsStatus = async (url,options,db,time) => {
  while (true) {
    console.log('-> Started update channel user counter');

    await sleep(time);
    const channelsStatus = await getChannelsStatus(url, options);
    updateChannelUserCounter(db, channelsStatus, 1);
  };
};

const sleep = time => {
  return new Promise((resolve) => {
    setTimeout(()=>{ resolve() }, time);
  });
};

const getChannelsStatus = async (url,options) => {
  const response = await fetch(url,options);
  const body = await response.json();
  const arrayChannels = await body.body;
  const channelsStats = await arrayChannels.map(x => ({ cid: x.cid, name: x.channel_name, users: x.total_clients, date: Date.now() }));

  return channelsStats;
};

const updateChannelUserCounter = (db, channelsStats, debugLevel) => {
  channelsStats.forEach(channel => {
    db.get(`SELECT * FROM channels WHERE cid=${channel.cid};`,(err,row) => {
      if (err != null) {
        if (debugLevel >= 0) console.log('-> ERROR: ', err);
      } else if (row != undefined) {
        if (row.users < channel.users) {
          db.run(`UPDATE channels SET name="${channel.name}", users=${channel.users}, date=${channel.date} WHERE cid=${channel.cid};`);
          if (debugLevel >= 1) console.log(`-> { ${(channel.name).toString().padEnd(56," ")} } \t - updated`);
        } else {
          if (debugLevel >= 2) console.log(`-> { ${(channel.name).toString().padEnd(56," ")} } \t - already updated`);
        }
      } else {
        db.run(`INSERT INTO channels (cid, name, users, date) VALUES (${channel.cid}, "${channel.name}", ${channel.users}, ${channel.date})`);
        if (debugLevel >= 1) console.log(`-> { ${(channel.name).toString().padEnd(56," ")} } \t - created`);
      };
    });
  });
};

const listAllDBChannels = (db) => {
  console.log(`  CID   \t\t\t\t  Channel Name \t\t\t\t\t Users \t\t\t Update date`);
  console.log(`----------------------------------------------------------------------------------------------------------------------------------------`);
  db.each('SELECT * FROM channels', (err, row) => {
    if (err != null) {
      if (debugLevel >= 0) console.log('-> ERROR: ', err);
    } else {
      console.log(
        `{ ${
          (row.cid).toString().padStart(3," ")
        } } \t [ ${
          (row.name).toString().padEnd(56," ")
        } ] \t\t ( ${
          (row.users == 0 ? "" : row.users).toString().padStart(2," ")
        } ) \t Updated at ${
          new Date(row.date).toLocaleString()
        } `);
    };
  });
};

const createConfig = () => {
  const configName = 'config.js'
  const configPath = path.join(__dirname, configName)
  const configBody = `module.exports = {\n\tupdateTime: 5, // in minutes\n\tdebugLevel: 1, // 0 = prints only errors, 1 = prints update informations, 2 = prints all\n\thost: "127.0.0.1", // ip of the server\n\tapi: "apikeyoftheserverquery"  // api key of your server query\n}`;

  fs.writeFile(configPath, configBody, (err) => {
    if (err) throw err;
    console.log('Config has been created');
  })
}

const main = () => {
  const cfg = require("./config.js")
  
  const url = `http://${cfg.host}:10080/1/channellist`;
  const options = {
      method: "post",
      headers: {
          'x-api-key': cfg.api,
          'Content-Type': 'application/json'
      }
  };
  const time = cfg.updateTime * 1000 * 60;
  const db = new sqlite3.Database('botDB.sqlite3');
  
  db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS channels (
      cid INTEGER,
      name TEXT,
      users INTEGER,
      date DATETIME,
      PRIMARY KEY (cid)
    );`);

    if (param == undefined || param == "") {
      updateChannelsStatus(url,options,db,time);
    } else if (param == "-w" || param == "--watch") {
      listAllDBChannels(db)
    } else if (param == "-h" || param == "--help") {
      console.log("\nIf you lauch the index.js without params: 'node index.js' it start updateding the channel. \nIf you lauch it with -w param: 'node index.js -w', it prints the channel status saved in the database.\n");
    };
  });
}


if (param == "-c" || param == "--config") {
  createConfig()
} else {
  try {
    main()
  } catch (err) {
    console.log(err.message)
  }
}