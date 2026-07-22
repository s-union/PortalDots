import type { PreviewPropsConfig } from '@hono-email/preview'
import { Body, Head, Html, Markdown, Tailwind, render } from 'hono-email'
import {
  CardHeading,
  CardShell,
  FONT_FAMILY,
  Footer,
  INK,
  PAGE_BACKGROUND,
  PreviewText,
  Wordmark
} from '../components/chrome'

export interface MarkdownNoticeProps {
  adminName: string
  appName: string
  appURL: string
  body: string
  contactEmail: string
  preview?: string
  subject: string
}

export const previewProps = {
  adminName: { type: 'string', default: 'PortalDots 実行委員会' },
  appName: { type: 'string', default: 'PortalDots' },
  appURL: { type: 'string', default: 'https://example.com' },
  body: { type: 'string', default: '本文です。' },
  contactEmail: { type: 'string', default: 'contact@example.com' },
  preview: { type: 'string', default: 'プレビュー' },
  subject: { type: 'string', default: 'お知らせ' }
} satisfies PreviewPropsConfig

// The old Laravel blade rendered the plain-text notice body as Markdown with
// every single newline treated as a hard line break, matching how admins
// compose these messages as ordinary multi-line text rather than authored
// Markdown. hono-email's `<Markdown>` has no such option, so append two
// trailing spaces before each newline: remark's hard-break rule then converts
// them to `<br>`. Blank separator lines stay blank (CommonMark treats
// whitespace-only lines as blank), so paragraph breaks are unaffected.
const withHardLineBreaks = (markdown: string) => markdown.replace(/\r\n|\r|\n/g, '  \n')

// Based on hono-email's inline `DEFAULT_MARKDOWN_STYLES` as Tailwind utility
// classes, recolored to match the design tokens in components/chrome.tsx
// (brand-blue links, brand-tinted dotted blockquote rule, wash-colored code
// backgrounds). Heading sizes are deliberately scaled DOWN from the defaults:
// the card's own `<h1>` (the mail subject, 22px) must stay the largest text
// on the page, so body markdown headings run 20px and below.
// `mt-0` is required on every block-level element below: DEFAULT_MARKDOWN_STYLES
// zeroes the top margin via full margin shorthand, and without it the mail
// client's UA default top margin stacks on top of `mb-*`, producing uneven
// spacing between elements.
const markdownClassNames = {
  a: 'text-[#0a65db] underline',
  blockquote: 'm-4 px-2 pt-4 pb-0 text-[#22292f] border-l-4 border-dotted border-[#c9dcf7]',
  code: 'font-mono',
  codeInline: 'font-mono bg-[#f0f5fc] px-1 py-0.5 rounded',
  h1: 'mt-0 mb-4 text-xl leading-7 text-[#22292f] font-bold',
  h2: 'mt-0 mb-3 text-lg leading-7 text-[#22292f] font-bold',
  h3: 'mt-0 mb-3 text-base leading-6 text-[#22292f] font-bold',
  h4: 'mt-0 mb-2 text-[15px] leading-6 text-[#22292f] font-bold',
  h5: 'mt-0 mb-2 text-sm leading-5 text-[#22292f] font-bold',
  h6: 'mt-0 mb-2 text-sm leading-5 text-[#22292f] font-bold',
  img: 'block max-w-full',
  li: 'mb-1 text-[15px] leading-[1.7]',
  ol: 'mt-0 mb-4 pl-6',
  p: 'mt-0 mb-4 text-[15px] leading-[1.7]',
  pre: 'mt-0 mb-4 p-3 max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] bg-[#f0f5fc] rounded-md',
  table: 'w-full mb-4 border-collapse',
  td: 'p-2 border border-[#d7dee4] align-top break-words',
  th: 'p-2 border border-[#d7dee4] align-top text-left bg-[#f0f5fc] break-words',
  ul: 'mt-0 mb-4 pl-6'
}

export default function MarkdownNotice({
  adminName,
  appName,
  appURL,
  body,
  contactEmail,
  preview,
  subject
}: MarkdownNoticeProps) {
  return (
    <Html lang="ja">
      <Head>
        <title>{subject}</title>
      </Head>
      <Tailwind>
        <Body
          style={{
            backgroundColor: PAGE_BACKGROUND,
            color: INK,
            fontFamily: FONT_FAMILY,
            margin: 0,
            padding: '0 0 40px'
          }}
        >
          <PreviewText>{preview || subject}</PreviewText>
          <Wordmark appName={appName} appURL={appURL} />
          <CardShell>
            <CardHeading>{subject}</CardHeading>
            <Markdown
              markdownStyleMode="tailwind"
              markdownContainerClassName="text-[#22292f] text-[15px] leading-[1.8]"
              markdownCustomClassNames={markdownClassNames}
            >
              {withHardLineBreaks(body)}
            </Markdown>
          </CardShell>
          <Footer adminName={adminName} appName={appName} appURL={appURL} contactEmail={contactEmail} />
        </Body>
      </Tailwind>
    </Html>
  )
}

export async function renderMarkdownNotice(variables: Record<string, string>) {
  return render(
    <MarkdownNotice
      adminName={variables.adminName ?? ''}
      appName={variables.appName ?? ''}
      appURL={variables.appURL ?? ''}
      body={variables.body ?? ''}
      contactEmail={variables.contactEmail ?? ''}
      preview={variables.preview}
      subject={variables.subject ?? ''}
    />,
    {
      text: {
        headingStyle: 'preserve',
        linkFormat: 'text-only'
      }
    }
  )
}
