import { Message } from 'discord.js';
import { readFileSync, writeFileSync } from 'fs';

const DEFAULT_CONFIGS = {
  bot_prefix: '?'
};

export class ConfigurationService {

  private _configuration = {...DEFAULT_CONFIGS};
  private _fileCache: boolean = true;

  constructor(
    private _confFile: string
  ) {
    if (this._confFile && this._confFile.length) {
      let cacheFileExists = false;
      try {
        const cachedConfString = readFileSync(this._confFile).toString();
        const cachedConf = JSON.parse(cachedConfString);
        if (cachedConf) {
          this._configuration = cachedConf;
          cacheFileExists = true;
        }
      } catch (e) {
        console.error(e);
      }
      if (!cacheFileExists) {
        try {
          writeFileSync(this._confFile, JSON.stringify(this._configuration));
        } catch (e) {
          console.error('Config file not writable, operating in-memory only with default configs');
          this._fileCache = false;
        }
      }
    } else {
      console.error('Config file not provided, operating in-memory only with default configs');
    }
  }

  set(key: string, value: any): any {
    const keyParts = key.split(/\./g).filter(k => !!k && k.length);
    let parent = this._configuration;
    keyParts.forEach((k, i) => {
      if (i === keyParts.length - 1) {
        // last one, assign value;
        parent[k] = value;
        return;
      }
      if (k in parent) {
        parent = parent[k];
      } else {
        parent[k] = {};
        parent = parent[k];
      }
    });
    if (this._fileCache) {
      try {
        writeFileSync(this._confFile, JSON.stringify(this._configuration));
      } catch (e) {
        console.error('Config file not writable, operating in-memory only with default configs');
        this._fileCache = false;
      }
    }
  }

  get(key: string): any {
    const keyParts = key.split(/\./g).filter(k => !!k && k.length);
    let parent = this._configuration;
    for(let i = 0; i < keyParts.length - 1; i++) {
      const k = keyParts[i];
      if (k in parent) {
        parent = parent[k];
      } else {
        return null;
      }
    }
    const finalKey = keyParts[keyParts.length-1];
    if (parent && (finalKey in parent)) {
      return parent[finalKey];
    } else {
      return null;
    }
  }

  getAll(): string {
    return JSON.stringify(this._configuration, null, 4);
  }

  hydrateTokens(template: string, msg: Message) {
    return template.replace('{{GUILD}}', (msg.guild && msg.guild.id))
    .replace('{{CHANNEL}}', (msg.channel && msg.channel.id))
    .replace('{{ME_ID}}', (msg.author && msg.author.id))
    .replace('{{ME_NAME}}', (msg.author && msg.author.username))
    .replace('{{NOW}}', new Date(msg.createdTimestamp).toString())
    ;
  }
}
