import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import SurfaceCard from "./SurfaceCard.vue";

describe("SurfaceCard", () => {
    it("renders slot content", () => {
        const wrapper = mount(SurfaceCard, {
            slots: { default: "<p>カード内容</p>" },
        });
        expect(wrapper.text()).toContain("カード内容");
    });

    it("renders as section by default", () => {
        const wrapper = mount(SurfaceCard);
        expect(wrapper.element.tagName).toBe("SECTION");
    });

    it("renders as the specified tag", () => {
        const wrapper = mount(SurfaceCard, {
            props: { tag: "div" },
        });
        expect(wrapper.element.tagName).toBe("DIV");
    });

    it("applies overflow-hidden class when overflowHidden is true", () => {
        const wrapper = mount(SurfaceCard, {
            props: { overflowHidden: true },
        });
        expect(wrapper.classes()).toContain("overflow-hidden");
    });

    it("does not apply overflow-hidden class by default", () => {
        const wrapper = mount(SurfaceCard);
        expect(wrapper.classes()).not.toContain("overflow-hidden");
    });

    it("applies shadow class based on shadow prop", () => {
        const wrapper = mount(SurfaceCard, {
            props: { shadow: "lv2" },
        });
        expect(wrapper.classes()).toContain("shadow-lv2");
    });

    it("passes through the id prop", () => {
        const wrapper = mount(SurfaceCard, {
            props: { id: "section-id" },
        });
        expect(wrapper.attributes("id")).toBe("section-id");
    });
});
