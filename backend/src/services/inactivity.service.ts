import { prisma } from "../lib/prisma";

/**
 * Flags annual-membership members inactive once they've missed more than 3
 * consecutive monthly meetings held since their last membership-status change.
 * Only meetings after `membershipStatusUpdatedAt` count, so a freshly-annual
 * or freshly-reactivated member can't be re-flagged until 4+ new monthly
 * meetings have occurred since that change.
 */
export async function recomputeInactivity(): Promise<{ markedInactive: number }> {
  const candidates = await prisma.member.findMany({
    where: { membershipType: "annual", membershipStatus: "active", deletedAt: null },
    select: { id: true, membershipStatusUpdatedAt: true },
  });
  if (candidates.length === 0) return { markedInactive: 0 };

  const pastMonthlyMeetings = await prisma.meeting.findMany({
    where: { type: "monthly", meetingDate: { lt: new Date() } },
    select: { id: true, meetingDate: true },
    orderBy: { meetingDate: "asc" },
  });
  if (pastMonthlyMeetings.length === 0) return { markedInactive: 0 };

  const toMarkInactive: string[] = [];

  for (const member of candidates) {
    const eligibleMeetings = pastMonthlyMeetings.filter((m) => m.meetingDate > member.membershipStatusUpdatedAt);
    if (eligibleMeetings.length < 4) continue;

    const attendedMeetingIds = new Set(
      (
        await prisma.meetingAttendance.findMany({
          where: { memberId: member.id, meetingId: { in: eligibleMeetings.map((m) => m.id) } },
          select: { meetingId: true },
        })
      ).map((a) => a.meetingId)
    );

    let consecutiveMisses = 0;
    for (const m of eligibleMeetings) {
      consecutiveMisses = attendedMeetingIds.has(m.id) ? 0 : consecutiveMisses + 1;
    }

    if (consecutiveMisses >= 4) {
      toMarkInactive.push(member.id);
    }
  }

  if (toMarkInactive.length === 0) return { markedInactive: 0 };

  await prisma.member.updateMany({
    where: { id: { in: toMarkInactive } },
    data: { membershipStatus: "inactive", membershipStatusUpdatedAt: new Date() },
  });

  return { markedInactive: toMarkInactive.length };
}
