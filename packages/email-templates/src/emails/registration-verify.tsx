import { RegistrationVerifyTemplate } from '../templates/shared.js'

export default function RegistrationVerifyPreview() {
  return (
    <RegistrationVerifyTemplate
      adminName="PortalDots 実行委員会"
      appName="PortalDots"
      appURL="https://example.com"
      contactEmail="contact@example.com"
      preview="PortalDots ユーザー登録の確認"
      subject="PortalDots ユーザー登録の確認"
      verifyURL="https://example.com/email/"
    />
  )
}
