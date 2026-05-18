import { Html, Head, Preview, Body, Container, Text, Heading, Markdown, render } from 'hono-email'

export async function renderMarkdownNotice(variables: Record<string, string>) {
  const { html, text } = await render(
    <Html lang="ja">
      <Head>
        <title>{variables.subject}</title>
      </Head>
      <Preview>{variables.preview || variables.subject}</Preview>
      <Body style={{ backgroundColor: '#f6f9fc', color: '#1f2937', fontFamily: 'sans-serif' }}>
        <Container
          style={{
            maxWidth: '560px',
            margin: '0 auto',
            padding: '24px',
            backgroundColor: '#ffffff'
          }}
        >
          <Heading as="h1">{variables.subject}</Heading>
          <Markdown>{variables.body || ''}</Markdown>
          <Text
            style={{
              marginTop: '24px',
              borderTop: '1px solid #eaeaea',
              paddingTop: '16px',
              fontSize: '12px',
              color: '#6b7280'
            }}
          >
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
