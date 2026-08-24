/** Load .env so database-backed tests can reach PostgreSQL. */
import { existsSync } from "node:fs";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}
