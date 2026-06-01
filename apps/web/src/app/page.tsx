import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Users, Globe, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { diceBearAvatar } from "@/lib/avatar";

export default function Page() {
  const t = useTranslations("landing");
  return (
    <>
      <main className="pt-16 overflow-hidden">
        <section className="relative min-h-svh flex flex-col items-center justify-center text-center px-6 py-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-neon/10 rounded-full blur-[120px] -z-10"></div>
          <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-foreground leading-[0.95]">
              {t("hero.predict")} <br />
              {t("hero.compete")}{" "}
              <span className="bg-linear-to-r from-neon to-accent-gold bg-clip-text text-transparent">
                {t("hero.win")}
              </span>
            </h1>
            <p className="text-lg md:text-xl text-ink-muted max-w-2xl mx-auto font-medium">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button render={<Link href="/auth" />} className="w-full sm:w-auto px-8 py-6 font-extrabold text-lg rounded-xl">
                {t("hero.ctaPrimary")}
              </Button>
              <Button variant="secondary" render={<Link href="/auth" />} className="w-full sm:w-auto px-8 py-6 font-bold text-lg rounded-xl">
                {t("hero.ctaSecondary")}
              </Button>
            </div>

            <div className="pt-12 flex flex-col items-center gap-4">
              <div className="flex -space-x-3">
                <Image
                  className="w-12 h-12 rounded-full border-4 border-background object-cover"
                  src={diceBearAvatar('fan-1')}
                  alt=""
                  width={48}
                  height={48}
                  unoptimized
                />
                <Image
                  className="w-12 h-12 rounded-full border-4 border-background object-cover"
                  src={diceBearAvatar('fan-2')}
                  alt=""
                  width={48}
                  height={48}
                  unoptimized
                />
                <Image
                  className="w-12 h-12 rounded-full border-4 border-background object-cover"
                  src={diceBearAvatar('fan-3')}
                  alt=""
                  width={48}
                  height={48}
                  unoptimized
                />
                <Image
                  className="w-12 h-12 rounded-full border-4 border-background object-cover"
                  src={diceBearAvatar('fan-4')}
                  alt=""
                  width={48}
                  height={48}
                  unoptimized
                />
                <div className="w-12 h-12 rounded-full border-4 border-background bg-surface-2 flex items-center justify-center text-xs font-bold text-foreground">
                  +2k
                </div>
              </div>
              <p className="text-sm font-medium text-ink-muted tracking-wide">
                {t.rich("hero.social", {
                  count: 12450,
                  hl: (chunks) => (
                    <span className="text-neon font-bold">
                      {chunks}
                    </span>
                  ),
                })}
              </p>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 w-full h-px bg-linear-to-r from-transparent via-line to-transparent"></div>
        </section>

        <section className="py-24 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group relative bg-surface-1 rounded-4xl p-8 overflow-hidden transition-all duration-500 hover:bg-surface-2">
              <div className="absolute top-0 right-0 w-32 h-32 bg-neon/10 rounded-full blur-3xl group-hover:bg-neon/20 transition-all"></div>
              <div className="mb-6 w-14 h-14 bg-surface-2 rounded-2xl flex items-center justify-center text-neon shadow-inner">
                <Users className="size-7" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">
                {t("features.groups.title")}
              </h3>
              <p className="text-ink-muted leading-relaxed">
                {t("features.groups.desc")}
              </p>
            </div>

            <div className="group relative bg-surface-1 rounded-4xl p-8 overflow-hidden transition-all duration-500 hover:bg-surface-2">
              <div className="absolute top-0 right-0 w-32 h-32 bg-neon/10 rounded-full blur-3xl group-hover:bg-neon/20 transition-all"></div>
              <div className="mb-6 w-14 h-14 bg-surface-2 rounded-2xl flex items-center justify-center text-neon shadow-inner">
                <Globe className="size-7" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">
                {t("features.global.title")}
              </h3>
              <p className="text-ink-muted leading-relaxed">
                {t("features.global.desc")}
              </p>
            </div>

            <div className="group relative bg-surface-1 rounded-4xl p-8 overflow-hidden transition-all duration-500 hover:bg-surface-2">
              <div className="absolute top-0 right-0 w-32 h-32 bg-neon/10 rounded-full blur-3xl group-hover:bg-neon/20 transition-all"></div>
              <div className="mb-6 w-14 h-14 bg-surface-2 rounded-2xl flex items-center justify-center text-neon shadow-inner">
                <Trophy className="size-7" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">
                {t("features.ranking.title")}
              </h3>
              <p className="text-ink-muted leading-relaxed">
                {t("features.ranking.desc")}
              </p>
            </div>
          </div>
        </section>

      </main>
    </>
  );
}
