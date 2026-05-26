import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function Page() {
  const t = useTranslations("landing");
  return (
    <>
      <main className="pt-16 overflow-hidden">
        <section className="relative min-h-[921px] flex flex-col items-center justify-center text-center px-6 py-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary-container/20 rounded-full blur-[120px] -z-10"></div>
          <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white leading-[0.95]">
              {t("hero.predict")} <br />
              {t("hero.compete")}{" "}
              <span className="bg-linear-to-r from-primary-container to-primary-fixed-dim bg-clip-text text-transparent">
                {t("hero.win")}
              </span>
            </h1>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto font-medium">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button className="w-full sm:w-auto px-8 py-6 font-extrabold text-lg rounded-xl">
                {t("hero.ctaPrimary")}
              </Button>
              <Button variant="secondary" className="w-full sm:w-auto px-8 py-6 font-bold text-lg rounded-xl border border-outline-variant/30 bg-surface-container-low text-white hover:bg-surface-container-high active:scale-95 transition-all">
                {t("hero.ctaSecondary")}
              </Button>
            </div>

            <div className="pt-12 flex flex-col items-center gap-4">
              <div className="flex -space-x-3">
                <img
                  className="w-12 h-12 rounded-full border-4 border-background object-cover"
                  data-alt="portrait of a young smiling man with a beard in a casual urban setting"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCsqt1sKn6bMnXDbOe05ECNuN30GgixR1DdF_qY2pjN-RcZjNQSNOJJjOQg35_0hRIywxiNGSbHhU0bR_gcPkHN15I6M4PkPwc8_J3e8C1mSMX5iZ_GAUAarz4VGGxzTcPZIXUUMx-7AQFbeFO6vKnixWCYmca0tclEzCzCV6KefC1LhnhJUQ3lQNSF5ewj4ZuQu7CBcKHGFOgAZfL7MrGzrkPxkHJmXd1EaKIaknf7EMH4nDt_6ZxBiKhEWJ0OtFyHUnXhd5__iQ"
                />
                <img
                  className="w-12 h-12 rounded-full border-4 border-background object-cover"
                  data-alt="close up headshot of professional man with glasses smiling softly with soft lighting"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBgc-afWhB-BIT1RPjreH0FwLyr7uwr74ZLcEKy-trrU924Fvdy6uw4So71ohZbWcshuuuCbo26UMUEPF8O6ONCI9WVXiLyAEw9Uuj5yfaZ3f-tKd-LOaBVo-HFlAx14z83XLVmnnq57V5yx8T0BPf_l9R6y1aRHEgSi7IhCwXECMAHNEgRm50R8e2dbiu4jobgb_lQ5axWehIzfzjvQdLOAJG-PB346DE3ZrIbsfYGX2ltBgJPJo5cGi-ihSsc2rETxF_QY5Qngw"
                />
                <img
                  className="w-12 h-12 rounded-full border-4 border-background object-cover"
                  data-alt="close up of a cheerful young woman with curly hair laughing outdoors in warm sunlight"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAj0i8d8dLKC7PHFZXg6vu_MLPUvp8F_kRm19zNklORK-eNUI3pa1X-7pHXPdvi20T1T6YFr3oCBgTeNejp4pVwMxPYmJC9GKZsjvxmWmAi5EXmfDrJzbRCteKEu2jUeoRs4NQ3htp_6QzRtL57QP9I1rr1L6_jCcLjH6JK5qK5bv2ree_oBgxWUfXXNJK9KuDQlyiNTXsukQjYS3-feWVSBQ1eFZM2B7MQuhT3M21B0hbIAXkYmahmR7mzJ3c3qMhTLSm-IslOxw"
                />
                <img
                  className="w-12 h-12 rounded-full border-4 border-background object-cover"
                  data-alt="portrait of a young man with a slight smile in front of a dark neutral background"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA6Lx3R6CEbcRk7n-OrnvWGIFIDPBFyqR8zp22zWaUh0HbE2zzK9VE8Cogf1oaEj4oSJg-jafaOw082fjDwFDViDXCgIzsxjNMEGFwSv7f3JqmujioPidZOlJ2ToO0L-ZrdR5sprZqeUCLierFwHuuLSsXQp7zZrnPCU1F-0rPoHyv_vrIrNVSnY4PylXTmbyZp04DArrHONg6_Ia4SMU0vGUzH5No0_NajjeJypElzx991fECW56p00Uam0AclM9z00NGvqXwnpg"
                />
                <div className="w-12 h-12 rounded-full border-4 border-background bg-secondary-container flex items-center justify-center text-xs font-bold text-white">
                  +2k
                </div>
              </div>
              <p className="text-sm font-medium text-on-surface-variant tracking-wide">
                {t.rich("hero.social", {
                  count: 12450,
                  hl: (chunks) => (
                    <span className="text-primary-container font-bold">
                      {chunks}
                    </span>
                  ),
                })}
              </p>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 w-full h-px bg-linear-to-r from-transparent via-primary-container/30 to-transparent"></div>
        </section>

        <section className="py-24 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group relative bg-surface-container-low rounded-[2rem] p-8 overflow-hidden transition-all duration-500 hover:bg-surface-container-high">
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-container/10 rounded-full blur-3xl group-hover:bg-secondary-container/20 transition-all"></div>
              <div className="mb-6 w-14 h-14 bg-surface-container-lowest rounded-2xl flex items-center justify-center text-primary-container shadow-inner">
                <span
                  className="material-symbols-outlined text-3xl"
                  data-icon="groups"
                >
                  groups
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                {t("features.groups.title")}
              </h3>
              <p className="text-on-surface-variant leading-relaxed">
                {t("features.groups.desc")}
              </p>
            </div>

            <div className="group relative bg-surface-container-low rounded-[2rem] p-8 overflow-hidden transition-all duration-500 hover:bg-surface-container-high">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/5 rounded-full blur-3xl group-hover:bg-primary-container/10 transition-all"></div>
              <div className="mb-6 w-14 h-14 bg-surface-container-lowest rounded-2xl flex items-center justify-center text-primary-container shadow-inner">
                <span
                  className="material-symbols-outlined text-3xl"
                  data-icon="public"
                >
                  public
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                {t("features.global.title")}
              </h3>
              <p className="text-on-surface-variant leading-relaxed">
                {t("features.global.desc")}
              </p>
            </div>

            <div className="group relative bg-surface-container-low rounded-[2rem] p-8 overflow-hidden transition-all duration-500 hover:bg-surface-container-high">
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-container/10 rounded-full blur-3xl group-hover:bg-secondary-container/20 transition-all"></div>
              <div className="mb-6 w-14 h-14 bg-surface-container-lowest rounded-2xl flex items-center justify-center text-primary-container shadow-inner">
                <span
                  className="material-symbols-outlined text-3xl"
                  data-icon="leaderboard"
                >
                  leaderboard
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                {t("features.ranking.title")}
              </h3>
              <p className="text-on-surface-variant leading-relaxed">
                {t("features.ranking.desc")}
              </p>
            </div>
          </div>
        </section>

        <section className="py-24 bg-surface-container-lowest relative">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center space-y-2">
              <div className="text-4xl md:text-5xl font-black text-white">
                500k+
              </div>
              <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                {t("stats.predictions")}
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-4xl md:text-5xl font-black text-primary-container">
                150+
              </div>
              <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                {t("stats.tournaments")}
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-4xl md:text-5xl font-black text-white">
                2.5m
              </div>
              <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                {t("stats.goals")}
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-4xl md:text-5xl font-black text-secondary">
                #1
              </div>
              <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                {t("stats.country")}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
