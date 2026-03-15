import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { RouterLinkStub } from "@vue/test-utils";
import BackLink from "./BackLink.vue";

describe("BackLink", () => {
    it("renders slot content", () => {
        const wrapper = mount(BackLink, {
            props: { to: "/workspace" },
            slots: { default: "ワークスペースへ戻る" },
            global: {
                stubs: { RouterLink: RouterLinkStub },
            },
        });
        expect(wrapper.text()).toContain("ワークスペースへ戻る");
    });

    it("passes the to prop to RouterLink", () => {
        const wrapper = mount(BackLink, {
            props: { to: "/workspace" },
            global: {
                stubs: { RouterLink: RouterLinkStub },
            },
        });
        const link = wrapper.findComponent(RouterLinkStub);
        expect(link.props("to")).toBe("/workspace");
    });
});
