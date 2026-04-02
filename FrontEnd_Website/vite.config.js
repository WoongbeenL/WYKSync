// Vite config for the frontend project.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Pretty small config for now since React only needs the plugin.
export default defineConfig({
  plugins: [react()],
})
