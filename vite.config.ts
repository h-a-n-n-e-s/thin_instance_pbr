import { defineConfig } from 'vite'

export default defineConfig({

  build: {
    target: 'esnext', // assuming browsers can handle the latest ES features
  }
});