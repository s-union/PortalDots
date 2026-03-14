<template>
  <select
    v-if="numberOptions.length > 0"
    :id="inputId"
    :name="inputName"
    class="form-control"
    :required="required"
    :disabled="disabled"
    :value="value || ''"
  >
    <option value="" disabled hidden>選択してください</option>
    <option
      v-for="n in numberOptions"
      :key="n"
      :value="n"
    >
      {{ n }}
    </option>
  </select>
  <input
    v-else
    type="number"
    :id="inputId"
    :name="inputName"
    class="form-control"
    :value="value"
    :required="required"
    step="1"
    :min="numberMin"
    :max="numberMax"
    :readonly="disabled"
  />
</template>

<script>
export default {
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
  computed: {
    numberOptions() {
      if (this.numberMin == null || this.numberMax == null || this.numberMin > this.numberMax) {
        return [];
      }
      const options = [];
      for (let i = this.numberMin; i <= this.numberMax; i++) {
        options.push(i);
      }
      return options;
    },
  },
};
</script>
