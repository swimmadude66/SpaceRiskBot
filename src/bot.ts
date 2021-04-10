import { config } from 'dotenv';
import { join } from 'path';
import { ConfigurationService } from './services/configuration';
import { DiscordService } from './services/discord';

config({});

const conf = new ConfigurationService(
  process.env.CONF_FILE || join(__dirname, '../conf.json')
);

const discordService = new DiscordService(
  process.env.DISCORD_TOKEN,
  conf
);

const services = {
  Discord: discordService,
  Configuration: conf
};

require('./handlers/conf')(services);
require('./handlers/faq')(services);
require('./handlers/huddle')(services);
require('./handlers/status')(services);
require('./handlers/dice')(services);


discordService.registerMsgHandler('ping', (msg) => {
  console.log(JSON.stringify(msg, null, 2));
  return msg.channel.send('pong');
});

discordService.registerMsgHandler('servers', (msg, bot) => {
  const servers = bot.guilds.valueOf();
  console.log(servers);
  return msg.channel.send(JSON.stringify(servers.map(s => s.name)));
});

discordService.registerMsgHandler('serverCleanup', (msg, bot) => {
  const botOwner = conf.get('bot_owner');
  if (botOwner && botOwner !== msg.author.id) {
    return msg.channel.send('Sorry! only certain users can manage my servers!');
  }
  const defaultServer = conf.get('default_server');
  const servers = bot.guilds.valueOf();
  const deletes = [];
  servers.forEach(s => {
    if (s.id !== msg.guild.id && s.id !== defaultServer) {
      deletes.push(s.delete());
    }
  })
  return Promise.all(deletes).then(
    _ => {
      return msg.channel.send('Deleted other servers');
    }
  );
});
