import { BootScript } from '@mean-expert/boot-script';

interface Socket { token: { userId: string } }

@BootScript()
class OnDisconnect {
  private server: any;
  private members: any;

  constructor(public app: any) {
    this.server = app;
    this.members = app.models.Members;

    app.on('socket-disconnect', (socket: Socket) => this.handler(socket));
  }

  handler(socket: Socket): void {
    if (socket.token && socket.token.userId) {
      let id = socket.token.userId;
      
      // Update table
      this.members.upsertWithWhere({ id: id }, { online: 0 }, (error: any, result: any) => {
        if (result) {
          this.server.mx.IO.emit('online-' + socket.token.userId, result);
        }
      });
      console.log('An authenticated user has been disconnected:', socket.token.userId);
    } else {
      console.log('An anonymous user has been disconnected');
    }
  }
}

module.exports = OnDisconnect;