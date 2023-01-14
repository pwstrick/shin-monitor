/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 11:18:19
 * @LastEditTime: 2023-01-14 18:10:07
 * @Description: 
 * @FilePath: /web/shin-monitor/.eslintrc.js
 */
module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "node": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "sourceType": "module"
    },
    "plugins": ["@typescript-eslint"],
    "rules": {
        "indent": "off",
        "@typescript-eslint/indent": [
            "error",
            2
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ],
        "no-console": "off",
        "max-classes-per-file": ["error", 2],
        "linebreak-style": 'off', // 无视行尾的换行
        'no-undef': 'off',  // 关闭未声明的错误
        '@typescript-eslint/no-use-before-define': [0], // 关闭声明后未使用的错误
        '@typescript-eslint/no-var-requires': 'off',    // 允许require()
        '@typescript-eslint/no-explicit-any': 'off',    // 允许any类型
        '@typescript-eslint/no-empty-interface': 'off',    // 允许interface没有属性
        'no-useless-escape': 'off', // 允许转义符
    }
};
