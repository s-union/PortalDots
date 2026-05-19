import { Html, Head, Body, Container, Text, Heading, Link, render } from 'hono-email'
import { createEmailStyles, EmailPreview } from './styles'

export async function renderRegistrationVerify(variables: Record<string, string>) {
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
          <Text>{variables.appName} のユーザー登録を続けるには、以下のURLを開いてください。</Text>
          <Text>
            <Link href={variables.verifyURL}>{variables.verifyURL}</Link>
          </Text>
          <Text class={styles.mutedText}>このURLに覚えがない場合は、このメールを破棄してください。</Text>
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
