import { defineConfig } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier'

export default defineConfig([
    {
        files: ["**/*.js"],
        plugins: {
            eslintConfigPrettier: eslintConfigPrettier
        },
        extends: ['eslintConfigPrettier/recommended']
    }
])