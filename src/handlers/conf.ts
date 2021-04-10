import { Client, Message } from 'discord.js';

module.exports = (services) => {
  const bot = services.Discord;
  const conf = services.Configuration;

  bot.registerMsgHandler('conf', (msg: Message, bot: Client) => {
    const botOwner = conf.get('bot_owner');
    const confArgs = msg.content.split(/\s+/g).filter(a => !!a && a.length);
    if (confArgs.length >= 4) {
      confArgs[3] = confArgs.slice(3).join(' ');
    }
    if (confArgs.length === 4 && confArgs[1].toLowerCase() === 'set') {
      if (botOwner && botOwner !== msg.author.id) {
        return msg.channel.send('Sorry! only certain users can update my configs!');
      }
      // do set
      const key = confArgs[2];
      const value = confArgs[3];
      conf.set(key, value);
      return msg.channel.send(
        'Config Set!'
        + '\n```'
        + `\n${key}:${value}`
        + '\n```'
      );
    }
    if (confArgs.length > 1 && confArgs[1].toLowerCase() === 'get') {
      if (confArgs.length === 2) {
        // get all
        return msg.channel.send(
          '```'
          + `\n${conf.getAll()}`
          + '\n```'
        );
      }
      if (confArgs.length === 3) {
        // get one key
        const key = confArgs[2];
        return msg.channel.send(
          '```'
          + `\n${key}:${JSON.stringify(conf.get(key))}`
          + '\n```'
        );
      }
    }

    // reply with help
    const command = `${conf.get('bot_prefix')}conf`
    const helpMessage = '```'
    + `\n${command} usage:`
    + `\n\t${command}                   \tShow this help`
    + `\n\t${command} get               \tList all configs`
    + `\n\t${command} get <key>         \tGet current config value`
    + `\n\t${command} set <key> <value> \tSet config value`
    + '\n```';
    return msg.channel.send(helpMessage);
  });

}
