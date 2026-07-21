import { prisma } from "@/lib/prisma";

/** Returns the currently OPEN business day, or null if none is open. */
export async function getActiveBusinessDay() {
  return prisma.businessDay.findFirst({
    where: { status: "OPEN" },
    orderBy: { startedAt: "desc" },
  });
}

/**
 * Builds a human label for a new business day. Since the day runs ~2pm to
 * 4am, "today" for a day started at 1am actually belongs to the previous
 * calendar date's business day — but since days are started explicitly by
 * an admin (never inferred), we just label it with whatever the wall-clock
 * date is at the moment "Start New Day" is pressed.
 */
export function buildBusinessDayLabel(date: Date) {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
