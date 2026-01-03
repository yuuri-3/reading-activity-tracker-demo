import { PrimaryButton } from "../components/PrimaryButton";
import { TagListItem } from "../components/TagListItem";
import { IconAdd } from "../components/icons/IconAdd";
import { IconBack } from "../components/icons/IconBack";

export function TagManagementPage() {
  return (
    <div className="w-full">
      <div className="max-w-2xl mx-auto">
        <header className="sticky top-0 z-30 flex flex-col gap-2 px-6 pt-8 pb-4 backdrop-blur-lg bg-[rgba(232,237,242,0.9)] supports-[backdrop-filter]:bg-[rgba(232,237,242,0.75)]">
          <a
            href="#sanctum"
            className="inline-flex items-center gap-0.5 text-[14px] font-normal leading-5 text-foreground"
          >
            <IconBack size={20} className="shrink-0" />
            <span className="pb-[2px]">戻る</span>
          </a>

          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-medium leading-[1.3] tracking-[0.08em]">
              タグ管理
            </h1>

            <PrimaryButton
              type="button"
              className="pl-3 pr-3.5 py-2 text-sm"
              icon={<IconAdd size={16} />}
            >
              タグを追加
            </PrimaryButton>
          </div>
        </header>

        <main className="px-6 pt-6 pb-40">
          <div className="flex flex-col gap-4">
            <TagListItem
              text="React"
              amount="1"
              description="ここにタグの補足説明"
            />
            <TagListItem text="Design" amount="3" showDescription={false} />
            <TagListItem text="Journal" amount="4" showDescription={false} />
            <TagListItem
              text="Dev"
              amount="2"
              description="ここにタグの補足説明"
            />
          </div>
        </main>
      </div>
    </div>
  );
}
