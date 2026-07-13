import { PrismaClient, ExecutivePositionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const EXECUTIVES: { position: ExecutivePositionType; email: string; fullName: string }[] = [
  { position: "chairman", email: "chairman@walasmulla-alumni.lk", fullName: "සුනිල් පෙරේරා" },
  { position: "vice_chairman", email: "vicechairman@walasmulla-alumni.lk", fullName: "නිමල් සිල්වා" },
  { position: "secretary", email: "secretary@walasmulla-alumni.lk", fullName: "කමලා ජයවර්ධන" },
  { position: "vice_secretary", email: "vicesecretary@walasmulla-alumni.lk", fullName: "රංජනී ගුණරත්න" },
  { position: "treasurer", email: "treasurer@walasmulla-alumni.lk", fullName: "අනුර බණ්ඩාර" },
];

const MEMBERS = [
  { email: "member1@example.com", fullName: "සමන් කුමාර", district: "Hambantota" },
  { email: "member2@example.com", fullName: "නදීෂා පෙරේරා", district: "Hambantota" },
  { email: "member3@example.com", fullName: "චමින්ද රත්නායක", district: "Matara" },
];

async function main() {
  const defaultPasswordHash = await bcrypt.hash("Password@123", 10);

  const executiveMembers = [];
  for (const exec of EXECUTIVES) {
    const member = await prisma.member.upsert({
      where: { email: exec.email },
      update: {},
      create: {
        email: exec.email,
        phone: "0771234567",
        passwordHash: defaultPasswordHash,
        role: "executive",
        executivePosition: exec.position,
        profile: {
          create: {
            fullName: exec.fullName,
            nameWithInitials: exec.fullName,
            district: "Hambantota",
            scholarshipExamResult: "not_applicable",
          },
        },
        qrCode: {
          create: { qrToken: `qr_${exec.position}_${Date.now()}` },
        },
      },
    });
    executiveMembers.push({ ...exec, memberId: member.id });

    await prisma.executivePosition.upsert({
      where: { position: exec.position },
      update: { currentHolderId: member.id, startDate: new Date() },
      create: { position: exec.position, currentHolderId: member.id, startDate: new Date() },
    });

    await prisma.executiveHistory.create({
      data: {
        position: exec.position,
        actorId: member.id,
        targetId: member.id,
        action: "appointed",
        reason: "Initial seed appointment",
      },
    });
  }

  const chairmanId = executiveMembers.find((e) => e.position === "chairman")!.memberId;

  const regularMembers = [];
  for (const m of MEMBERS) {
    const member = await prisma.member.upsert({
      where: { email: m.email },
      update: {},
      create: {
        email: m.email,
        phone: "0719876543",
        passwordHash: defaultPasswordHash,
        role: "member",
        profile: {
          create: {
            fullName: m.fullName,
            nameWithInitials: m.fullName,
            district: m.district,
            gramaNiladhariDivision: "Walasmulla",
            divisionalSecretariat: "Walasmulla",
            scholarshipExamResult: "passed",
            schoolPeriodFrom: 2005,
            schoolPeriodTo: 2015,
          },
        },
        qrCode: {
          create: { qrToken: `qr_${m.email}_${Date.now()}` },
        },
      },
    });
    regularMembers.push(member);
  }

  const meeting = await prisma.meeting.create({
    data: {
      title: "වාර්ෂික මහා සභා රැස්වීම 2026",
      meetingDate: new Date(),
      location: "වලස්මුල්ල ආදර්ශ ප්‍රාථමික විද්‍යාලය",
    },
  });

  for (const member of regularMembers) {
    await prisma.feePayment.create({
      data: { memberId: member.id, amount: 500, year: 2026, paidDate: new Date(), recordedBy: chairmanId },
    });
    await prisma.meetingAttendance.create({
      data: { meetingId: meeting.id, memberId: member.id, scannedBy: chairmanId },
    });
  }

  await prisma.donation.create({
    data: {
      memberId: regularMembers[0].id,
      description: "පාසල් පුස්තකාලය සඳහා පොත් පරිත්‍යාගය",
      amount: 2500,
      donatedDate: new Date(),
      recordedBy: chairmanId,
    },
  });

  await prisma.labourContribution.create({
    data: {
      memberId: regularMembers[1].id,
      description: "පාසල් වත්ත පිරිසිදු කිරීමේ වැඩසටහන",
      date: new Date(),
      hours: 4,
      recordedBy: chairmanId,
    },
  });

  console.log("Seed complete. Default password for all seeded users: Password@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
