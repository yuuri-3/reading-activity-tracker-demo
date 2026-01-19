import { Header } from "../components/Header";
import { IconBack } from "../components/icons/IconBack";
import { navigate } from "../utils/navigation";

export function PrivacyPolicyPage() {
  return (
    <div className="w-full">
      <div className="max-w-2xl mx-auto">
        <Header
          variant="simple"
          pageTitle="プライバシーポリシー"
          icon={null}
          action={
            <button
              type="button"
              className="inline-flex items-center gap-0.5 text-[14px] font-normal leading-5 text-foreground"
              onClick={() => navigate("/sanctum")}
            >
              <IconBack size={20} className="shrink-0" />
              <span className="pb-[2px]">戻る</span>
            </button>
          }
        />

        <div className="px-6 pt-5 pb-28">
          <div className="rounded-[12px] bg-[var(--background-solid)] p-4 [box-shadow:var(--shadow-neumorphism-sm)]">
            <p className="text-sm leading-6 text-foreground">
              このページはプライバシーポリシーを表示します。
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              本文は別途確定後に反映します。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
