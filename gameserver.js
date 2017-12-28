var WebSocketServer = require('ws').Server;
const WebSocket = require('ws');

var wss = new WebSocketServer({port: 3434});



wss.on('connection', function(ws) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(wss.clients.size);
        }
    });
    ws.on('message', function(message) {
    wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });
});




