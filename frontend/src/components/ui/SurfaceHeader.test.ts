import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import SurfaceHeader from "./SurfaceHeader.vue";

describe("SurfaceHeader", () => {
    it("renders provided slots", () => {
        const wrapper = mount(SurfaceHeader, {
            slots: {
                eyebrow: "Eyebrow",
                title: "タイトル",
                description: "説明",
                actions: '<button type="button">操作</button>',
            },
        });

        expect(wrapper.text()).toContain("Eyebrow");
        expect(wrapper.text()).toContain("タイトル");
        expect(wrapper.text()).toContain("説明");
        expect(wrapper.text()).toContain("操作");
        expect(wrapper.classes()).toContain("border-b");
    });

    it("omits border class when borderless is true", () => {
        const wrapper = mount(SurfaceHeader, {
            props: {
                borderless: true,
            },
            slots: {
                title: "タイトル",
            },
        });

        expect(wrapper.classes()).not.toContain("border-b");
    });
});
