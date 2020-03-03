const fs = require('fs');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');
const babel = require('@babel/core');

module.exports = class TranslationsManager {
  /**
   * @typedef TMOptions
   * @property {string} [source] Path (glob) to source files.
   * @property {object[]} [messages] Array of the messages extracted by `babel-plugin-react-intl`.
   * @property {string} [messagesDir] Directory with messages extracted by `babel-plugin-react-intl`.
   * @property {string} translationsDir Translations directory.
   * @property {string[]} locales Locales to maintain.
   * @property {string} [defaultLocale] Default locale.
   */

  /**
   * @typedef TMResult
   * @property {string} locale
   * @property {object} translation
   * @property {[string, string][]} added
   * @property {[string, string][]} removed
   * @property {[string, string][]} untranslated
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
   * Writes translation json file.
   * @param {string} locale
   * @param {object} translation
   */
  writeTranslationFile(locale, translation) {
    const p = this.translationFilePath(locale);
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(translation, null, 2) + '\n');
  }

  /**
   * Extracts messages from the source files using babel.
   * @return {object[]|undefined}
   */
  extractMessages() {
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
    const { locale, translation, added, removed, untranslated } = result;
    const filePath = this.translationFilePath(locale);
    const createReducer = (kColor, vColor = kColor) => (acc, [k, v]) =>
      acc + '\n  ' + kColor(k) + ': ' + vColor(v);

    let report = '';

    if (added.length === 0 && removed.length === 0) {
      report += '📄 ' + chalk.bold.underline.green(filePath) + ': (No changes)';
      return report;
    } else {
      report += '📄 ' + chalk.bold.underline.yellow(filePath);
      report += `: (${added.length} added, ${removed.length} removed)`;
    }
    if (options.short) {
      report += '\n';
      return report;
    }
    if (added.length > 0) {
      report += `\n(+) Added:`;
      report += added.reduce(createReducer(chalk.green), '');
    }
    if (removed.length > 0) {
      report += `\n(-) Removed:`;
      report += removed.reduce(createReducer(chalk.red), '');
    }
    if (untranslated.length > 0) {
      report += `\n(!) Not translated:`;
      report += untranslated.reduce(createReducer(chalk.yellow), '');
    }
    report += '\n';
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
      throw new TypeError('"translationsDir" is required');
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
      const translation = this.readTranslationFile(locale) || {};
      const untranslated = [];
      const removed = [];
      const added = [];

      for (let key in translation) {
        if (key in template) continue;
        removed.push([key, translation[key]]);
        delete translation[key];
      }

      for (let key in template) {
        const val = template[key];
        if (key in translation) {
          if (locale !== defaultLocale && translation[key] === val) {
            untranslated.push([key, translation[key]]);
          }
        } else {
          added.push([key, val]);
          translation[key] = val;
        }
      }

      this.translations.push({ locale, translation, added, removed, untranslated });
    }
  }
};
