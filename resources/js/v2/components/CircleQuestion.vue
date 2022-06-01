<template>
  <div>
    <ListViewFormGroup label-for="question-food" class="question-item">
      <template #label>
        飲食販売に参加するか
        <AppBadge danger>必須</AppBadge>
      </template>
      <template #description>
        <p class="question-item__description is-text-color">
          飲食販売に参加するかどうかを選択してください。
        </p>
      </template>
      <QuestionRadio
        input-id="question-food"
        input-name="answer-food"
        :required="true"
        v-model="foodValue"
        :options="yesOrNo"
      />
    </ListViewFormGroup>

    <ListViewFormGroup
      label-for="question-food-booth"
      class="question-item"
      v-if="foodValue === 'はい'"
    >
      <template #label>
        飲食販売のブース数
        <AppBadge danger v-if="foodValue === 'はい'">必須</AppBadge>
      </template>
      <template #description>
        <p class="question-item__description is-text-color">
          飲食販売として使用するブース数を入力してください。
        </p>
      </template>
      <QuestionNumber
        input-id="question-food-booth"
        input-name="answer-food-booth"
        :required="foodValue === 'はい'"
        :value="values['answer-food-booth']"
        :number-min="1"
      />
    </ListViewFormGroup>

    <ListViewFormGroup label-for="question-seller" class="question-item">
      <template #label>
        物品販売に参加するか
        <AppBadge danger>必須</AppBadge>
      </template>
      <template #description>
        <p class="question-item__description is-text-color">
          物品販売に参加するかどうかを選択してください。
        </p>
      </template>
      <QuestionRadio
        input-id="question-seller"
        input-name="answer-seller"
        :required="true"
        v-model="sellerValue"
        :options="yesOrNo"
      />
    </ListViewFormGroup>

    <ListViewFormGroup
      label-for="question-seller-booth"
      class="question-item"
      v-if="sellerValue === 'はい'"
    >
      <template #label>
        物品販売のブース数
        <AppBadge danger v-if="sellerValue === 'はい'">必須</AppBadge>
      </template>
      <template #description>
        <p class="question-item__description is-text-color">
          物品販売として使用するブース数を入力してください。
        </p>
      </template>
      <QuestionNumber
        input-id="question-seller-booth"
        input-name="answer-seller-booth"
        :required="sellerValue === 'はい'"
        :value="values['answer-seller-booth']"
        :number-min="1"
      />
    </ListViewFormGroup>

    <ListViewFormGroup label-for="question-exh-seller" class="question-item">
      <template #label>
        展示・実演(収入あり)に参加するか
        <AppBadge danger>必須</AppBadge>
      </template>
      <template #description>
        <p class="question-item__description is-text-color">
          展示・実演(収入あり)に参加するかどうかを選択してください。
        </p>
      </template>
      <QuestionRadio
        input-id="question-exh-seller"
        input-name="answer-exh-seller"
        :required="true"
        v-model="exhSellerValue"
        :options="yesOrNo"
      />
    </ListViewFormGroup>

    <ListViewFormGroup
      label-for="question-exh-seller-booth"
      class="question-item"
      v-if="exhSellerValue === 'はい'"
    >
      <template #label>
        展示・実演(収入あり)のブース数
        <AppBadge danger v-if="exhSellerValue === 'はい'">必須</AppBadge>
      </template>
      <template #description>
        <p class="question-item__description is-text-color">
          展示・実演(収入あり)として使用するブース数を入力してください。
        </p>
      </template>
      <QuestionNumber
        input-id="question-exh-seller-booth"
        input-name="answer-exh-seller-booth"
        :required="exhSellerValue === 'はい'"
        :value="values['answer-exh-seller-booth']"
        :number-min="1"
      />
    </ListViewFormGroup>

    <ListViewFormGroup label-for="question-exh" class="question-item">
      <template #label>
        展示・実演(収入なし)に参加するか
        <AppBadge danger>必須</AppBadge>
      </template>
      <template #description>
        <p class="question-item__description is-text-color">
          展示・実演(収入なし)に参加するかどうかを選択してください。
        </p>
      </template>
      <QuestionRadio
        input-id="question-exh"
        input-name="answer-exh"
        :required="true"
        v-model="exhValue"
        :options="yesOrNo"
      />
    </ListViewFormGroup>

    <ListViewFormGroup
      label-for="question-exh-booth"
      class="question-item"
      v-if="exhValue === 'はい'"
    >
      <template #label>
        展示・実演(収入なし)のブース数
        <AppBadge danger v-if="exhValue === 'はい'">必須</AppBadge>
      </template>
      <template #description>
        <p class="question-item__description is-text-color">
          展示・実演(収入なし)として使用するブース数を入力してください。
        </p>
      </template>
      <QuestionNumber
        input-id="question-exh-booth"
        input-name="answer-exh-booth"
        :required="exhValue === 'はい'"
        :value="values['answer-exh-booth']"
        :number-min="1"
      />
    </ListViewFormGroup>
  </div>
</template>

<script>
import ListViewFormGroup from './ListViewFormGroup.vue'
import AppBadge from './AppBadge.vue'
import QuestionRadio from './Forms/QuestionRadio.vue'
import QuestionNumber from './Forms/QuestionNumber.vue'

export default {
  components: { QuestionRadio, QuestionNumber, AppBadge, ListViewFormGroup },
  props: {
    values: {
      type: Object,
      required: false,
      default: () => Object()
    }
  },
  data() {
    return {
      foodValue: this.values['answer-food'],
      sellerValue: this.values['answer-seller'],
      exhSellerValue: this.values['answer-exh-seller'],
      exhValue: this.values['answer-exh']
    }
  },
  computed: {
    yesOrNo() {
      return ['はい', 'いいえ']
    }
  }
}
</script>

<style lang="scss" scoped></style>
