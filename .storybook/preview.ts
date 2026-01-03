import type { Preview } from "@storybook/react-vite";
import React from "react";

import "../src/styles/index.css";
import { Toast } from "../src/app/components/Toast";
import { MockAppProvider } from "../src/app/stories/MockAppProvider";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) =>
      React.createElement(
        React.Fragment,
        null,
        React.createElement(
          MockAppProvider,
          { initialBooks: [], initialRecords: [] },
          React.createElement(Story)
        ),
        React.createElement(Toast)
      ),
  ],
};

export default preview;
