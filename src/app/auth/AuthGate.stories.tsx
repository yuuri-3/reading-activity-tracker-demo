import type { Meta, StoryObj } from "@storybook/react-vite";

import React from "react";

import { AuthGate } from "./AuthGate";
import { MockAuthProvider } from "./AuthContext";

const REDIRECT_FLAG_KEY = "yomzoy_redirect_in_progress";

function setRedirectFlag(value: boolean) {
  try {
    if (typeof window === "undefined") return;
    if (value) {
      window.localStorage.setItem(REDIRECT_FLAG_KEY, "1");
    } else {
      window.localStorage.removeItem(REDIRECT_FLAG_KEY);
    }
  } catch {
    // ignore
  }
}

const meta = {
  title: "Auth/AuthGate",
  component: AuthGate,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    children: <div className="p-6">Signed in content</div>,
  },
  decorators: [
    (Story) => (
      <div className="h-dvh w-full overflow-hidden">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AuthGate>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SignedOut: Story = {
  render: function SignedOutStory() {
    React.useEffect(() => {
      setRedirectFlag(false);
    }, []);

    return (
      <MockAuthProvider user={null} loading={false} error={null}>
        <AuthGate>
          <div className="p-6">Signed in content</div>
        </AuthGate>
      </MockAuthProvider>
    );
  },
};

export const Redirecting: Story = {
  render: () => {
    function WithRedirectFlag() {
      React.useEffect(() => {
        setRedirectFlag(true);
        return () => setRedirectFlag(false);
      }, []);

      return (
        <MockAuthProvider user={null} loading={false} error={null}>
          <AuthGate>
            <div className="p-6">Signed in content</div>
          </AuthGate>
        </MockAuthProvider>
      );
    }

    return <WithRedirectFlag />;
  },
};

export const Loading: Story = {
  render: function LoadingStory() {
    React.useEffect(() => {
      setRedirectFlag(false);
    }, []);

    return (
      <MockAuthProvider user={null} loading error={null}>
        <AuthGate>
          <div className="p-6">Signed in content</div>
        </AuthGate>
      </MockAuthProvider>
    );
  },
};
