import { z } from "zod"

import { LOCALES, settingsSchema } from "@/lib/resume/schema"

/*
 * A cover letter is its own document. It usually starts from a resume (sender
 * details and visual settings are copied over) but lives and is edited on its
 * own, so changing the resume later never rewrites a letter already sent.
 */

const str = z.string().catch("")

export const senderSchema = z.object({
  name: str,
  jobTitle: str,
  email: str,
  phone: str,
  location: str,
  website: str,
})

export const recipientSchema = z.object({
  company: str,
  name: str,
  /** The position applied for. Printed as a "Re:" line. */
  position: str,
  address: str,
})

export const letterSchema = z.object({
  id: z.string().min(1),
  title: z.string().catch("Untitled cover letter"),
  locale: z.enum(LOCALES).catch("en"),
  /** Resume it was created from, used to refresh the sender block. */
  resumeId: z.string().nullable().catch(null),
  createdAt: z.string(),
  updatedAt: z.string(),
  sender: senderSchema.catch({ name: "", jobTitle: "", email: "", phone: "", location: "", website: "" }),
  recipient: recipientSchema.catch({ company: "", name: "", position: "", address: "" }),
  /** Free text. Empty means today's date in the letter's language. */
  date: str,
  /** Empty means a greeting built from the recipient's name and the language. */
  greeting: str,
  /** Rich text, same allowlist as resume sections. */
  body: str,
  /** Empty means the language's usual sign-off. */
  closing: str,
  settings: settingsSchema,
})

export type Letter = z.infer<typeof letterSchema>
export type LetterSender = z.infer<typeof senderSchema>
export type LetterRecipient = z.infer<typeof recipientSchema>

export type LetterSummary = Pick<Letter, "id" | "title" | "locale" | "resumeId" | "createdAt" | "updatedAt"> & {
  company: string
  position: string
  senderName: string
}
