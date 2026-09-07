-- Move identity to Supabase Auth.
-- Passwords, Google ids, refresh tokens and password-reset OTPs are all owned
-- by the identity provider now, so none of them belong in this database.
ALTER TABLE "User" ADD COLUMN "supabaseId" TEXT;
CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");

DROP INDEX IF EXISTS "User_googleId_key";
ALTER TABLE "User" DROP COLUMN "passwordHash";
ALTER TABLE "User" DROP COLUMN "googleId";
ALTER TABLE "User" DROP COLUMN "refreshToken";
ALTER TABLE "User" DROP COLUMN "otpCode";
ALTER TABLE "User" DROP COLUMN "otpExpiresAt";
