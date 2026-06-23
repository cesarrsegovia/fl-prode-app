-- CreateIndex
CREATE INDEX "GroupScore_groupId_tournamentId_idx" ON "GroupScore"("groupId", "tournamentId");

-- CreateIndex
CREATE INDEX "GroupScore_userId_tournamentId_idx" ON "GroupScore"("userId", "tournamentId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Prediction_fixtureId_pointsEarned_idx" ON "Prediction"("fixtureId", "pointsEarned");

-- CreateIndex
CREATE INDEX "Prediction_fixtureId_userId_idx" ON "Prediction"("fixtureId", "userId");

-- CreateIndex
CREATE INDEX "UserScore_tournamentId_total_idx" ON "UserScore"("tournamentId", "total");

