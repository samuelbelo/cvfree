import { Fragment, type ReactNode } from "react"

/**
 * A translated sentence with elements inside it. Each `{name}` in the text gives way to `nodes.name`,
 * so the translation decides where the element sits in the sentence.
 */
export function rich(text: string, nodes: Record<string, ReactNode>): ReactNode {
  return text.split(/\{(\w+)\}/g).map((part, i) => <Fragment key={i}>{i % 2 ? (nodes[part] ?? `{${part}}`) : part}</Fragment>)
}
