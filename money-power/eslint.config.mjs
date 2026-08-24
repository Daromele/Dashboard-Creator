import next from "eslint-config-next";

const config = [
  ...next,
  {
    ignores: [".next/**", "node_modules/**", "prisma/migrations/**", "tests/e2e/**"],
  },
];

export default config;
