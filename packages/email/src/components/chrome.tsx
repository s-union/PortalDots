import type { PropsWithChildren } from 'hono/jsx'
import { Card, Column, Heading, LinkButton, Section, Text } from 'hono-email'

// Shared chrome for all email templates, built around PortalDots' own "dot"
// identity: the wordmark ends in a brand-blue full stop, headings carry a
// three-dot ornament fading from brand blue to a faint tint, and every rule
// is dotted rather than solid. Colors stay on the frontend design tokens
// (see frontend/src/styles/app.css `@theme`) so mail matches the app.
//
// Everything uses plain inline `style` objects rather than Tailwind class
// names: the `<Tailwind>` bundler plugin only scans class-name literals in
// the SAME file that contains the `<Tailwind>` JSX tag, so a shared component
// file with Tailwind classes would never get its styles inlined. Inline
// styles are also the most email-client-safe option.

export const CARD_WIDTH = 570

export const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', Meiryo, sans-serif"
export const MONO_FAMILY = "'SF Mono', SFMono-Regular, Menlo, Consolas, 'Courier New', monospace"

// Design tokens mirrored from frontend/src/styles/app.css's `@theme` block,
// plus two brand-blue tints used by the dot ornaments and dotted rules.
export const PAGE_BACKGROUND = '#f3f4fa' // --color-base
export const INK = '#22292f' // --color-body
export const MUTED = '#586169' // --color-muted (light mode)
export const BRAND = '#0a65db' // --color-primary
export const BRAND_SOFT = '#7fabe9' // brand @ ~50% over white
export const BRAND_FAINT = '#c9dcf7' // brand @ ~20% over white
export const WASH = '#f0f5fc' // brand-tinted panel background
const LINE = '#d7dee4' // --color-border

// Hidden preheader text, shown by mail clients' inbox preview but not the
// message body. `data-hono-email-preview="true"` tells hono-email's renderer
// to relocate this element right after `<body>`. Deliberately hand-rolled
// instead of hono-email's built-in `<Preview>`: that component's `opacity`
// and default padding trigger strict-mode validation warnings this project
// otherwise has none of.
export function PreviewText({ children }: PropsWithChildren) {
  return (
    <div
      data-hono-email-preview="true"
      style={{
        display: 'none',
        maxHeight: '0px',
        maxWidth: '0px',
        fontSize: '1px',
        lineHeight: '1px',
        color: '#ffffff',
        msoHide: 'all'
      }}
    >
      {children}
    </div>
  )
}

interface WordmarkProps {
  appName: string
  appURL?: string
}

