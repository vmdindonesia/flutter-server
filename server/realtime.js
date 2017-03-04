'use strict';

module.exports = function (socket) {
  // Room chat (private chat by room id)
  socket.on('room', function(matchId) {
    socket.join(matchId);
  });
}