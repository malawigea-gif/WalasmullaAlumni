import PDFDocument from "pdfkit";
import type { Donation, FeePayment, LabourContribution, Member, MemberProfile } from "@prisma/client";

type MemberWithProfile = Member & { profile: MemberProfile | null };

type NoteAuthor = { email: string; profile: { fullName: string } | null } | null;

type AdminNoteWithAuthor = {
  note: string;
  createdAt: Date;
  author: NoteAuthor;
};

export function buildMemberReportPdf(data: {
  member: MemberWithProfile;
  feePayments: FeePayment[];
  donations: Donation[];
  labourContributions: LabourContribution[];
  adminNotes: AdminNoteWithAuthor[];
}): PDFKit.PDFDocument {
  const { member, feePayments, donations, labourContributions, adminNotes } = data;
  const profile = member.profile;
  const doc = new PDFDocument({ margin: 40, size: "A4" });

  doc.fontSize(16).text("Walasmulla Model Primary School Alumni Association", { align: "center" });
  doc.fontSize(11).fillColor("#555").text("Member Report", { align: "center" });
  doc.fillColor("#000").moveDown(1);

  doc.fontSize(14).text(profile?.fullName || member.email);
  doc.fontSize(10).fillColor("#444");
  doc.text(`Email: ${member.email}`);
  if (member.phone) doc.text(`Phone: ${member.phone}`);
  if (member.membershipNo) doc.text(`Membership No: ${member.membershipNo}`);
  doc.text(`Membership Type: ${member.membershipType}`);
  doc.text(`Membership Status: ${member.membershipStatus}`);
  doc.fillColor("#000").moveDown(0.5);

  sectionHeading(doc, "Profile Details");
  const fields: [string, string | null | undefined][] = [
    ["Name with Initials", profile?.nameWithInitials],
    ["NIC Number", profile?.nicNumber],
    ["Date of Birth", profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : null],
    ["Permanent Address", profile?.permanentAddress],
    ["Current Address", profile?.currentAddress],
    ["Grama Niladhari Division", profile?.gramaNiladhariDivision],
    ["Divisional Secretariat", profile?.divisionalSecretariat],
    ["District", profile?.district],
    [
      "School Period",
      profile?.schoolPeriodFrom && profile?.schoolPeriodTo
        ? `${profile.schoolPeriodFrom} - ${profile.schoolPeriodTo}`
        : null,
    ],
    ["Scholarship Exam Result", profile?.scholarshipExamResult],
    ["Academic Achievements", profile?.academicAchievements],
    ["Co-Curricular Achievements", profile?.coCurricularAchievements],
    ["Leadership Roles", profile?.leadershipRoles],
    ["Extracurricular Groups", profile?.extracurricularGroups],
    ["Higher Education Qualifications", profile?.higherEducationQualifications],
  ];
  let anyField = false;
  for (const [label, value] of fields) {
    if (value) {
      doc.fontSize(10).text(`${label}: ${value}`);
      anyField = true;
    }
  }
  if (!anyField) doc.fontSize(10).text("No profile details recorded.");
  doc.moveDown(0.5);

  sectionHeading(doc, "Fee Payments");
  if (feePayments.length === 0) {
    doc.fontSize(10).text("No fee payments recorded.");
  } else {
    for (const p of feePayments) {
      doc
        .fontSize(10)
        .text(
          `${new Date(p.paidDate).toLocaleDateString()} — Year ${p.year} — Rs. ${p.amount} — ${
            p.confirmedAt ? "Confirmed" : "Pending"
          }`
        );
    }
  }
  doc.moveDown(0.5);

  sectionHeading(doc, "Donations");
  if (donations.length === 0) {
    doc.fontSize(10).text("No donations recorded.");
  } else {
    for (const d of donations) {
      doc
        .fontSize(10)
        .text(
          `${new Date(d.donatedDate).toLocaleDateString()} — ${d.description} — ${
            d.amount ? `Rs. ${d.amount}` : "-"
          } — ${d.confirmedAt ? "Confirmed" : "Pending"}`
        );
    }
  }
  doc.moveDown(0.5);

  sectionHeading(doc, "Labour Contributions");
  if (labourContributions.length === 0) {
    doc.fontSize(10).text("No labour contributions recorded.");
  } else {
    for (const l of labourContributions) {
      doc
        .fontSize(10)
        .text(
          `${new Date(l.date).toLocaleDateString()} — ${l.description} — ${
            l.hours ? `${l.hours} hrs` : "-"
          } — ${l.confirmedAt ? "Confirmed" : "Pending"}`
        );
    }
  }

  if (adminNotes.length > 0) {
    doc.moveDown(0.5);
    sectionHeading(doc, "Admin Notes");
    for (const n of adminNotes) {
      const authorName = n.author?.profile?.fullName ?? n.author?.email ?? "Unknown";
      doc.fontSize(9).fillColor("#666").text(`${new Date(n.createdAt).toLocaleString()} — ${authorName}`);
      doc.fontSize(10).fillColor("#000").text(n.note);
      doc.moveDown(0.4);
    }
  }

  return doc;
}

function sectionHeading(doc: PDFKit.PDFDocument, text: string) {
  doc.moveDown(0.3);
  doc.fontSize(13).fillColor("#1d4ed8").text(text);
  doc.fillColor("#000");
  doc.moveDown(0.2);
}
