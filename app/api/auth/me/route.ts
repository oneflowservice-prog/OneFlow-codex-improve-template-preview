import { NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.split("=")[1];

  if (!token) {
    return NextResponse.json({ user: null, unreadNotificationCount: 0 });
  }

  const user = await getUserBySessionToken(token);
  if (!user) {
    return NextResponse.json({ user: null, unreadNotificationCount: 0 });
  }

  const prisma = getPrisma();
  const unreadNotificationCount = await prisma.notification.count({
    where: {
      userId: user.id,
      readAt: null,
    },
  });

  return NextResponse.json({ user, unreadNotificationCount });
}
