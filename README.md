# Translations manager for `react-intl`

### Installing

```
yarn add --dev react-intl-tm
```
or
```
npm i --save-dev react-intl-tm
```

### Basic usage

```javascript
const TranslationManager = require('react-intl-tm');

new TranslationManager({
  messagesDir: 'app/messages',
  translationsDir: 'app/translations',
  locales: ['en', 'de'],
  defaultLocale: 'en',
})
  .writeFiles()
  .report();
```
