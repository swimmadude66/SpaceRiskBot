import { Client, Guild, GuildChannel, GuildMember, Message, Role, TextChannel, User } from 'discord.js';

module.exports = (services) => {
  const discord = services.Discord;
  const conf = services.Configuration;

  function getHuddleServer(msg: Message, bot: Client): Promise<Guild> {
    const huddleGuildId = conf.get('huddle_guild');
    if (!huddleGuildId) {
      return bot.guilds.create(`${msg.guild.name}_huddles`, {
        channels: [
          { name: 'huddles', type: 'category' as any }
        ],

      })
        .then(huddleGuild => {
          conf.set(`huddle_guild`, huddleGuild.id);
          return huddleGuild;
        }, err => {
          console.error(err);
          return null;
        })
    } else {
      return bot.guilds.fetch(huddleGuildId)
        .catch(err => {
          conf.set(`huddle_guild`, undefined);
          return getHuddleServer(msg, bot);
        });
    }
  }

  function getHuddleChannel(guild: Guild, members: GuildMember[], channelName: string): Promise<TextChannel> {
    const guildChannels = guild.channels.valueOf();
    const huddleCategory = guildChannels.find(c => c.type === 'category' && c.name === 'huddles');
    const existingChannel = guildChannels.find(c => c.name === channelName && c.type === 'text' && c.parent.equals(huddleCategory));
    const blockEveryone = {
      id: guild.roles.everyone.id,
      type: 'role' as any,
      deny: 1024
    };

    const allowed = members
      .map(m => {
        return {
          id: m.id,
          type: 'member' as any,
          allow: 1024
        };
      });
    if (existingChannel) {
      return (existingChannel as TextChannel).overwritePermissions([
        blockEveryone,
        ...allowed
      ]);
    }

    return guild.channels.create(channelName, {
      type: 'text',
      parent: huddleCategory,
      permissionOverwrites: [
        blockEveryone,
        ...allowed
      ]
    });
  }

  discord.registerMsgHandler('huddle', (msg: Message, bot: Client) => {
    const command = `${conf.get('bot_prefix')}huddle`;
    if (!msg.guild) {
      return msg.channel.send('This command only works in server-channels');
    }
    const userMap = {
      [msg.author.username]: msg.author,
      [bot.user.username]: bot.user
    };
    if (msg.mentions && msg.mentions.users) {
      msg.mentions.users.forEach(u => {
        userMap[u.username] = u;
      });
    }
    if (msg.mentions && msg.mentions.roles) {
      msg.mentions.roles.forEach(r => {
        r.members.forEach(m => {
          userMap[m.user.username] = m.user;
        });
      });
    }
    if (msg.mentions && msg.mentions.everyone) {
      const everyone = msg.guild.members.valueOf().filter(m => m.permissionsIn(msg.channel).has(1024));
      everyone.forEach(m => {
        userMap[m.user.username] = m.user;
      });
    }
    const users = Object.keys(userMap).map(un => userMap[un]);
    const noBots = users.filter(u => !u.bot);
    if (noBots.length >= 2) {
      const usernames = noBots.map(u => u.username);
      const channelName = `${usernames.sort().join('-')}`.toLowerCase().trim();
      return getHuddleServer(msg, bot)
        .then(
          guild => {
            const existingMembers = [];
            const newMembers = [];
            users.forEach(u => {
              const gMember = guild.members.valueOf().find(m => m.user.id === u.id);
              if (gMember && gMember.id) {
                existingMembers.push(gMember);
              } else {
                newMembers.push(u);
              }
            });
            return getHuddleChannel(guild, existingMembers, channelName)
              .then(huddleChannel => {
                return huddleChannel.createInvite({
                  maxUses: usernames.length,
                  reason: 'SECRET HUDDLE!',
                }).then(invite => {
                  const invitePromises = newMembers.map(u => {
                    return u.createDM()
                      .then(dm => {
                        return dm.send(`Join the secret huddle! ${invite.url}`);
                      })
                  });
                  return Promise.all([
                    ...(invitePromises || []),
                    huddleChannel.send('Welcome to your new private huddle!')
                  ]);
                })
              });
          },
          err => {
            console.error(err);
            return msg.channel.send('Could not fetch the configured huddle server');
          }
        )
    }

    // reply with help
    const helpMessage = '```'
      + `\n${command} usage:`
      + `\n\t${command}                            \tShow this help`
      + `\n\t${command} <...@user1 @user2>         \tStart a private huddle with these users`
      + '\n```';
    return msg.channel.send(helpMessage);
  });

  discord.registerJoinHandler('huddleJoin', (member: GuildMember, bot: Client) => {
    if (member.guild && member.guild.id && member.guild.id === conf.get('huddle_guild')) {
      const huddleCategory = member.guild.channels.valueOf().find(c => c.type === 'category' && c.name === 'huddles');
      const userHuddles = member.guild.channels.valueOf()
        .filter(c => {
          return new RegExp(`(^|-)${member.user.username.toLowerCase()}`).test(c.name)
            && c.parentID === (huddleCategory && huddleCategory.id);
        });
      const permissionPromises = (userHuddles).map(h => {
        return h.overwritePermissions([
          ...(Array.from(h.permissionOverwrites.values())),
          {
            id: member.guild.roles.everyone.id,
            type: 'role' as any,
            deny: 1024
          },
          {
            id: member.id,
            type: 'member',
            allow: 1024
          }
        ])
      });
      return Promise.all(permissionPromises);
    }
  });
}
