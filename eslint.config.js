import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';
import * as firebaseRulesParser from '@firebase/eslint-plugin-security-rules/parser';

export default [
  {
    ignores: ['dist/**/*']
  },
  {
    files: ['firestore.rules'],
    languageOptions: {
      parser: firebaseRulesParser
    },
    plugins: {
      '@firebase/security-rules': firebaseRulesPlugin
    },
    rules: {
      ...firebaseRulesPlugin.configs['flat/recommended'].rules
    }
  }
];
