import type { TestRunnerConfig } from "@storybook/test-runner";

const config: TestRunnerConfig = {
  async preVisit(page) {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          transition-duration: 0s !important;
          animation-duration: 0s !important;
          caret-color: transparent !important;
        }
      `,
    });
  },
};

export default config;
