import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import type { FormQuestion } from "@/features/forms/api";
import type { FormAnswer, FormAnswerDraft } from "@/features/forms/answers";
import AnswerQuestionFields from "./AnswerQuestionFields.vue";

function createQuestion(overrides: Partial<FormQuestion>): FormQuestion {
    return {
        id: "question-1",
        name: "設問",
        description: "説明",
        type: "text",
        isRequired: false,
        numberMin: null,
        numberMax: null,
        allowedTypes: "",
        options: [],
        priority: 1,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
        ...overrides,
    };
}

function createProps(
    question: FormQuestion,
    draft: FormAnswerDraft,
    answer: FormAnswer | null = null,
) {
    return {
        question,
        draft,
        answer,
        uploadButtonLabel: "アップロード",
        downloadHref: () => "/download/url",
    };
}

describe("AnswerQuestionFields", () => {
    it("updates text question draft on input", async () => {
        const question = createQuestion({ id: "question-text", type: "text" });
        const draft: FormAnswerDraft = { "question-text": "" };

        const wrapper = mount(AnswerQuestionFields, {
            props: createProps(question, draft),
        });

        await wrapper.get('input[type="text"]').setValue("山田太郎");

        expect(draft["question-text"]).toBe("山田太郎");
    });

    it("toggles checkbox values in draft", async () => {
        const question = createQuestion({
            id: "question-checkbox",
            type: "checkbox",
            options: ["机", "椅子"],
        });
        const draft: FormAnswerDraft = { "question-checkbox": [] };

        const wrapper = mount(AnswerQuestionFields, {
            props: createProps(question, draft),
        });

        const checkboxes = wrapper.findAll('input[type="checkbox"]');
        expect(checkboxes).toHaveLength(2);

        await checkboxes[0]!.setValue(true);
        expect(draft["question-checkbox"]).toEqual(["机"]);

        await checkboxes[0]!.setValue(false);
        expect(draft["question-checkbox"]).toEqual([]);
    });

    it("updates select and radio values in draft", async () => {
        const selectQuestion = createQuestion({
            id: "question-select",
            type: "select",
            options: ["A", "B"],
        });
        const selectDraft: FormAnswerDraft = { "question-select": "" };

        const selectWrapper = mount(AnswerQuestionFields, {
            props: createProps(selectQuestion, selectDraft),
        });
        await selectWrapper.get("select").setValue("B");
        expect(selectDraft["question-select"]).toBe("B");

        const radioQuestion = createQuestion({
            id: "question-radio",
            type: "radio",
            options: ["はい", "いいえ"],
        });
        const radioDraft: FormAnswerDraft = { "question-radio": "" };

        const radioWrapper = mount(AnswerQuestionFields, {
            props: createProps(radioQuestion, radioDraft),
        });
        const radios = radioWrapper.findAll('input[type="radio"]');
        await radios[1]!.setValue(true);

        expect(radioDraft["question-radio"]).toBe("いいえ");
    });

    it("renders upload list and emits file events", async () => {
        const question = createQuestion({
            id: "question-upload",
            type: "upload",
        });
        const draft: FormAnswerDraft = {};
        const answer: FormAnswer = {
            id: "answer-1",
            body: "",
            updatedAt: "2026-03-02T00:00:00Z",
            details: {},
            uploads: [
                {
                    id: "upload-1",
                    questionId: "question-upload",
                    filename: "layout.pdf",
                    mimeType: "application/pdf",
                    sizeBytes: 128,
                    createdAt: "2026-03-02T10:00:00Z",
                },
            ],
        };

        const wrapper = mount(AnswerQuestionFields, {
            props: {
                ...createProps(question, draft, answer),
                uploadErrorMessage: "アップロードに失敗しました",
            },
        });

        expect(wrapper.text()).toContain("layout.pdf");
        expect(wrapper.get('a[href="/download/url"]').text()).toContain("表示");
        expect(wrapper.text()).toContain("アップロードに失敗しました");

        const fileInput = wrapper.get('input[type="file"]');
        await fileInput.trigger("change");
        expect(wrapper.emitted("fileChange")?.[0]).toEqual(["question-upload", expect.any(Event)]);

        await wrapper.get('button[type="button"]').trigger("click");
        expect(wrapper.emitted("upload")?.[0]).toEqual(["question-upload"]);
    });

    it("uses custom download label and pending upload label", () => {
        const question = createQuestion({ id: "question-upload", type: "upload" });
        const draft: FormAnswerDraft = {};

        const wrapper = mount(AnswerQuestionFields, {
            props: {
                ...createProps(question, draft),
                uploadPending: true,
                downloadLabel: "DL",
            },
        });

        expect(wrapper.text()).toContain("送信中...");
        expect(wrapper.text()).toContain("まだファイルはアップロードされていません。");
        expect(wrapper.find('a[href="/download/url"]').exists()).toBe(false);
    });

    it("disables controls when disabled is true", () => {
        const question = createQuestion({ id: "question-text", type: "text" });
        const draft: FormAnswerDraft = { "question-text": "" };

        const wrapper = mount(AnswerQuestionFields, {
            props: {
                ...createProps(question, draft),
                disabled: true,
            },
        });

        expect(wrapper.get('input[type="text"]').attributes("disabled")).toBeDefined();
    });
});
