								A simple app node app

Requires : ws (node.js websocket component) 

Server can be started with : node gameserver.js (starts on port 3434)
The game.html files can be served statically via any static content server (no dependencies)

Process : 
1. Player find others via gameserver
2. Once players find others establish a data channel (WebRTC) 
3. Disconnect with webserver and can continue the game
4. Once game is won by one player it disconnects the peers
4. Public STUN server (google / mozilla) are used

