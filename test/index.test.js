const fs = require('fs');
const path = require('path');
const TranslationsManager = require('../lib');

describe('TranslationsManager', () => {
  const tmpDir = 'test/tmp';
  const translationsDir = path.join(tmpDir, 'translations');

  const messages1 = [
    { id: 'message_1', defaultMessage: 'Message 1' },
    { id: 'message_2', defaultMessage: 'Message 2' },
    { id: 'message_3', defaultMessage: 'Message 3' },
  ];

  const messages2 = [
    { id: 'message_3', defaultMessage: 'Message 3' },
    { id: 'message_4', defaultMessage: 'Message 4' },
  ];

  function translationFilePath(locale) {
    return path.join(translationsDir, locale + '.json');
  }

  function readTranslation(locale) {
    return JSON.parse(fs.readFileSync(translationFilePath(locale), 'utf-8'));
  }

  function writeTranslation(locale, content) {
    fs.writeFileSync(translationFilePath(locale), JSON.stringify(content, null, 2) + '\n');
  }

  beforeAll(() => fs.mkdirSync(tmpDir, { recursive: true }));
  afterAll(() => fs.rmdirSync(tmpDir, { recursive: true }));

  describe('options validation', () => {
    test('throws an error when options are not valid', () => {
      expect(() => new TranslationsManager({})).toThrowErrorMatchingInlineSnapshot(
        `"Please provide one of \\"messages\\", \\"messagesDir\\", or \\"source\\" options"`
      );

      expect(() => new TranslationsManager({ messages: [] })).toThrowErrorMatchingInlineSnapshot(
        `"Please provide \\"translationsDir\\" option"`
      );
    });

    test('reads messages from json files in `messagesDir`', () => {
      const res = new TranslationsManager({
        messagesDir: 'test/fixtures/messages',
        locales: ['en', 'de'],
        defaultLocale: 'en',
        translationsDir,
      }).results();

      expect(res).toHaveLength(2);
      expect(res[0].translation).toMatchSnapshot();
    });
  });

  describe('.writeFiles()', () => {
    test('writes translation files', () => {
      expect(fs.existsSync(translationFilePath('en'))).toBe(false);
      expect(fs.existsSync(translationFilePath('de'))).toBe(false);

      new TranslationsManager({
        messages: messages1,
        locales: ['en', 'de'],
        defaultLocale: 'en',
        translationsDir,
      }).writeFiles();

      expect(readTranslation('en')).toMatchSnapshot();
      expect(readTranslation('de')).toMatchSnapshot();
    });

    test('updates translation files', () => {
      new TranslationsManager({
        messages: messages2,
        locales: ['en', 'de'],
        defaultLocale: 'en',
        translationsDir,
      }).writeFiles();

      expect(readTranslation('en')).toMatchSnapshot();
      expect(readTranslation('de')).toMatchSnapshot();
    });

    test('keeps translations untouched', () => {
      writeTranslation('en', {
        message_3: 'Message three',
        message_4: 'Message four',
      });

      writeTranslation('de', {
        message_3: 'Nachricht drei',
        message_4: 'Nachricht vier',
      });

      new TranslationsManager({
        messages: messages2,
        locales: ['en', 'de'],
        defaultLocale: 'en',
        translationsDir,
      }).writeFiles();

      expect(readTranslation('en')).toMatchSnapshot();
      expect(readTranslation('de')).toMatchSnapshot();
    });
  });

  describe('.report()', () => {
    test('prints the report to the console', () => {
      const log = console.log;
      console.log = jest.fn();

      const tm = new TranslationsManager({
        messagesDir: 'test/fixtures/messages',
        locales: ['en', 'de'],
        defaultLocale: 'en',
        translationsDir,
      });

      tm.report();
      expect(console.log).toHaveBeenCalledTimes(2);
      expect(console.log.mock.calls[0]).toMatchSnapshot();

      tm.report({ short: true });
      expect(console.log.mock.calls[2]).toMatchSnapshot();
      console.log = log;
    });
  });
});
