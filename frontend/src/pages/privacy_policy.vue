<script setup lang="ts">
import privacyPolicyMarkdown from "../../../resources/md/privacy_policy.md?raw";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toSimpleHtml(markdown: string) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const html: string[] = [];
  let inList = false;
  let inParagraph = false;

  const closeParagraph = () => {
    if (inParagraph) {
      html.push("</p>");
      inParagraph = false;
    }
  };

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === "") {
      closeParagraph();
      closeList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      closeParagraph();
      closeList();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${escapeHtml(headingMatch[2])}</h${level}>`);
      continue;
    }

    if (line.startsWith("- ")) {
      closeParagraph();
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${escapeHtml(line.slice(2))}</li>`);
      continue;
    }

    closeList();
    if (!inParagraph) {
      html.push("<p>");
      inParagraph = true;
    } else {
      html.push("<br />");
    }
    html.push(escapeHtml(line));
  }

  closeParagraph();
  closeList();

  return html.join("");
}

const privacyPolicyHtml = toSimpleHtml(privacyPolicyMarkdown);
</script>

<template>
  <section class="mx-auto w-full max-w-[1024px] px-6 py-4 max-[1000px]:px-4">
    <section class="pb-2 pt-4">
      <div class="rounded-[0.45rem] bg-surface shadow-lv1">
        <div class="px-6 py-[1.2rem] text-base leading-[1.7] text-body max-[1000px]:px-4">
          <h2 class="mb-4 text-[1.333rem] font-semibold leading-[1.4] text-body">
            プライバシーポリシー
          </h2>
          <div
            class="[&_h1]:mb-4 [&_h1]:text-[1.333rem] [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_li]:mb-1 [&_p]:mb-3"
            v-html="privacyPolicyHtml"
          />
        </div>
      </div>
    </section>
  </section>
</template>
