// Import the discord.js module
import {Client, GuildMember, Message} from 'discord.js';
import { Subject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ConfigurationService } from './configuration';

export type MsgHandler = (msg: Message, client: Client) => Promise<Message> | void;
export type JoinHandler = (member: GuildMember, client: Client) => any;

export class DiscordService {

  private _client: Client;
  private _msgBus = new Subject<Message>();
  private _userAddBus = new Subject<GuildMember>();

  private _handlers: {[type: string]: {[pattern: string]: Subscription}} = {};

  private _repliedMessages: {[msgId: string]: Message} = {};

  constructor(
    private _token: string, // Discord auth token
    private _conf: ConfigurationService
  ) {
    if (!this._token || this._token.length < 1) {
      console.error('Discord token is required');
      process.exit(1);
    }

    const client = new Client();
    this._client = client;
    client.on('ready', () => {
      console.log('I am ready!');
      const status = this._conf.get(`bot_status`) || '';
      client.user.setActivity(status, {type: 'PLAYING'});
    });

    client.on('guildMemberAdd', (member) => {
      this._userAddBus.next(member);
    });

    client.on('message', message => {
      const prefix = this._conf.get('bot_prefix') || '?';
      if (
        message.content.indexOf(prefix) === 0 // only check for triggers at the start
        && !message.author.bot // no bot replies
      ) {
        message.content = this._conf.hydrateTokens(message.content, message);
        this._msgBus.next(message);
      }
    });

    client.on('messageDelete', message => {
      if (message.id in this._repliedMessages) {
        const reply = this._repliedMessages[message.id];
        if (reply && reply.deletable) {
          this._repliedMessages[message.id].delete({reason: 'trigger deleted'});
        }
      }
    });

    client.login(this._token);
  }

  registerMsgHandler(triggerName: string, handler: MsgHandler): any {
    const trigger = (triggerName || '').toLowerCase().trim();
    if (!this._handlers['message']) {
      this._handlers.message = {};
    }
    if (this._handlers.message[trigger]) {
      try {
        this._handlers.message[trigger].unsubscribe();
      } catch (e) {
        // do nothing
      }
    }
    this._handlers.message[trigger] = this._msgBus.pipe(
      filter(m => (m.content || '').toLowerCase().indexOf(trigger) === 1) // account for prefix
    ).subscribe(msg => {
      if ('handled' in msg) {
        return;
      }
      msg['handled'] = true;
      const prom = handler(msg, this._client);
      if (prom && 'then' in prom) {
        prom
        .then(
          res => {
            if (res && res.id) {
              this._repliedMessages[msg.id] = res;
            }
          }
        )
      }
    });
  }

  registerJoinHandler(name: string, handler: JoinHandler): any {
    if (!this._handlers['joins']) {
      this._handlers.joins = {};
    }
    if (this._handlers.joins[name]) {
      try {
        this._handlers.joins[name].unsubscribe();
      } catch (e) {
        // do nothing
      }
    }
    this._handlers.joins[name] = this._userAddBus.pipe()
    .subscribe(member => {
      if ('handled' in member) {
        return;
      }
      member['handled'] = true;
      const prom = handler(member, this._client);
    });
  }
}
