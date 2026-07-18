import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";

export async function sendBroadcastMessage(params: { senderId: string; subject: string; body: string }) {
  const targets = await prisma.member.findMany({ where: { deletedAt: null }, select: { id: true } });
  const recipientIds = targets.map((m) => m.id);

  return prisma.message.create({
    data: {
      senderId: params.senderId,
      recipientType: "broadcast",
      recipientFilter: Prisma.JsonNull,
      subject: params.subject,
      body: params.body,
      recipients: { createMany: { data: recipientIds.map((memberId) => ({ memberId })) } },
    },
    include: { recipients: true },
  });
}
