import { ContactLine, ContactStack, type Ctx, Photo, Sections, visibleSections } from "../blocks"

/*
 * Single-column designs. They read top to bottom, which is what applicant
 * tracking systems parse best, and they map cleanly to the DOCX export.
 */

function Header({ ctx, photoSide = "left" }: { ctx: Ctx; photoSide?: "left" | "right" }) {
  return (
    <header className="cv-header" data-photo={ctx.hasPhoto ? photoSide : "none"}>
      {photoSide === "left" ? <Photo ctx={ctx} /> : null}
      <div className="cv-header-text">
        <h1 className="cv-name">{ctx.name}</h1>
        {ctx.resume.personal.jobTitle ? <div className="cv-jobtitle">{ctx.resume.personal.jobTitle}</div> : null}
        <ContactLine ctx={ctx} />
      </div>
      {photoSide === "right" ? <Photo ctx={ctx} /> : null}
    </header>
  )
}

/** Lisbon: colored rules under section titles, calm and classic. */
export function Lisbon({ ctx }: { ctx: Ctx }) {
  return (
    <div className="cv-pad">
      <Header ctx={ctx} />
      <Sections ctx={ctx} sections={visibleSections(ctx)} />
    </div>
  )
}

/** Oxford: serif, centered, titles framed by hairlines. */
export function Oxford({ ctx }: { ctx: Ctx }) {
  return (
    <div className="cv-pad">
      <Header ctx={ctx} />
      <Sections
        ctx={ctx}
        sections={visibleSections(ctx)}
        opts={{
          renderTitle: (title) => (
            <h2 className="cv-section-title">
              <span>{title}</span>
            </h2>
          ),
        }}
      />
    </div>
  )
}

/** Plain: no decoration at all, the safest choice for parsers. */
export function Plain({ ctx }: { ctx: Ctx }) {
  return (
    <div className="cv-pad">
      <Header ctx={ctx} />
      <Sections ctx={ctx} sections={visibleSections(ctx)} />
    </div>
  )
}

/** Meridian: name in color, photo on the right, accent bar on titles. */
export function Meridian({ ctx }: { ctx: Ctx }) {
  return (
    <div className="cv-pad">
      <Header ctx={ctx} photoSide="right" />
      <Sections ctx={ctx} sections={visibleSections(ctx)} opts={{ entry: "stacked" }} />
    </div>
  )
}

/** Ledger: section titles in a left label column. */
export function Ledger({ ctx }: { ctx: Ctx }) {
  return (
    <div className="cv-pad">
      <Header ctx={ctx} />
      <Sections ctx={ctx} sections={visibleSections(ctx)} opts={{ entry: "stacked" }} />
    </div>
  )
}

/** Swift: bold colored name and small caps titles. */
export function Swift({ ctx }: { ctx: Ctx }) {
  return (
    <div className="cv-pad">
      <header className="cv-header" data-photo={ctx.hasPhoto ? "left" : "none"}>
        <Photo ctx={ctx} />
        <div className="cv-header-text">
          <h1 className="cv-name">{ctx.name}</h1>
          {ctx.resume.personal.jobTitle ? <div className="cv-jobtitle">{ctx.resume.personal.jobTitle}</div> : null}
        </div>
      </header>
      <ContactStack ctx={ctx} />
      <Sections ctx={ctx} sections={visibleSections(ctx)} />
    </div>
  )
}

/** Vector: colored uppercase titles and skill chips. */
export function Vector({ ctx }: { ctx: Ctx }) {
  return (
    <div className="cv-pad">
      <Header ctx={ctx} photoSide="right" />
      <Sections ctx={ctx} sections={visibleSections(ctx)} opts={{ entry: "stacked" }} />
    </div>
  )
}

/** Timeline: dates in a left gutter with a vertical line. */
export function TimelineDesign({ ctx }: { ctx: Ctx }) {
  return (
    <div className="cv-pad">
      <Header ctx={ctx} />
      <Sections ctx={ctx} sections={visibleSections(ctx)} opts={{ entry: "stacked", dateGutter: true }} />
    </div>
  )
}

/** Bold: a heavy name block and filled title tags. */
export function Bold({ ctx }: { ctx: Ctx }) {
  return (
    <div className="cv-pad">
      <header className="cv-header" data-photo={ctx.hasPhoto ? "right" : "none"}>
        <div className="cv-header-text">
          <h1 className="cv-name">{ctx.name}</h1>
          {ctx.resume.personal.jobTitle ? <div className="cv-jobtitle">{ctx.resume.personal.jobTitle}</div> : null}
          <ContactLine ctx={ctx} />
        </div>
        <Photo ctx={ctx} />
      </header>
      <Sections
        ctx={ctx}
        sections={visibleSections(ctx)}
        opts={{
          entry: "stacked",
          renderTitle: (title) => (
            <h2 className="cv-section-title">
              <span>{title}</span>
            </h2>
          ),
        }}
      />
    </div>
  )
}
