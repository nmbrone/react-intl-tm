# Translations manager for react-intl

### Installing

```
yarn add --dev react-intl-tm
```
or
```
npm i --save-dev react-intl-tm
```

### Usage examples

#### Read messages from a folder

```javascript
const Manager = require('react-intl-tm');

new Manager({
  messagesDir: 'app/messages',
  translationsDir: 'app/translations',
  locales: ['en', 'de'],
  defaultLocale: 'en',
})
  .writeFiles()
  .report({ short: true });
```

#### Extract messages from source files

```javascript
const Manager = require('react-intl-tm');

new Manager({
  source: 'app/**/*.+(js|jsx)',
  translationsDir: 'app/translations',
  locales: ['en', 'de'],
  defaultLocale: 'en',
})
  .writeFiles()
  .report();
```

#### Provide messages directly

```javascript
const Manager = require('react-intl-tm');

const messages = [
  { id: 'msg1', defaultMessage: 'Message 1' },
  { id: 'msg2', defaultMessage: 'Message 2' },
  // ...
];

new Manager({
  messages: messages,
  translationsDir: 'app/translations',
  locales: ['en', 'de'],
  defaultLocale: 'en',
})
  .writeFiles()
  .report();
```

#### Sort translations keys

````javascript
const TranslationsManager = require('react-intl-tm');
const stringify = require('json-stable-stringify');

class Manager extends TranslationsManager {
  stringifyTranslationFile(translation) {
    return stringify(translation, { space: 2 }) + '\n';
  }
}

new Manager({
  messagesDir: 'app/messages',
  translationsDir: 'app/translations',
  locales: ['en', 'de'],
  defaultLocale: 'en',
}).writeFiles();
````

### Options

- `source` - path (glob) to source files.
- `messages` - an array of messages extracted by `babel-plugin-react-intl`.
- `messagesDir` - path to directory with messages extracted by `babel-plugin-react-intl`.
- `translationsDir` - path to directory with translation files.
- `locales` - an array of locales to maintain.
- `defaultLocale` - default locale.

### API

- `writeFiles()` - write translations files to `translationsDir`.
- `report()` - print the full report to the console. When called with `{short: true}` option, the report will not include added, removed, and untranslated keys.  
- `results()` - returns the raw result of translations manager work.
