<template>
  <div class="question-markdown">
    <markdown-editor
      :inputName="inputName"
      :defaultValue="value"
      :id="inputId"
    />
  </div>
</template>

<script>
import MarkdownEditor from "../MarkdownEditor.vue";

export default {
  components: {
    MarkdownEditor,
  },
  props: {
    inputId: {
      type: String,
      default: null,
    },
    inputName: {
      type: String,
      default: null,
    },
    required: {
      type: Boolean,
      default: false,
    },
    invalid: {
      type: String,
      default: null,
    },
    value: {
      type: String,
      default: null,
    },
    numberMin: {
      type: Number,
      default: null,
    },
    numberMax: {
      type: Number,
      default: null,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
};
</script>
