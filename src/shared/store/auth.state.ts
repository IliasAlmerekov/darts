import { atom } from "nanostores";
import type { AuthenticatedUser } from "@/shared/api/auth";

export const userAtom = atom<AuthenticatedUser | null>(null);
export const authCheckedAtom = atom<boolean>(false);
export const authErrorAtom = atom<string | null>(null);
