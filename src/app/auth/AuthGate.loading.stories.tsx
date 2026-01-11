import type { Meta, StoryObj } from "@storybook/react-vite";

import React from "react";

import { AuthGate } from "./AuthGate";
import { MockAuthProvider } from "./AuthContext";

function setAuthCallbackPath(value: boolean) {
  try {
    if (typeof window === "undefined") return;
    const base = (import.meta as any).env?.BASE_URL ?? "/";
    const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
    const target = value
      ? `${normalizedBase}/auth/callback`
      : `${normalizedBase}/`;
    window.history.replaceState(null, "", target);
  } catch {
    // ignore
  }
}

const meta = {
  title: "Loading/Auth/AuthGate",
  component: AuthGate,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    children: <div className="p-6">Signed in content</div>,
  },
  decorators: [
    (Story) => (
      <div className="h-dvh w-full overflow-y-auto">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AuthGate>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AuthLoading: Story = {
  render: function AuthLoadingStory(args) {
    React.useEffect(() => {
      setAuthCallbackPath(false);
    }, []);

    return (
      <MockAuthProvider user={null} loading error={null}>
        <AuthGate>{args.children}</AuthGate>
      </MockAuthProvider>
    );
  },
};

export const FallbackMigrationInProgress: Story = {
  render: function FallbackMigrationInProgressStory(args) {
    React.useEffect(() => {
      setAuthCallbackPath(false);
    }, []);

    return (
      <MockAuthProvider
        user={null}
        loading={false}
        error={null}
        fallbackMigrationInProgress
      >
        <AuthGate>{args.children}</AuthGate>
      </MockAuthProvider>
    );
  },
};

export const AuthCallbackWaiting: Story = {
  render: function AuthCallbackWaitingStory(args) {
    React.useEffect(() => {
      setAuthCallbackPath(true);
      return () => setAuthCallbackPath(false);
    }, []);

    return (
      <MockAuthProvider user={null} loading={false} error={null}>
        <AuthGate>{args.children}</AuthGate>
      </MockAuthProvider>
    );
  },
};
