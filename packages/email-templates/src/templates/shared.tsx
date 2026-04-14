import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text
} from '@react-email/components'
import type { CSSProperties, ReactNode } from 'react'

const colors = {
  background: '#f4f7fb',
  surface: '#ffffff',
  border: '#dce5f0',
  text: '#304554',
  muted: '#5f7286',
  primary: '#3869d4'
} as const

const fontFamily =
  "'Segoe UI', Meiryo, system-ui, -apple-system, Roboto, 'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'"

const bodyStyle: CSSProperties = {
  backgroundColor: colors.background,
  color: colors.text,
  fontFamily,
  margin: 0,
  padding: '24px 12px',
  width: '100%'
}

const containerStyle: CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: '16px',
  margin: '0 auto',
  maxWidth: '600px',
  overflow: 'hidden'
}

const headerStyle: CSSProperties = {
  padding: '28px 32px 20px',
  textAlign: 'center'
}

const contentStyle: CSSProperties = {
  borderTop: `1px solid ${colors.border}`,
  padding: '32px'
}

const footerStyle: CSSProperties = {
  color: colors.muted,
  fontSize: '14px',
  lineHeight: '1.7',
  padding: '24px 32px 32px',
  textAlign: 'center'
}

const brandLinkStyle: CSSProperties = {
  color: colors.text,
  fontSize: '20px',
  fontWeight: '700',
  textDecoration: 'none'
}

const headingStyle: CSSProperties = {
  color: colors.text,
  fontSize: '24px',
  fontWeight: '700',
  lineHeight: '1.4',
  margin: '0 0 20px'
}

const textStyle: CSSProperties = {
  color: colors.text,
  fontSize: '16px',
  lineHeight: '1.8',
  margin: '0 0 16px'
}

const buttonStyle: CSSProperties = {
  backgroundColor: colors.primary,
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '700',
  padding: '14px 24px',
  textDecoration: 'none'
}

export interface BrandLayoutProps {
  adminName: string
  appName: string
  appURL: string
  contactEmail: string
  children: ReactNode
  preview: string
}

export function BrandLayout({ adminName, appName, appURL, contactEmail, children, preview }: BrandLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Link href={appURL} style={brandLinkStyle}>
              {appName}
            </Link>
          </Section>
          <Section style={contentStyle}>{children}</Section>
          <Hr style={{ borderColor: colors.border, margin: 0 }} />
          <Section style={footerStyle}>
            <Text style={{ ...textStyle, color: colors.muted, marginBottom: '8px' }}>
              <strong>{adminName}</strong>
            </Text>
            <Text style={{ ...textStyle, color: colors.muted, marginBottom: '8px' }}>{contactEmail}</Text>
            <Text style={{ ...textStyle, color: colors.muted, marginBottom: 0 }}>
              <Link href={appURL} style={{ color: colors.primary }}>
                {appName}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export interface MarkdownNoticeTemplateProps {
  adminName: string
  appName: string
  appURL: string
  bodyHTML: string
  contactEmail: string
  preview: string
  subject: string
}

export function MarkdownNoticeTemplate({
  adminName,
  appName,
  appURL,
  bodyHTML,
  contactEmail,
  preview,
  subject
}: MarkdownNoticeTemplateProps) {
  return (
    <BrandLayout adminName={adminName} appName={appName} appURL={appURL} contactEmail={contactEmail} preview={preview}>
      <Heading as="h1" style={headingStyle}>
        {subject}
      </Heading>
      <div dangerouslySetInnerHTML={{ __html: bodyHTML }} />
    </BrandLayout>
  )
}

export interface RegistrationVerifyTemplateProps {
  adminName: string
  appName: string
  appURL: string
  contactEmail: string
  preview: string
  subject: string
  verifyURL: string
}

export function RegistrationVerifyTemplate({
  adminName,
  appName,
  appURL,
  contactEmail,
  preview,
  subject,
  verifyURL
}: RegistrationVerifyTemplateProps) {
  return (
    <BrandLayout adminName={adminName} appName={appName} appURL={appURL} contactEmail={contactEmail} preview={preview}>
      <Heading as="h1" style={headingStyle}>
        {subject}
      </Heading>
      <Text style={textStyle}>{appName} のユーザー登録を続けるには、以下のボタンを押してください。</Text>
      <Section style={{ margin: '24px 0', textAlign: 'center' }}>
        <Button href={verifyURL} style={buttonStyle}>
          認証URLを開く
        </Button>
      </Section>
      <Text style={{ ...textStyle, marginBottom: 0 }}>このメールに心当たりがない場合は、そのまま破棄してください。</Text>
    </BrandLayout>
  )
}
