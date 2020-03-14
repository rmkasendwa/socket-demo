require('dotenv-override').config({ override: true });
const app = require('express')();
const cors = require('cors');
const _ = require('underscore');
app.use(cors());
const server = require('http').createServer(app).listen(process.env.SOCKET_PORT);
const io = require('socket.io').listen(server);
console.log(`
Socket server has been started.
  Local: http://localhost:${process.env.SOCKET_PORT.trim()}/
`);
const connectedSockets = [];
const connectedAdminSockets = [];
const connectedClientSockets = [];
const broadcastClientSocketConnections = function() {
	connectedAdminSockets.forEach(adminSocket => {
		adminSocket.emit('message', {
			type: "CLIENT_CONNECTIONS",
			body: connectedClientSockets.map(clientSocket => {
				return {
					socketId: clientSocket.id,
					connectionTime: clientSocket.handshake.time
				};
			})
		});
	});
};
io.set("transports", ["websocket"]);
io.on('connection', connectingSocket => {
	connectingSocket.on('disconnect', () => {
		connectedSockets.splice(connectedSockets.indexOf(connectingSocket), 1);
		if (connectedAdminSockets.includes(connectingSocket)) {
			connectedAdminSockets.splice(connectedAdminSockets.indexOf(connectingSocket), 1);
		}
		if (connectedClientSockets.includes(connectingSocket)) {
			connectedClientSockets.splice(connectedClientSockets.indexOf(connectingSocket), 1);
		}
		broadcastClientSocketConnections();
	});
	connectingSocket.on('create-notification', () => {
		// TODO: Create Notification
	});
	connectingSocket.on('dispatch-notification', () => {
		// TODO: Dispatch Notification
	});
	connectedSockets.push(connectingSocket);
	switch (connectingSocket.handshake.query['x-subscriber-type']) {
		case "CLIENT":
			connectedClientSockets.push(connectingSocket);
			break;
		case "ADMIN":
			connectingSocket.on('message', payload => {
				switch (payload.type) {
					case "REMOTE_CLIENT_MESSAGE":
						if (payload.socketId) {
							const remoteClient = _.find(connectedClientSockets, { id: payload.socketId });
							if (remoteClient) {
								remoteClient.emit('message', payload.message);
							}
						} else {
							connectedClientSockets.forEach(clientSocket => clientSocket.emit('message', payload.message));
						}
						break;
				}
			});
			connectedAdminSockets.push(connectingSocket);
			break;
	}
	broadcastClientSocketConnections();
});
