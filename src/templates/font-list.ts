import type { FontId } from "@/lib/resume/schema"

export const FONTS: Record<FontId, { label: string; family: string; serif: boolean }> = {
  inter: { label: "Inter", family: "'Inter', sans-serif", serif: false },
  roboto: { label: "Roboto", family: "'Roboto', sans-serif", serif: false },
  lato: { label: "Lato", family: "'Lato', sans-serif", serif: false },
  "open-sans": { label: "Open Sans", family: "'Open Sans', sans-serif", serif: false },
  "source-sans-3": { label: "Source Sans", family: "'Source Sans 3', sans-serif", serif: false },
  "ibm-plex-sans": { label: "IBM Plex Sans", family: "'IBM Plex Sans', sans-serif", serif: false },
  "work-sans": { label: "Work Sans", family: "'Work Sans', sans-serif", serif: false },
  nunito: { label: "Nunito", family: "'Nunito', sans-serif", serif: false },
  montserrat: { label: "Montserrat", family: "'Montserrat', sans-serif", serif: false },
  raleway: { label: "Raleway", family: "'Raleway', sans-serif", serif: false },
  merriweather: { label: "Merriweather", family: "'Merriweather', serif", serif: true },
  "source-serif-4": { label: "Source Serif", family: "'Source Serif 4', serif", serif: true },
  lora: { label: "Lora", family: "'Lora', serif", serif: true },
  "pt-serif": { label: "PT Serif", family: "'PT Serif', serif", serif: true },
  "eb-garamond": { label: "EB Garamond", family: "'EB Garamond', serif", serif: true },
}

/** Names used by the DOCX export, which relies on fonts installed on the reader's machine. */
export const DOCX_FONT: Record<FontId, string> = {
  inter: "Inter",
  roboto: "Roboto",
  lato: "Lato",
  "open-sans": "Open Sans",
  "source-sans-3": "Source Sans 3",
  "ibm-plex-sans": "IBM Plex Sans",
  "work-sans": "Work Sans",
  nunito: "Nunito",
  montserrat: "Montserrat",
  raleway: "Raleway",
  merriweather: "Merriweather",
  "source-serif-4": "Source Serif 4",
  lora: "Lora",
  "pt-serif": "PT Serif",
  "eb-garamond": "EB Garamond",
}
