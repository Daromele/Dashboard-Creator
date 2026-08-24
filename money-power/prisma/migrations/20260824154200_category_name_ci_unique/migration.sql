-- Category names are unique per user, case-insensitively.
CREATE UNIQUE INDEX "Category_userId_name_ci_key" ON "Category" ("userId", LOWER("name"));
