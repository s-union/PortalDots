import { render } from '@react-email/render'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  MarkdownNoticeTemplate,
  RegistrationVerifyTemplate
} from './templates/shared.js'

type TemplateArtifacts = {
  html: string
  text: string
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outputDir = path.resolve(__dirname, '../../../backend/internal/shared/mailrender/generated')

function normalizeHTML(value: string): string {
  return value.replace(/\r?\n/g, '\n').trim() + '\n'
}

function normalizeText(value: string): string {
  return value
    .replace(/\r?\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trim() + '\n'
}

async function buildMarkdownNotice(): Promise<TemplateArtifacts> {
  return {
    html: normalizeHTML(
      await render(
        <MarkdownNoticeTemplate
          adminName="{{.AdminName}}"
          appName="{{.AppName}}"
          appURL="{{.AppURL}}"
          bodyHTML="{{.BodyHTML}}"
          contactEmail="{{.ContactEmail}}"
          preview="{{.Preview}}"
          subject="{{.Subject}}"
        />,
        { pretty: true }
      )
    ),
    text: normalizeText(`{{.AppName}}
{{.AppURL}}

{{.Subject}}

{{.BodyText}}

{{.AdminName}}
{{.ContactEmail}}`)
  }
}

async function buildRegistrationVerify(): Promise<TemplateArtifacts> {
  return {
    html: normalizeHTML(
      await render(
        <RegistrationVerifyTemplate
          adminName="{{.AdminName}}"
          appName="{{.AppName}}"
          appURL="{{.AppURL}}"
          contactEmail="{{.ContactEmail}}"
          preview="{{.Preview}}"
          subject="{{.Subject}}"
          verifyURL="{{.VerifyURL}}"
        />,
        { pretty: true }
      )
    ),
    text: normalizeText(`{{.AppName}} のユーザー登録を続けるには、以下のURLを開いてください。

{{.VerifyURL}}

このURLに覚えがない場合は、このメールを破棄してください。

{{.AdminName}}
{{.ContactEmail}}`)
  }
}

async function writeArtifacts(name: string, artifacts: TemplateArtifacts) {
  await writeFile(path.join(outputDir, `${name}.html.tmpl`), artifacts.html, 'utf8')
  await writeFile(path.join(outputDir, `${name}.txt.tmpl`), artifacts.text, 'utf8')
}

async function main() {
  await mkdir(outputDir, { recursive: true })
  await writeArtifacts('markdown_notice', await buildMarkdownNotice())
  await writeArtifacts('registration_verify', await buildRegistrationVerify())
}

await main()
