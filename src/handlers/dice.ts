import { Client, Message } from 'discord.js';
import { randomBytes } from 'crypto';

module.exports = (services) => {
  const bot = services.Discord;
  const conf = services.Configuration;

  interface DiceRoll {
    sides: number;
    count: number;
    hitThreshold?: number;
  }

  function roll(sides: number): number {
    const randomNumber = parseInt(randomBytes(4).toString('hex'), 16);
    return (randomNumber % sides) + 1;
  }

  bot.registerMsgHandler('roll', (msg: Message, bot: Client) => {
    const command = `${conf.get('bot_prefix')}roll`;
    const numDiceLimit = JSON.parse(conf.get('dice_limit') || '25');
    const args = msg.content.split(/\s+/g).filter(a => !!a && a.length).slice(1);
    let totalDice = 0;
    const dice: DiceRoll[] = args.filter(a => /\s*[1-9][0-9]*d[1-9][0-9]*(h[0-9]+)?\s*/i.test(a))
    .map(d => {
      const parts = d.replace(/^\s*([0-9]+)d([0-9]+)(h([0-9]+))?\s*$/i, '$1|$2|$4').split('|').filter(p => !!p && p.length);
      const count = +parts[0];
      const sides = +parts[1];
      let hitThreshold;
      if (parts.length > 2) {
        hitThreshold = +parts[2];
      }
      totalDice += count;
      return {
        toString: () => d,
        sides: sides,
        count,
        hitThreshold
      };
    });
    if (totalDice > numDiceLimit) {
      return msg.channel.send(`I am not rolling that many dice. Please keep it under ${numDiceLimit} for my sake and yours.`);
    }
    const invalidDie = dice.find(d => d.sides >= 4294967295);
    if (invalidDie) {
      return msg.channel.send(`That's too many sides. May as well just roll a ball-bearing.`);
    }
    if (dice.length > 0) {
      const rolls = [];
      let hitsConfigured = false;
      let sum = 0;
      let hits = 0;
      dice.forEach(d => {
        if (!!d.hitThreshold || d.hitThreshold === 0) {
          hitsConfigured = true;
        }
        for (let i = 0; i < d.count; i++) {
          const result = roll(d.sides);
          let didHit = false;
          if (hitsConfigured && (!!d.hitThreshold || d.hitThreshold === 0) && result >= d.hitThreshold) {
            didHit = true;
            hits++;
          }
          rolls.push(`${result}${didHit ? '#' : ''}`);
          sum += result;
        }
      });
      return msg.channel.send(
        `Rolling ${dice.join(', ')}:\n**Total: ${sum}${hitsConfigured ? ` | Hits: ${hits}` : ''}**\n*Rolls: (${rolls.join(', ')})*`
      );
    }

    // reply with help
    const helpMessage = '```'
    + `\n${command} usage:`
    + `\n\t${command}                     \tShow this help`
    + `\n\t${command} <x>d<y>             \troll X dices with Y sides each`
    + `\n\t${command} <x1>d<y1> <x2>d<y2> \troll multiple combos of dice`
    + '\n```';
    return msg.channel.send(helpMessage);

  });

}
