import { MarkdownNoticeTemplate } from '../templates/shared.js'

export default function MarkdownNoticePreview() {
  return (
    <MarkdownNoticeTemplate
      adminName="PortalDots実行委員会"
      appName="PortalDots"
      appURL="https://example.com/"
      bodyHTML={`<p>これはテストです。</p><p>ここに詳しい説明文が入ります。</p>`}
      contactEmail="mail@example.com"
      preview="テスト"
      subject="テストメッセージ"
    />
  )
}
