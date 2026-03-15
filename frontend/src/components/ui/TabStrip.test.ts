import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import TabStrip from "./TabStrip.vue";

describe("TabStrip", () => {
    it("renders tab labels", () => {
        const wrapper = mount(TabStrip, {
            props: {
                tabs: [{ label: "タブ1" }, { label: "タブ2" }, { label: "タブ3" }],
            },
        });
        expect(wrapper.text()).toContain("タブ1");
        expect(wrapper.text()).toContain("タブ2");
        expect(wrapper.text()).toContain("タブ3");
    });

    it("renders an anchor tag when href is provided", () => {
        const wrapper = mount(TabStrip, {
            props: {
                tabs: [{ label: "リンク付き", href: "/some-page" }],
            },
        });
        const anchor = wrapper.find("a");
        expect(anchor.exists()).toBe(true);
        expect(anchor.attributes("href")).toBe("/some-page");
    });

    it("renders a span tag when href is not provided", () => {
        const wrapper = mount(TabStrip, {
            props: {
                tabs: [{ label: "リンクなし" }],
            },
        });
        expect(wrapper.find("span").exists()).toBe(true);
        expect(wrapper.find("a").exists()).toBe(false);
    });

    it("shows active indicator for active tab", () => {
        const wrapper = mount(TabStrip, {
            props: {
                tabs: [
                    { label: "アクティブ", active: true },
                    { label: "非アクティブ", active: false },
                ],
            },
        });
        // Active indicator span is rendered only for active tab
        const indicators = wrapper.findAll('span[aria-hidden="true"]');
        expect(indicators).toHaveLength(1);
    });

    it("does not show active indicator for inactive tabs", () => {
        const wrapper = mount(TabStrip, {
            props: {
                tabs: [{ label: "タブ1" }, { label: "タブ2" }],
            },
        });
        expect(wrapper.find('span[aria-hidden="true"]').exists()).toBe(false);
    });
});
