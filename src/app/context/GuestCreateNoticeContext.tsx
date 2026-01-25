import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

type GuestCreateNoticeUser =
  | {
      uid?: string;
      isAnonymous?: boolean;
    }
  | null
  | undefined;

type GuestCreateNoticeContextType = {
  guestCreateNoticeOpen: boolean;
  closeGuestCreateNotice: () => void;
  dismissGuestCreateNotice: () => void;
  registerGuestCreation: () => void;
};

type GuestCreateNoticeProviderProps = {
  children: ReactNode;
  user?: GuestCreateNoticeUser;
};

type PersistedGuestCreateNoticeV1 = {
  v: 1;
  createdCount: number;
  dismissed: boolean;
};

const GuestCreateNoticeContext = createContext<
  GuestCreateNoticeContextType | undefined
>(undefined);

const GUEST_CREATE_NOTICE_STORAGE_VERSION = 1 as const;

function getGuestCreateNoticeStorageKey(uid: string | undefined) {
  return `yomzoy:guestCreateNotice:v${GUEST_CREATE_NOTICE_STORAGE_VERSION}:${
    uid ?? "anon"
  }`;
}

function loadPersistedGuestCreateNotice(
  storageKey: string,
): PersistedGuestCreateNoticeV1 {
  if (typeof window === "undefined") {
    return {
      v: GUEST_CREATE_NOTICE_STORAGE_VERSION,
      createdCount: 0,
      dismissed: false,
    };
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw)
      return {
        v: GUEST_CREATE_NOTICE_STORAGE_VERSION,
        createdCount: 0,
        dismissed: false,
      };
    const parsed = JSON.parse(raw) as Partial<PersistedGuestCreateNoticeV1>;
    if (parsed.v !== GUEST_CREATE_NOTICE_STORAGE_VERSION)
      return {
        v: GUEST_CREATE_NOTICE_STORAGE_VERSION,
        createdCount: 0,
        dismissed: false,
      };

    const createdCount =
      typeof parsed.createdCount === "number" &&
      Number.isFinite(parsed.createdCount)
        ? Math.max(0, Math.floor(parsed.createdCount))
        : 0;
    const dismissed =
      typeof parsed.dismissed === "boolean" ? parsed.dismissed : false;

    return { v: GUEST_CREATE_NOTICE_STORAGE_VERSION, createdCount, dismissed };
  } catch {
    return {
      v: GUEST_CREATE_NOTICE_STORAGE_VERSION,
      createdCount: 0,
      dismissed: false,
    };
  }
}

function savePersistedGuestCreateNotice(
  storageKey: string,
  state: PersistedGuestCreateNoticeV1,
) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // ignore (e.g. storage full / disabled)
  }
}

function shouldShowGuestCreateNotice(createdCount: number) {
  if (createdCount === 3) return true;
  if (createdCount > 3 && (createdCount - 3) % 5 === 0) return true;
  return false;
}

export function GuestCreateNoticeProvider({
  children,
  user,
}: GuestCreateNoticeProviderProps) {
  const [guestCreateNoticeOpen, setGuestCreateNoticeOpen] = useState(false);

  const guestCreateNoticeStorageKey = useMemo(
    () => getGuestCreateNoticeStorageKey(user?.uid),
    [user?.uid],
  );

  useEffect(() => {
    if (!user?.isAnonymous) {
      setGuestCreateNoticeOpen(false);
    }
  }, [user?.isAnonymous]);

  useEffect(() => {
    setGuestCreateNoticeOpen(false);
  }, [guestCreateNoticeStorageKey]);

  const closeGuestCreateNotice = useCallback(() => {
    setGuestCreateNoticeOpen(false);
  }, []);

  const dismissGuestCreateNotice = useCallback(() => {
    setGuestCreateNoticeOpen(false);
    if (!user?.isAnonymous) return;
    const current = loadPersistedGuestCreateNotice(guestCreateNoticeStorageKey);
    if (current.dismissed) return;
    savePersistedGuestCreateNotice(guestCreateNoticeStorageKey, {
      ...current,
      dismissed: true,
    });
  }, [guestCreateNoticeStorageKey, user?.isAnonymous]);

  const registerGuestCreation = useCallback(() => {
    if (!user?.isAnonymous) return;

    const current = loadPersistedGuestCreateNotice(guestCreateNoticeStorageKey);
    if (current.dismissed) return;

    const next: PersistedGuestCreateNoticeV1 = {
      v: GUEST_CREATE_NOTICE_STORAGE_VERSION,
      createdCount: current.createdCount + 1,
      dismissed: false,
    };
    savePersistedGuestCreateNotice(guestCreateNoticeStorageKey, next);
    if (shouldShowGuestCreateNotice(next.createdCount)) {
      setGuestCreateNoticeOpen(true);
    }
  }, [guestCreateNoticeStorageKey, user?.isAnonymous]);

  const value = useMemo<GuestCreateNoticeContextType>(() => {
    return {
      guestCreateNoticeOpen,
      closeGuestCreateNotice,
      dismissGuestCreateNotice,
      registerGuestCreation,
    };
  }, [
    closeGuestCreateNotice,
    dismissGuestCreateNotice,
    guestCreateNoticeOpen,
    registerGuestCreation,
  ]);

  return (
    <GuestCreateNoticeContext.Provider value={value}>
      {children}
    </GuestCreateNoticeContext.Provider>
  );
}

export function useGuestCreateNotice() {
  const context = useContext(GuestCreateNoticeContext);
  if (!context) {
    throw new Error(
      "useGuestCreateNotice must be used within GuestCreateNoticeProvider",
    );
  }
  return context;
}
