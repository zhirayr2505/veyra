import js from '@eslint/js';
import globals from 'globals';
export default [
 {ignores:['dist/**','node_modules/**','test-results/**','playwright-report/**']},
 {files:['server/**/*.js','scripts/**/*.js','web/**/*.{js,jsx}','tests/**/*.js'],languageOptions:{ecmaVersion:'latest',sourceType:'module',globals:{...globals.node,...globals.browser},parserOptions:{ecmaFeatures:{jsx:true}}},rules:{...js.configs.recommended.rules,'no-unused-vars':'off','no-empty':['error',{allowEmptyCatch:true}],'no-useless-escape':'off'}},
];
