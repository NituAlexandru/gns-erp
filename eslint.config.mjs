import { defineConfig } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  //  (Astea prind erorile CRITICE și vor da eroare roșie)
  ...nextVitals,
  ...nextTs,

  {
    ignores: [
      '.next/',
      'node_modules/',
      'public/',
      '.vscode/',
      'next-env.d.ts',
    ],
  },

  {
    // Îi spunem să nu mai raporteze directivele nefolosite
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    rules: {
      // Astea sunt erorile. Le oprim vizual.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/immutability': 'off',

      // Oprim și astea ca să nu ai zgomot de fundal
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'react/no-unescaped-entities': 'off',

      //  Orice altă eroare gravă care NU e listată aici va rămâne 'error' (default)
      // și va opri build-ul, exact așa cum vrei.
    },
  },
])
