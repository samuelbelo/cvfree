import { ContactLine, ContactStack, type Ctx, Photo, Sections, splitColumns } from "../blocks"

/*
 * Two-column designs. The side column holds short sections (skills,
 * languages, links). Users can move any section between columns. The colored
 * side background is a separate layer so it covers every printed page.
 */

function NameBlock({ ctx }: { ctx: Ctx }) {
  return (
    <div className="cv-name-block">
      <h1 className="cv-name">{ctx.name}</h1>
      {ctx.resume.personal.jobTitle ? <div className="cv-jobtitle">{ctx.resume.personal.jobTitle}</div> : null}
    </div>
  )
}

/** Atlas: dark color sidebar on the left with photo and details. */
export function Atlas({ ctx }: { ctx: Ctx }) {
  const { main, side } = splitColumns(ctx)
  return (
    <>
      <div className="cv-side-bg" aria-hidden />
      <div className="cv-cols">
        <aside className="cv-side cv-pad">
          <Photo ctx={ctx} />
          <ContactStack ctx={ctx} title={ctx.w.details} />
          <Sections ctx={ctx} sections={side} opts={{ narrow: true }} />
        </aside>
        <main className="cv-main cv-pad">
          <NameBlock ctx={ctx} />
          <Sections ctx={ctx} sections={main} opts={{ entry: "stacked" }} />
        </main>
      </div>
    </>
  )
}

/** Nordic: light tinted column on the left, big name on the right. */
export function Nordic({ ctx }: { ctx: Ctx }) {
  const { main, side } = splitColumns(ctx)
  return (
    <>
      <div className="cv-side-bg" aria-hidden />
      <div className="cv-cols">
        <aside className="cv-side cv-pad">
          <Photo ctx={ctx} />
          <ContactStack ctx={ctx} title={ctx.w.details} />
          <Sections ctx={ctx} sections={side} opts={{ narrow: true }} />
        </aside>
        <main className="cv-main cv-pad">
          <NameBlock ctx={ctx} />
          <Sections ctx={ctx} sections={main} opts={{ entry: "stacked" }} />
        </main>
      </div>
    </>
  )
}

/** Summit: centered header with photo, thin dividers, side column on the left. */
export function Summit({ ctx }: { ctx: Ctx }) {
  const { main, side } = splitColumns(ctx)
  return (
    <div className="cv-pad">
      <header className="cv-header cv-header-center">
        <Photo ctx={ctx} />
        <NameBlock ctx={ctx} />
        <ContactLine ctx={ctx} separator="•" />
      </header>
      <div className="cv-cols cv-cols-inner">
        <aside className="cv-side">
          <Sections ctx={ctx} sections={side} opts={{ narrow: true }} />
        </aside>
        <main className="cv-main">
          <Sections ctx={ctx} sections={main} opts={{ entry: "stacked" }} />
        </main>
      </div>
    </div>
  )
}

/** Horizon: full-width color band header, side column on the right. */
export function Horizon({ ctx }: { ctx: Ctx }) {
  const { main, side } = splitColumns(ctx)
  return (
    <>
      <header className="cv-band">
        <Photo ctx={ctx} />
        <div>
          <NameBlock ctx={ctx} />
          <ContactLine ctx={ctx} separator="•" />
        </div>
      </header>
      <div className="cv-cols">
        <main className="cv-main cv-pad">
          <Sections ctx={ctx} sections={main} opts={{ entry: "stacked" }} />
        </main>
        <aside className="cv-side cv-pad">
          <Sections ctx={ctx} sections={side} opts={{ narrow: true }} />
        </aside>
      </div>
    </>
  )
}

/** Duo: ATS friendly two-tone layout, name across the top. */
export function Duo({ ctx }: { ctx: Ctx }) {
  const { main, side } = splitColumns(ctx)
  return (
    <>
      <div className="cv-side-bg" aria-hidden />
      <div className="cv-cols">
        <main className="cv-main cv-pad">
          <header className="cv-header">
            <NameBlock ctx={ctx} />
            <ContactLine ctx={ctx} />
          </header>
          <Sections ctx={ctx} sections={main} />
        </main>
        <aside className="cv-side cv-pad">
          <Photo ctx={ctx} />
          <Sections ctx={ctx} sections={side} opts={{ narrow: true }} />
        </aside>
      </div>
    </>
  )
}
