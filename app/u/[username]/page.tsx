/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { FolderOpen, Flame, MapPin, Sparkles } from "lucide-react";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { getPrisma } from "@/lib/prisma";
import { getProfileHref, getUserHandle } from "@/lib/user-profile";
import { MainSidebarPage } from "@/components/main-sidebar-page";
import { ProfileFollowButton } from "@/components/profile-follow-button";
import { ProjectPreviewImage } from "@/components/project-preview-image";
import { ProjectLikeButton } from "@/components/project-like-button";

const DAYS_IN_YEAR = 365;

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const viewer = token ? await getUserBySessionToken(token) : null;
  const prisma = getPrisma();

  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      location: true,
      avatarUrl: true,
      bannerUrl: true,
      vercelAvatarUrl: true,
      createdAt: true,
      _count: {
        select: {
          followers: true,
          following: true,
          chats: true,
          projectLikes: true,
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const isOwnProfile = viewer?.id === user.id;
  const recentProjects = await prisma.chat.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      title: true,
      createdAt: true,
      previewImageUrl: true,
      userId: true,
      _count: {
        select: {
          projectLikes: true,
        },
      },
    },
  });

  const likedProjects = await prisma.projectLike.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      chat: {
        select: {
          id: true,
          title: true,
          createdAt: true,
          previewImageUrl: true,
          userId: true,
          user: {
            select: {
              username: true,
              email: true,
              name: true,
            },
          },
          _count: {
            select: {
              projectLikes: true,
            },
          },
        },
      },
    },
  });

  const yearlyEdits = await prisma.chat.findMany({
    where: {
      userId: user.id,
      createdAt: {
        gte: startOfDay(addDays(new Date(), -(DAYS_IN_YEAR - 1))),
      },
    },
    select: {
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const followRecord = viewer
    ? await prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewer.id,
            followingId: user.id,
          },
        },
        select: { followerId: true },
      })
    : null;

  const visibleProjectIds = [
    ...recentProjects.map((project) => project.id),
    ...likedProjects.map((entry) => entry.chat.id),
  ];

  const likedByViewer = viewer
    ? await prisma.projectLike.findMany({
        where: {
          userId: viewer.id,
          chatId: {
            in: visibleProjectIds.length > 0 ? visibleProjectIds : ["__none__"],
          },
        },
        select: { chatId: true },
      })
    : [];

  const likedByViewerSet = new Set(likedByViewer.map((entry) => entry.chatId));
  const activity = buildActivity(yearlyEdits.map((entry) => entry.createdAt));
  const currentStreak = activity.currentStreak;
  const daysActive = activity.daysActive;
  const weeks = chunk(activity.cells, 7);
  const handle = getUserHandle(user);
  const initials = getInitials(user.name?.trim() || handle);
  const joinedLabel = user.createdAt.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const recentProjectCards = recentProjects.map((project) => ({
    id: project.id,
    title: project.title,
    href: `/chats/${project.id}`,
    previewImageUrl: normalizeAssetUrl(project.previewImageUrl),
    meta: `Edited ${formatDate(project.createdAt)}`,
    ownerHref: getProfileHref(user),
    ownerLabel: handle,
    likesCount: project._count.projectLikes,
    isLiked: likedByViewerSet.has(project.id),
    likeDisabled: !viewer || project.userId === viewer.id,
  }));

  const likedProjectCards = likedProjects.map((entry) => ({
    id: entry.chat.id,
    title: entry.chat.title,
    href: `/chats/${entry.chat.id}`,
    previewImageUrl: normalizeAssetUrl(entry.chat.previewImageUrl),
    meta: `by ${getUserHandle(entry.chat.user || {})}`,
    ownerHref: entry.chat.user ? getProfileHref(entry.chat.user) : null,
    ownerLabel: getUserHandle(entry.chat.user || {}),
    likesCount: entry.chat._count.projectLikes,
    isLiked: likedByViewerSet.has(entry.chat.id),
    likeDisabled: !viewer || entry.chat.userId === viewer.id,
  }));

  return (
    <MainSidebarPage contentClassName="overflow-hidden">
      <div className="theme-scrollbar h-full overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 lg:px-8">
        <div className="w-full">
          <div className="relative overflow-hidden rounded-[18px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card)/0.94)_0%,hsl(var(--background)/0.98)_100%)] shadow-[0_24px_70px_-54px_hsl(var(--background)/0.7)] backdrop-blur">
            <div
              className="h-36 bg-[linear-gradient(120deg,hsl(var(--primary)/0.58)_0%,hsl(var(--primary))_24%,hsl(var(--accent))_62%,hsl(var(--secondary))_100%)]"
              style={
                user.bannerUrl
                  ? {
                      backgroundImage: `linear-gradient(120deg,hsl(var(--background)/0.18),hsl(var(--background)/0.18)), url(${user.bannerUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_18%_18%,hsl(var(--primary-foreground)/0.22),transparent_34%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,hsl(var(--background)/0.14)_48%,hsl(var(--background)/0.58)_100%)]" />

            <div className="relative px-4 pb-5 sm:px-6">
              <div className="-mt-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[hsl(var(--card))] bg-[radial-gradient(circle_at_30%_30%,hsl(var(--accent)/0.42),transparent_28%),linear-gradient(135deg,hsl(var(--primary)),hsl(var(--background)))] text-2xl font-semibold text-[hsl(var(--primary-foreground))] shadow-[0_18px_42px_-28px_hsl(var(--background)/0.75)]">
                    {user.avatarUrl || user.vercelAvatarUrl ? (
                      <img
                        src={user.avatarUrl || user.vercelAvatarUrl || ""}
                        alt={handle}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <div className="max-w-2xl rounded-[14px] border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card)/0.8)] px-4 py-3 shadow-[0_18px_54px_-42px_hsl(var(--background)/0.7)] backdrop-blur-xl supports-[backdrop-filter]:bg-[hsl(var(--card)/0.68)]">
                    <p className="text-xs font-medium uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">
                      Oneflow profile
                    </p>
                    <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))] sm:text-[28px]">
                      {handle}
                    </h1>
                    <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                      {user.name?.trim() ? `${user.name.trim()} · ` : ""}
                      Joined {joinedLabel}
                    </p>
                    {user.location ? (
                      <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--background)/0.35)] px-3 py-1 text-sm text-[hsl(var(--foreground))]">
                        <MapPin className="size-4" />
                        {user.location}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <span className="rounded-full border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--background)/0.4)] px-3 py-1.5 text-[hsl(var(--foreground))]">
                        {user._count.followers} followers
                      </span>
                      <span className="rounded-full border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--background)/0.4)] px-3 py-1.5 text-[hsl(var(--foreground))]">
                        {user._count.following} following
                      </span>
                      <span className="rounded-full border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--background)/0.4)] px-3 py-1.5 text-[hsl(var(--foreground))]">
                        {user._count.projectLikes} likes given
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-[14px] border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card)/0.78)] p-1.5 shadow-[0_20px_50px_-38px_hsl(var(--background)/0.7)] backdrop-blur-xl supports-[backdrop-filter]:bg-[hsl(var(--card)/0.66)]">
                  {isOwnProfile ? (
                    <>
                      <Link
                        href="/projects"
                        className="inline-flex items-center gap-2 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.45)] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--background)/0.68)]"
                      >
                        <FolderOpen className="size-4" />
                        Open projects
                      </Link>
                      <Link
                        href="/settings"
                        className="rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.86)] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary))]"
                      >
                        Edit profile
                      </Link>
                    </>
                  ) : (
                    <ProfileFollowButton
                      username={user.username || username.toLowerCase()}
                      initialFollowing={Boolean(followRecord)}
                      disabled={!viewer}
                    />
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
                <div className="space-y-4">
                  <ProjectSection
                    title="Recent projects"
                    subtitle="Work published from this profile"
                    emptyTitle="No projects yet"
                    emptyDetail="Start a new chat to populate this profile."
                    projects={recentProjectCards}
                  />

                  <ProjectSection
                    title="Liked projects"
                    subtitle="Projects this creator has bookmarked"
                    emptyTitle="No likes yet"
                    emptyDetail="Liked projects will appear here."
                    projects={likedProjectCards}
                  />

                  <section className="rounded-[14px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card)/0.96)_0%,hsl(var(--secondary)/0.92)_100%)] p-4 shadow-[0_20px_60px_-48px_hsl(var(--background)/0.62)]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          Activity
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-[hsl(var(--foreground))]">
                          {yearlyEdits.length} edits in the last year
                        </h2>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <StatCard label="Projects" value={String(user._count.chats)} />
                        <StatCard label="Days Active" value={`${daysActive} days`} />
                        <StatCard label="Current Streak" value={`${currentStreak} days`} />
                        <StatCard label="Likes Given" value={String(user._count.projectLikes)} />
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden">
                      <div className="w-full">
                        <div className="mb-2 flex justify-between px-1 text-xs text-[hsl(var(--muted-foreground))]">
                          {activity.monthLabels.map((label, index) => (
                            <span key={`${label}-${index}`}>{label}</span>
                          ))}
                        </div>
                        <div
                          className="grid gap-1"
                          style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
                        >
                          {weeks.map((week, weekIndex) => (
                            <div key={weekIndex} className="grid grid-rows-7 gap-1">
                              {week.map((cell) => (
                                <div
                                  key={cell.date}
                                  title={`${cell.count} edits on ${cell.date}`}
                                  className={`aspect-square w-full rounded-[3px] ${getHeatColor(cell.level)}`}
                                />
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <aside className="space-y-4">
                  <InfoCard
                    icon={<Sparkles className="size-4" />}
                    title="Public handle"
                    value={handle}
                    detail="Share this username across Oneflow"
                  />
                  <InfoCard
                    icon={<Flame className="size-4" />}
                    title="Current streak"
                    value={`${currentStreak} day${currentStreak === 1 ? "" : "s"}`}
                    detail="Consecutive days with saved activity"
                  />
                  <InfoCard
                    icon={<FolderOpen className="size-4" />}
                    title="Project library"
                    value={`${user._count.chats} saved sessions`}
                    detail="All-time work captured in Oneflow"
                  />
                </aside>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainSidebarPage>
  );
}

function ProjectSection({
  title,
  subtitle,
  emptyTitle,
  emptyDetail,
  projects,
}: {
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyDetail: string;
  projects: Array<{
    id: string;
    title: string;
    href: string;
    previewImageUrl: string | null;
    meta: string;
    ownerHref: string | null;
    ownerLabel: string;
    likesCount: number;
    isLiked: boolean;
    likeDisabled: boolean;
  }>;
}) {
  return (
    <section className="rounded-[14px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card)/0.96)_0%,hsl(var(--secondary)/0.92)_100%)] p-4 shadow-[0_20px_60px_-48px_hsl(var(--background)/0.62)]">
      <div>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">{subtitle}</p>
        <h2 className="mt-1 text-lg font-semibold text-[hsl(var(--foreground))]">
          {title}
        </h2>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {projects.length > 0
          ? projects.map((project) => (
              <div
                key={project.id}
                className="overflow-hidden rounded-[12px] border border-[hsl(var(--border))] bg-[linear-gradient(160deg,hsl(var(--card)/0.98),hsl(var(--secondary)/0.96))]"
              >
                <Link href={project.href} className="block">
                  <div className="aspect-[16/10] bg-[linear-gradient(160deg,hsl(var(--secondary)/0.96),hsl(var(--background)/0.86))]">
                    {project.previewImageUrl ? (
                      <ProjectPreviewImage
                        src={project.previewImageUrl}
                        alt={project.title}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
                        No preview yet
                      </div>
                    )}
                  </div>
                </Link>

                <div className="px-3.5 pb-3.5 pt-3">
                  <h3 className="truncate text-base font-medium text-[hsl(var(--foreground))]">
                    {project.title}
                  </h3>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    {project.ownerHref && project.meta.startsWith("by ") ? (
                      <>
                        by{" "}
                        <Link
                          href={project.ownerHref}
                          className="text-[hsl(var(--foreground))] underline decoration-[hsl(var(--border))] underline-offset-4"
                        >
                          {project.ownerLabel}
                        </Link>
                      </>
                    ) : (
                      project.meta
                    )}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Link
                      href={project.href}
                      className="text-sm text-[hsl(var(--foreground))] underline decoration-[hsl(var(--border))] underline-offset-4"
                    >
                      Open project
                    </Link>
                    <ProjectLikeButton
                      projectId={project.id}
                      initialLiked={project.isLiked}
                      initialCount={project.likesCount}
                      disabled={project.likeDisabled}
                    />
                  </div>
                </div>
              </div>
            ))
          : Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[12px] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.48)] p-4"
              >
                <div className="aspect-[16/10] rounded-[10px] bg-[hsl(var(--secondary)/0.9)]" />
                <p className="mt-3 text-sm font-medium text-[hsl(var(--foreground))]">
                  {emptyTitle}
                </p>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  {emptyDetail}
                </p>
              </div>
            ))}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.82)] px-3 py-2.5">
      <p className="text-xs uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[hsl(var(--foreground))]">
        {value}
      </p>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  value,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[14px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card)/0.96)_0%,hsl(var(--secondary)/0.92)_100%)] p-4 shadow-[0_20px_60px_-48px_hsl(var(--background)/0.62)]">
      <div className="inline-flex rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.82)] p-2 text-[hsl(var(--foreground))]">
        {icon}
      </div>
      <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">{title}</p>
      <p className="mt-1 text-base font-semibold text-[hsl(var(--foreground))]">
        {value}
      </p>
      <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
        {detail}
      </p>
    </div>
  );
}

function buildActivity(entries: Date[]) {
  const end = startOfDay(new Date());
  const start = startOfDay(addDays(end, -(DAYS_IN_YEAR - 1)));
  const counts = new Map<string, number>();

  for (const entry of entries) {
    const key = toKey(entry);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const cells = [];
  let cursor = new Date(start);
  let daysActive = 0;

  while (cursor <= end) {
    const key = toKey(cursor);
    const count = counts.get(key) || 0;
    if (count > 0) daysActive += 1;
    cells.push({
      date: key,
      count,
      level: count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4,
    });
    cursor = addDays(cursor, 1);
  }

  const monthLabels = [];
  for (let index = 0; index < cells.length; index += 28) {
    monthLabels.push(
      new Date(cells[index].date).toLocaleDateString("en-US", { month: "short" }),
    );
  }

  return {
    cells,
    daysActive,
    currentStreak: getCurrentStreak(counts),
    monthLabels,
  };
}

function getCurrentStreak(counts: Map<string, number>) {
  let streak = 0;
  let cursor = startOfDay(new Date());

  while ((counts.get(toKey(cursor)) || 0) > 0) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function getHeatColor(level: number) {
  switch (level) {
    case 4:
      return "bg-[hsl(var(--primary)/0.95)]";
    case 3:
      return "bg-[hsl(var(--primary)/0.78)]";
    case 2:
      return "bg-[hsl(var(--primary)/0.58)]";
    case 1:
      return "bg-[hsl(var(--accent)/0.42)]";
    default:
      return "bg-[hsl(var(--secondary))]";
  }
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || value[0]?.toUpperCase() || "U"
  );
}

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function toKey(value: Date) {
  return startOfDay(value).toISOString().slice(0, 10);
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
