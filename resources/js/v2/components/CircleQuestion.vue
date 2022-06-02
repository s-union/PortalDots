<template>
  <div>
    <ListViewFormGroup
      label-for="question-attendance-type"
      class="question-item"
    >
      <template #label>
        この企画の参加形態
        <AppBadge danger>必須</AppBadge>
      </template>
      <template #description>
        <p class="question-item__description is-text-color">
          この企画の参加形態を下記の中から選択してください。
        </p>
      </template>
      <QuestionSelect
        input-id="question-attendance-type"
        input-name="answer_attendance_type"
        :required="true"
        :value="attendanceType"
        :options="attendanceTypes"
      />
    </ListViewFormGroup>
  </div>
</template>

<script>
import ListViewFormGroup from './ListViewFormGroup.vue'
import AppBadge from './AppBadge.vue'
import QuestionSelect from './Forms/QuestionSelect.vue'

export default {
  name: 'CircleQuestion',
  components: { QuestionSelect, AppBadge, ListViewFormGroup },
  props: {
    attendanceType: {
      type: String,
      required: false,
      default: () => null
    },
    attendanceTypes: {
      type: Array,
      required: true
    }
  },
}
</script>

<style scoped></style>
