import { Client, Message, TextChannel } from 'discord.js';
import { ConfigurationService } from '../services/configuration';

module.exports = (services) => {
  const bot = services.Discord;
  const conf: ConfigurationService = services.Configuration;

  bot.registerMsgHandler('faq', (msg: Message, bot: Client) => {
    const command = `${conf.get('bot_prefix')}faq`;

    if (msg.channel.type !== 'dm') {
      msg.delete({reason: 'too public'});
      if (!msg.author.dmChannel) {
        return msg.author.createDM()
        .then(dmChannel => {
          dmChannel.send(
            'Woah there! you almost asked the quiet part out loud!'
            + ' Let\'s chat here instead, and I\'ll ask anonymously for you in public'
          );
        })
      }
      return msg.author.dmChannel.send('Woah there! you almost asked the quiet part out loud!'
      + ' Let\'s chat here instead, and I\'ll ask anonymously for you in public');
    }
    const question = msg.content.replace(command, '').trim();
    if (question && question.length) {
      const faqChannelId = conf.get('faq_channel');
      if (faqChannelId) {
        return bot.channels.fetch(faqChannelId)
        .then(
          faqChannel => {
            if (faqChannel && faqChannel.type === 'text') {
              (faqChannel as TextChannel).send(
                '*An anonymous user has a question!*'
                + '\n```'
                + `\n${question}`
                + '\n```',
              );
            } else {
              return msg.channel.send('Whoops! the configured faq channel seems to be invalid!');
            }
          },
          err => {
            return msg.channel.send('Whoops! the configured faq channel seems to be invalid!');
          }
        )
      }

    }

    // reply with help
    const helpMessage = '```'
    + `\n${command} usage:`
    + `\n USE IN DMs ONLY!`
    + `\n\t${command}               \tShow this help`
    + `\n\t${command} <A Question>  \tAsk a question anonymously`
    + '\n```';
    return msg.channel.send(helpMessage);
  })

}
