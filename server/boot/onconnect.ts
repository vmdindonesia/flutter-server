import { BootScript } from '@mean-expert/boot-script';

interface Socket { token: { userId: string } }

@BootScript()
class OnConnect {
  private server: any;
  private members: any;

  constructor(public app: any) {
    this.server = app;
    this.members = app.models.Members;

    app.on('started', () => this.handler());
  }

  handler(): void {
    this.server.mx.IO.on('online', (memberId: number) => {
      // Update table
      this.members.upsertWithWhere({ id: memberId }, { online: 1 }, (error: any, result: any) => {
        if (result) {
          this.server.mx.IO.emit('online-' + memberId, result);
        }
      });
    });
  }
}

module.exports = OnConnect;