import { Html, Head, Preview, Body, Container, Text, Heading, render } from 'hono-email'

export async function renderStaffAuthNotice(variables: Record<string, string>) {
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
          <Text>{variables.appName} のスタッフモードにアクセスするための認証コードをお知らせします。</Text>
          <Container
            style={{
              margin: '24px auto',
              padding: '16px 32px',
              backgroundColor: '#f3f4f6',
              textAlign: 'center',
              borderRadius: '8px'
            }}
          >
            <Text style={{ fontSize: '32px', fontWeight: 'bold', letterSpacing: '8px' }}>{variables.authCode}</Text>
          </Container>
          <Text style={{ fontSize: '12px', color: '#6b7280' }}>
            この認証コードの有効期限は発行から5分間です。認証コードに覚えがない場合は、このメールを破棄してください。
          </Text>
          <Text
            style={{
              marginTop: '24px',
              borderTop: '1px solid #eaeaea',
              paddingTop: '16px',
              fontSize: '12px',
              color: '#6b7280'
            }}
          >
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
