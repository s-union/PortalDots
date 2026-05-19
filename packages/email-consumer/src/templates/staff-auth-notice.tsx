import { Html, Head, Body, Container, Text, Heading, render } from 'hono-email'
import { createEmailStyles, EmailPreview } from './styles'

export async function renderStaffAuthNotice(variables: Record<string, string>) {
  const styles = await createEmailStyles()
  const { html, text } = await render(
    <Html lang="ja">
      <Head>
        <styles.Style />
        <title>{variables.subject}</title>
      </Head>
      <EmailPreview className={styles.preview}>{variables.preview || variables.subject}</EmailPreview>
      <Body class={styles.body}>
        <Container class={styles.container}>
          <Heading as="h1">{variables.subject}</Heading>
          <Text>{variables.appName} のスタッフモードにアクセスするための認証コードをお知らせします。</Text>
          <Container class={styles.authCodeBox}>
            <Text class={styles.authCode}>{variables.authCode}</Text>
          </Container>
          <Text class={styles.mutedText}>
            この認証コードの有効期限は発行から5分間です。認証コードに覚えがない場合は、このメールを破棄してください。
          </Text>
          <Text class={styles.footer}>
            {variables.adminName}
            <br />
            <a href={`mailto:${variables.contactEmail}`}>{variables.contactEmail}</a>
          </Text>
        </Container>
      </Body>
    </Html>,
    {
      text: {
        headingStyle: 'preserve',
        linkFormat: 'text-only'
      }
    }
  )
  return { html, text }
}
