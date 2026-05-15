-- CreateIndex
CREATE UNIQUE INDEX "User_email_lower_unique_idx" ON "User"(LOWER("email"));
CREATE INDEX "User_email_idx" ON "User"("email");
