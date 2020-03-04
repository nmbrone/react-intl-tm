const fs = require('fs');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');

let babel;

try {
  babel = require('@babel/core');
} catch (e) {
  // babel not available
}

module.exports = class TranslationsManager {
  /**
   * @typedef TMOptions
   * @property {string} [source] Path (glob) to source files.
   * @property {object[]} [messages] Array of the messages extracted by `babel-plugin-react-intl`.
   * @property {string} [messagesDir] Path to directory with messages extracted by `babel-plugin-react-intl`.
   * @property {string} translationsDir Path to directory with translations files.
   * @property {string[]} locales Array of locales to maintain.
   * @property {string} [defaultLocale] Default locale.
   */

  /**
   * @typedef TMResult
   * @property {string} locale
   * @property {object} translation
   * @property {object} added
   * @property {object} removed
   * @property {object} untranslated
   */

  /**
   * @typedef TMReportOptions
   * @property {boolean} [short] Whether to print only short report.
   */

  /**
   * @param {TMOptions} options Options
   */
  constructor(options) {
    this.options = options;
    /** @type {TMResult[]} */
    this.translations = [];
    this._validateOptions();
    this.reload();
  }

  /**
   * Performs all necessary work.
   * @return {TranslationsManager}
   */
  reload() {
    this._resolveMessages();
    this._buildTemplate();
    this._perform();
    return this;
  }

  /**
   * Returns path to translation file.
   * @param {string} locale
   * @return {string}
   */
  translationFilePath(locale) {
    return path.join(this.options.translationsDir, locale + '.json');
  }

  /**
   * Reads translation json file.
   * @param {string} locale
   * @return {undefined|{}}
   */
  readTranslationFile(locale) {
    const p = this.translationFilePath(locale);
    try {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch (error) {
      if (error.code === 'ENOENT') return undefined;
      throw error;
    }
  }

  /**
   * Returns stringified content for translation file.
   * @param {object} translation
   * @return {string}
   */
  stringifyTranslationFile(translation) {
    return this.stringify(translation) + '\n';
  }

  /**
   * Writes translation file.
   * @param {string} locale
   * @param {object} translation
   */
  writeTranslationFile(locale, translation) {
    const p = this.translationFilePath(locale);
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, this.stringifyTranslationFile(translation));
  }

  /**
   * Same as JSON.stringify().
   * @param {*} obj
   * @return {string}
   */
  stringify(obj) {
    return JSON.stringify(obj, null, 2);
  }

  /**
   * Extracts messages from the source files using babel.
   * @return {object[]|undefined}
   */
  extractMessages() {
    if (!babel) {
      throw new Error(
        'Babel required when you want to extract messages directly from source files. ' +
          'Please install "@babel/core" package from npm.'
      );
    }
    const options = babel.loadOptions();
    return glob.sync(this.options.source).reduce((acc, filePath) => {
      const res = babel.transformFileSync(filePath, options);
      return acc.concat(res.metadata['react-intl'].messages);
    }, []);
  }

  /**
   * Reads messages from messages directory.
   * @return {object[]|undefined}
   */
  readMessages() {
    const pattern = path.join(this.options.messagesDir, '/**/*.json');
    return glob.sync(pattern).reduce((acc, p) => {
      const json = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return acc.concat(json);
    }, []);
  }

  /**
   * Renders translation report.
   * @param {TMResult} result
   * @param {TMReportOptions} options
   * @return {string}
   */
  renderTranslationReport(result, options = {}) {
    const { locale } = result;
    const added = Object.entries(result.added);
    const removed = Object.entries(result.removed);
    const untranslated = Object.entries(result.untranslated);
    const filePath = this.translationFilePath(locale);
    const createReducer = (kColor, vColor = kColor) => (acc, [k, v]) =>
      acc + '\n  ' + kColor(k) + ': ' + vColor(v === '' ? '""' : v);

    let report = '';

    if (added.length === 0 && removed.length === 0 && untranslated.length === 0) {
      report += '📄 ' + chalk.bold.underline.green(filePath) + ': ' + chalk.green('✓');
    } else {
      report += '📄 ' + chalk.bold.underline.yellow(filePath) + ': (';
      report += Object.entries({ added, removed, untranslated })
        .map(([k, v]) => [k, v.length])
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${v} ${k}`)
        .join(', ');
      report += ')';
    }
    if (options.short) {
      return report;
    }
    if (added.length > 0) {
      report += `\n(+) Added:`;
      report += added.reduce(createReducer(chalk.green, chalk.grey), '');
    }
    if (removed.length > 0) {
      report += `\n(-) Removed:`;
      report += removed.reduce(createReducer(chalk.red, chalk.grey), '');
    }
    if (untranslated.length > 0) {
      report += `\n(!) Untranslated:`;
      report += untranslated.reduce(createReducer(chalk.yellow, chalk.grey), '');
    }
    return report;
  }

  /**
   * Prints the report to the console via `console.log()`.
   * @param {TMReportOptions} [options]
   * @return {TranslationsManager}
   */
  report(options) {
    for (let translation of this.translations) {
      console.log(this.renderTranslationReport(translation, options));
    }
    return this;
  }

  /**
   * Writes translation files.
   * @return {TranslationsManager}
   */
  writeFiles() {
    for (let { locale, translation } of this.translations) {
      this.writeTranslationFile(locale, translation);
    }
    return this;
  }

  /**
   * Returns results of manager work.
   * @return {TMResult[]}
   */
  results() {
    return this.translations;
  }

  _validateOptions() {
    const { messages, messagesDir, source, translationsDir } = this.options;
    if (!messages && !messagesDir && !source) {
      throw new TypeError('Please provide one of "messages", "messagesDir", or "source" options');
    }
    if (!translationsDir) {
      throw new TypeError('Please provide "translationsDir" option');
    }
  }

  _resolveMessages() {
    const { messages, messagesDir, source } = this.options;
    if (Array.isArray(messages)) {
      this.messages = messages;
    } else if (messagesDir) {
      this.messages = this.readMessages();
    } else if (source) {
      this.messages = this.extractMessages();
    } else {
      throw new Error('Messages required');
    }
  }

  _buildTemplate() {
    this.template = this.messages.reduce((acc, { id, defaultMessage }) => {
      acc[id] = defaultMessage;
      return acc;
    }, {});
  }

  _perform() {
    const defaultLocale = this.options.defaultLocale;
    const template = this.template;

    for (let locale of this.options.locales) {
      const isDefault = locale === defaultLocale;
      const file = this.readTranslationFile(locale) || {};
      const translation = {};
      const untranslated = {};
      const removed = {};
      const added = {};

      for (let key in template) {
        const defaultMessage = template[key];
        if (key in file) {
          const message = file[key];
          translation[key] = message;
          if (!isDefault && message === defaultMessage) untranslated[key] = message;
        } else {
          translation[key] = isDefault ? defaultMessage : '';
          added[key] = translation[key];
        }
      }

      for (let key in file) {
        if (key in translation) continue;
        removed[key] = file[key];
      }

      this.translations.push({ locale, translation, added, removed, untranslated });
    }
  }
};
