module.exports = {
    root: true,
    env: {
        browser: true,
        es2021: true,
        node: true,
        jest: true,
    },
    extends: ['plugin:vue/vue3-recommended', 'eslint:recommended', '@vue/typescript/recommended', '@vue/prettier', '@vue/prettier/@typescript-eslint'],
    parserOptions: {
        ecmaVersion: 2021,
    },
    plugins: [],
    rules: {
        'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        'vue/attributes-order': [
            'error',
            {
                order: [
                    'TWO_WAY_BINDING', // ex. `v-model`
                    'LIST_RENDERING', // ex. `v-for item in items`
                    'CONDITIONALS', // ex. `v-if`, `v-else-if`, `v-else`, `v-show`, `v-cloak`
                    'CONTENT', // ex. `v-text`, `v-html`
                    'UNIQUE', // ex. `ref`, `key`
                    'GLOBAL', // ex. `id`
                    'EVENTS', // ex. `@click="functionCall"`, `v-on="eventName"`
                    'OTHER_ATTR', //class, style
                    // ['', 'ATTR_STATIC', 'ATTR_SHORTHAND_BOOL'],
                    'OTHER_DIRECTIVES', // ex. `v-custom-directive`
                    'RENDER_MODIFIERS', // ex. `v-once`, `v-pre`
                    'DEFINITION', // ex. `is`
                ],
                alphabetical: true,
            },
        ],
        'prettier/prettier': [
            'warn',
            {
                tabWidth: 4,
                semi: true,
                printWidth: 180,
                singleQuote: true,
                endOfLine: 'auto',
            },
        ],
        '@typescript-eslint/no-this-alias': [
            'error',
            {
                allowDestructuring: true, // Allow `const { props, state } = this`; false by default
                allowedNames: ['sVm'], // Allow `const sVm= this`; `[]` by default
            },
        ],
    },
    overrides: [
        {
            files: ['**/__tests__/*.{j,t}s?(x)', '**/tests/unit/**/*.spec.{j,t}s?(x)'],
            env: {
                jest: true,
            },
        },
    ],
};
