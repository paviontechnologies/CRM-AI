-- Drop the WhatsApp channel.
-- It was never wired for delivery: only the credit counters existed, and the
-- outreach code now offers email / linkedin / sms only.
ALTER TABLE "Organization" DROP COLUMN "usedWaCredits";
ALTER TABLE "Subscription" DROP COLUMN "waLimit";
