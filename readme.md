# Channel user counter for teamspeak

A small script that saves in a local database the maximum number of users reached in a given channel.

### Installation
Needed: Node.js and NPM

`npm i`

### Start up
`node index.js` starts updateding of the user counter. 

`node index.js -w` / `node index.js --watch` prints the channel status saved in the database.

`node index.js -c` / `node index.js --config` creates the config file.

### config.js
Config file needed to run the script

````javascript
module.exports = {
    updateTime: 5, // in minutes
    debugLevel: 1, // 0 = prints only errors, 1 = prints update informations, 2 = prints all
    host: "127.0.0.1", // ip of the server
    api: "apikeyoftheserverquery"  // api key of your server query
}
```