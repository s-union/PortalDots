import { Html, Head, Body, Container, Text, Heading, Markdown, render } from 'hono-email'
import { createEmailStyles, EmailPreview } from './styles'

export async function renderMarkdownNotice(variables: Record<string, string>) {
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
          <Markdown>{variables.body || ''}</Markdown>
          <Text class={styles.footer}>
            {variables.appName}
            <br />
            <a href={variables.appURL}>{variables.appURL}</a>
            <br />
            <br />
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
