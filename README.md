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

#### Read messages from folder

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

- `source` - Path (glob) to source files.
- `messages` - Array of the messages extracted by `babel-plugin-react-intl`.
- `messagesDir` - Path to directory with messages extracted by `babel-plugin-react-intl`.
- `translationsDir` - Path to directory with translations files.
- `locales` - Array of locales to maintain.
- `defaultLocale` - Default locale.

### API

- `writeFiles()` - Write translations files to `translationsDir`.
- `report()` - Print the full report to the console. When called with `{short: true}` option, the report will not include added, removed, and untranslated keys.  
- `results()` - Returns the raw result of the manager's work. It can be used for building tools on top of this module.  
