import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        Blob: "readonly",
        BeforeUnloadEvent: "readonly",
        CanvasRenderingContext2D: "readonly",
        Element: "readonly",
        File: "readonly",
        FormData: "readonly",
        HTMLAnchorElement: "readonly",
        HTMLCanvasElement: "readonly",
        HTMLImageElement: "readonly",
        MouseEvent: "readonly",
        PointerEvent: "readonly",
        URL: "readonly",
        clearInterval: "readonly",
        console: "readonly",
        crypto: "readonly",
        document: "readonly",
        localStorage: "readonly",
        setInterval: "readonly",
        setTimeout: "readonly",
        window: "readonly"
      }
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: { attributes: false } }],
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "prefer-const": "error",
      "react-refresh/only-export-components": "off"
    }
  },
  {
    files: ["src/lib/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: ["react", "react-dom", "../../components/*", "../../app/*", "../api/*"]
      }]
    }
  },
  {
    files: ["src/lib/api/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: ["react", "react-dom", "../../components/*", "../../app/*"]
      }]
    }
  },
  {
    files: ["src/components/ui.tsx"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: ["../app/*", "../features/*", "../lib/api/*"]
      }]
    }
  }
);
