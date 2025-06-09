
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const isLibrary = process.env.BUILD_MODE === 'library';
  
  const baseConfig = {
    server: {
      host: "::",
      port: 8080,
      allowedHosts: [
        ".lovableproject.com",
        "localhost",
      ],
    },
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };

  if (isLibrary) {
    return {
      ...baseConfig,
      build: {
        lib: {
          entry: path.resolve(__dirname, 'src/module.tsx'),
          name: 'ValorwellPortal',
          formats: ['es'],
          fileName: 'valorwell-portal'
        },
        rollupOptions: {
          external: ['react', 'react-dom', 'react/jsx-runtime'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
              'react/jsx-runtime': 'react/jsx-runtime'
            }
          }
        }
      }
    };
  }

  return baseConfig;
});
