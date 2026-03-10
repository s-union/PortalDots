<template>
  <form-item :item_id="question_id" type_label="整数入力">
    <template v-slot:content>
      <div class="form-group mb-0">
        <label class="mb-1">
          {{ name }}
          <span class="badge badge-danger" v-if="is_required">必須</span>
        </label>
        <p class="form-text text-muted mb-2">
          {{ description }}
        </p>
        <template v-if="numberOptions.length > 0">
          <select class="custom-select" tabindex="-1">
            <option>整数入力</option>
            <option v-for="n in numberOptions" :key="n" :value="n">
              {{ n }}
            </option>
          </select>
        </template>
        <template v-else>
          <select class="custom-select" tabindex="-1" disabled>
            <option>最低数・最大数を設定してください</option>
          </select>
        </template>
      </div>
    </template>
    <template v-slot:edit-panel>
      <edit-panel
        :question="question"
        label_number_min="最低数"
        label_number_max="最大数"
      />
    </template>
  </form-item>
</template>

<script>
import FormItem from "./FormItem.vue";
import EditPanel from "./EditPanel.vue";
import { GET_QUESTION_BY_ID } from "../../store/editor";

export default {
  props: {
    question_id: {
      required: true,
      type: Number,
    },
  },
  components: {
    FormItem,
    EditPanel,
  },
  computed: {
    question() {
      return this.$store.getters[`editor/${GET_QUESTION_BY_ID}`](
        this.question_id
      );
    },
    name() {
      return this.question.name || "(無題の設問)";
    },
    description() {
      return this.question.description;
    },
    is_required() {
      return this.question.is_required;
    },
    numberOptions() {
      const min = this.question.number_min;
      const max = this.question.number_max;
      if (min == null || max == null || min > max) {
        return [];
      }
      const options = [];
      for (let i = min; i <= max; i++) {
        options.push(i);
      }
      return options;
    },
  },
};
</script>
