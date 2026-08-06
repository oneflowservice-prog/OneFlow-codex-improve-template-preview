ALTER TABLE "SiteSettings"
ADD COLUMN "authHeroBadge" TEXT NOT NULL DEFAULT 'Y Combinator S24',
ADD COLUMN "authHeroTitle" TEXT NOT NULL DEFAULT 'Built for teams that ship fast.',
ADD COLUMN "authHeroDescription" TEXT NOT NULL DEFAULT 'Collaborate in real time, refine ideas instantly, and turn prompts into polished product experiences.',
ADD COLUMN "authHeroImageUrl" TEXT;