// App name set as a wordmark — the name closed by an oversized brand-blue
// full stop, echoing the "Dots" in PortalDots. Left-aligned to the card edge.
// Rendered as a link when `appURL` is known, plain text otherwise.
export function Wordmark({ appName, appURL }: WordmarkProps) {
  const markStyle = {
    color: INK,
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '-0.2px',
    textDecoration: 'none'
  }
  const mark = (
    <>
      {appName}
      <span style={{ color: BRAND }}>.</span>
    </>
  )

  return (
    <table
      role="presentation"
      border={0}
      cellPadding="0"
      cellSpacing="0"
      width={CARD_WIDTH}
      align="center"
      style={{ width: `${CARD_WIDTH}px`, maxWidth: '100%', margin: '0 auto' }}
    >
      <tbody>
        <tr>
          <td style={{ padding: '36px 4px 20px', textAlign: 'left' }}>
            {appURL ? (
              <a href={appURL} style={markStyle}>
                {mark}
              </a>
            ) : (
              <span style={markStyle}>{mark}</span>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  )
}

// White card holding the message body, topped by a brand gradient strip.
// The strip carries the rounded top corners; the card body carries the
// bottom ones, so the two tables read as a single surface. Outlook ignores
// `background-image` and falls back to the solid brand `background-color`.
export function CardShell({ children }: PropsWithChildren) {
  return (
    <>
      <table
        role="presentation"
        border={0}
        cellPadding="0"
        cellSpacing="0"
        width={CARD_WIDTH}
        align="center"
        style={{ width: `${CARD_WIDTH}px`, maxWidth: '100%', margin: '0 auto' }}
      >
        <tbody>
          <tr>
            <td
              style={{
                backgroundColor: BRAND,
                backgroundImage: `linear-gradient(90deg, ${BRAND} 0%, ${BRAND_SOFT} 70%, ${BRAND_FAINT} 100%)`,
                borderRadius: '16px 16px 0 0',
                fontSize: '5px',
                height: '5px',
                lineHeight: '5px'
              }}
            >
              &nbsp;
            </td>
          </tr>
        </tbody>
      </table>
      <Card
        width={CARD_WIDTH}
        backgroundColor="#ffffff"
        borderColor={LINE}
        borderWidth={1}
        padding={40}
        contentStyle={{ borderRadius: '0 0 16px 16px', borderTop: 'none', textAlign: 'left' }}
        style={{ width: `${CARD_WIDTH}px`, maxWidth: '100%', margin: '0 auto' }}
      >
        {children}
      </Card>
    </>
  )
}

// Small letterspaced category label sitting above the heading.
export function Eyebrow({ children }: PropsWithChildren) {
  return (
    <Text style={{ color: BRAND, fontSize: '11px', fontWeight: 'bold', letterSpacing: '2.5px', margin: '0 0 10px' }}>
      {children}
    </Text>
  )
}

// `<h1>` heading followed by the signature three-dot ornament, fading from
// brand blue out to the faint tint. The dots are empty inline-block spans
// (not text bullets) so the derived plain-text version stays clean; clients
// that drop sized spans (Outlook's Word engine) just lose the ornament.
function Dot({ color, first }: { color: string; first?: boolean }) {
  return (
    <span
      style={{
        backgroundColor: color,
        borderRadius: '3px',
        display: 'inline-block',
        height: '6px',
        marginLeft: first ? '0' : '5px',
        verticalAlign: 'top',
        width: '6px'
      }}
    ></span>
  )
}

export function CardHeading({ children }: PropsWithChildren) {
  return (
    <>
      <Heading
        as="h1"
        style={{
          color: INK,
          fontSize: '24px',
          fontWeight: 'bold',
          letterSpacing: '-0.5px',
          lineHeight: '1.4',
          margin: '0 0 14px',
          textAlign: 'left'
        }}
      >
        {children}
      </Heading>
      <div aria-hidden="true" style={{ lineHeight: '6px', margin: '0 0 26px' }}>
        <Dot color={BRAND} first />
        <Dot color={BRAND_SOFT} />
        <Dot color={BRAND_FAINT} />
      </div>
    </>
  )
}

// Body paragraph text.
export function BodyText({ children }: PropsWithChildren) {
  return (
    <Text style={{ color: INK, fontSize: '15px', lineHeight: '1.8', margin: '0 0 16px', textAlign: 'left' }}>
      {children}
    </Text>
  )
}

// Primary call-to-action button.
export function PrimaryButton({ children, href }: PropsWithChildren<{ href: string }>) {
  return (
    <Section style={{ margin: '32px 0' }}>
      <Column style={{ textAlign: 'center' }}>
        <LinkButton
          href={href}
          style={{
            backgroundColor: BRAND,
            borderRadius: '10px',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 'bold',
            letterSpacing: '0.2px',
            padding: '14px 44px'
          }}
        >
          {children}
        </LinkButton>
      </Column>
    </Section>
  )
}

// Quiet closing note ("discard this mail if unexpected" etc.) separated from
// the body by a dotted rule.
export function Footnote({ children }: PropsWithChildren) {
  return (
    <table
      role="presentation"
      border={0}
      cellPadding="0"
      cellSpacing="0"
      width="100%"
      style={{ borderTop: `1px dotted ${BRAND_SOFT}`, marginTop: '32px' }}
    >
      <tbody>
        <tr>
          <td style={{ paddingTop: '18px' }}>
            <Text style={{ color: MUTED, fontSize: '13px', lineHeight: '1.7', margin: 0 }}>{children}</Text>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

interface FooterProps {
  adminName: string
  appName: string
  appURL?: string
  contactEmail: string
}

// Shared footer: admin contact, optional app link, and a "Powered by
// PortalDots." credit whose full stop repeats the wordmark's brand dot.
export function Footer({ adminName, appName, appURL, contactEmail }: FooterProps) {
  const linkStyle = { color: MUTED, textDecoration: 'underline' }

  return (
    <table
      role="presentation"
      border={0}
      cellPadding="0"
      cellSpacing="0"
      width={CARD_WIDTH}
      align="center"
      style={{ width: `${CARD_WIDTH}px`, maxWidth: '100%', margin: '28px auto 0' }}
    >
      <tbody>
        <tr>
          <td style={{ padding: '0 4px', textAlign: 'center' }}>
            <Text style={{ color: MUTED, fontSize: '12px', lineHeight: '2', margin: 0 }}>
              <span style={{ fontWeight: 600 }}>{adminName}</span>
              <br />
              <a href={`mailto:${contactEmail}`} style={linkStyle}>
                {contactEmail}
              </a>
              {appURL && (
                <>
                  {' '}
                  <span aria-hidden="true" style={{ color: BRAND_SOFT }}>
                    &#183;
                  </span>{' '}
                  <a href={appURL} style={linkStyle}>
                    {appName}
                  </a>
                </>
              )}
            </Text>
            <Text style={{ color: MUTED, fontSize: '11px', letterSpacing: '0.3px', margin: '16px 0 0' }}>
              Powered by{' '}
              <a href="https://www.portaldots.com" style={{ color: MUTED, fontWeight: 700, textDecoration: 'none' }}>
                PortalDots<span style={{ color: BRAND }}>.</span>
              </a>
            </Text>
          </td>
        </tr>
      </tbody>
    </table>
  )
}
