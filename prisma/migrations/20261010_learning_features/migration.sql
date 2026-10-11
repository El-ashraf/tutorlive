ALTER TABLE "TutorProfile"
  ADD COLUMN IF NOT EXISTS "university" TEXT,
  ADD COLUMN IF NOT EXISTS "courseCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE IF NOT EXISTS "StudyDeck" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "cheatSheet" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "sourceFileName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudyDeck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CatchUpPlan" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "courseCode" TEXT,
  "missedDates" JSONB,
  "sourceNotes" TEXT,
  "plan" JSONB NOT NULL,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatchUpPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GroupSession" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "GroupSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GroupSession_roomId_key" ON "GroupSession"("roomId");
CREATE INDEX IF NOT EXISTS "StudyDeck_userId_createdAt_idx" ON "StudyDeck"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "CatchUpPlan_userId_status_idx" ON "CatchUpPlan"("userId", "status");
CREATE INDEX IF NOT EXISTS "GroupSession_groupId_createdAt_idx" ON "GroupSession"("groupId", "createdAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudyDeck_userId_fkey' AND conrelid = '"StudyDeck"'::regclass) THEN
    ALTER TABLE "StudyDeck" ADD CONSTRAINT "StudyDeck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CatchUpPlan_userId_fkey' AND conrelid = '"CatchUpPlan"'::regclass) THEN
    ALTER TABLE "CatchUpPlan" ADD CONSTRAINT "CatchUpPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GroupSession_groupId_fkey' AND conrelid = '"GroupSession"'::regclass) THEN
    ALTER TABLE "GroupSession" ADD CONSTRAINT "GroupSession_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TutorialGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GroupSession_createdById_fkey' AND conrelid = '"GroupSession"'::regclass) THEN
    ALTER TABLE "GroupSession" ADD CONSTRAINT "GroupSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
