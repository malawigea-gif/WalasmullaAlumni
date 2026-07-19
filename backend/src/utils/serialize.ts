import { Member } from "@prisma/client";

export function toPublicMember<T extends Partial<Member>>(member: T) {
  const { passwordHash, ...rest } = member;
  return rest;
}

/** Use for every nested member/actor/target/sender relation so passwordHash is never fetched. */
export const SAFE_MEMBER_SELECT = {
  id: true,
  email: true,
  phone: true,
  role: true,
  executivePosition: true,
  createdAt: true,
  profile: true,
} as const;
