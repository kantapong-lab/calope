import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "db/migrations/**"] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // C-VISION: only the provider module may import the Anthropic SDK.
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@anthropic-ai/sdk",
              message: "Import the SDK only in src/server/vision/analyze-food.ts (C-VISION).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/server/vision/analyze-food.ts", "src/app/api/health/route.ts", "**/*.test.ts", "**/*.test.tsx"],
    rules: { "no-restricted-imports": "off" },
  },
];

export default config;
