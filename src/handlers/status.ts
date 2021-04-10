import { Client, Message } from 'discord.js';
import { ConfigurationService } from '../services/configuration';

module.exports = (services) => {
  const bot = services.Discord;
  const conf: ConfigurationService = services.Configuration;

  bot.registerMsgHandler('status', (msg: Message, bot: Client) => {
    const botOwner = conf.get('bot_owner');
    if (botOwner && botOwner !== msg.author.id) {
      return msg.channel.send('Sorry! only certain users can update my status!');
    }
    const newStatus = msg.content.replace(/^.*?status\s+(.*)$/, '$1');
    conf.set(`bot_status`, newStatus);
    return bot.user.setActivity({
      name: newStatus,
      type: 'PLAYING',
    }).then(
      _ => msg.channel.send('Status updated!')
    );
  });

}
