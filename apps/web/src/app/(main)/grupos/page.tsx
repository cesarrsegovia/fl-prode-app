
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Page() {
  return (
    <>
      


<main className="pt-24 pb-12 px-6 max-w-7xl mx-auto">

<header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
<div>
<h1 className="text-4xl md:text-5xl font-extrabold font-headline text-white tracking-tight mb-2">Mis grupos</h1>
<p className="text-on-surface-variant font-medium">Gestiona tus ligas y compite con amigos</p>
</div>
<div className="flex items-center gap-4">
<button className="flex items-center gap-2 border border-secondary-container text-secondary px-6 py-3 rounded-xl font-bold hover:bg-secondary-container/10 transition-all active:scale-95">
<span className="material-symbols-outlined" style={{fontVariationSettings: "'wght' 600"}}>add_link</span>
<span>Unirme con código</span>
</button>
<button className="bg-primary-gradient px-6 py-3 rounded-xl font-bold shadow-lg shadow-[#b5f23d]/10 active:scale-95 transition-all">
                    Crear grupo
                </button>
</div>
</header>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

<div className="bg-surface-container-low rounded-3xl p-6 border border-white/5 hover:bg-surface-container-high transition-all group">
<div className="flex justify-between items-start mb-6">
<div className="flex items-center gap-4">
<div className="w-14 h-14 rounded-2xl bg-secondary-container/20 flex items-center justify-center text-[#b5f23d]">
<span className="material-symbols-outlined text-3xl">sports_soccer</span>
</div>
<div>
<h3 className="text-xl font-bold font-headline text-white">La Scaloneta</h3>
<div className="flex -space-x-2 mt-1">
<img alt="Miembro" className="w-6 h-6 rounded-full border-2 border-surface-container-low" data-alt="close-up portrait of a diverse person smiling, professional studio lighting with soft bokeh background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDSVR68bzmt4PAGnlXQ_PQmllp-K_aKzIS4x5vDOmLV1sTC7dVoX4Yylx7H-pNCMOFcRngJfFEpl6ueTeN_UdbK2Cil7E9kM9EvBPpYAMl92pslcQtVvfBjBz_y1CKwt6FxihL31OdRbPgzWZsA-YoLBGst1b84WRFcmiAC6bu1EHPlTVWKQU2c-cb1upNL_mdu6aRe25AFeQHVDv-3gVddVtYWXqn-ff2k_teWCXwnGDipJbUMcqJL7ICx-FUq9OOIaXqiQ6vc3g"/>
<img alt="Miembro" className="w-6 h-6 rounded-full border-2 border-surface-container-low" data-alt="vibrant portrait of a young person with colorful lighting and modern athletic aesthetic" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDKxl3Edaolzn52--IiPIIl4JlKxnY4adBtcLj8_s05hf-aNUozT4zB63cLDu_iVgaJaC1prTrGOcDpiX_fCVTFIBJb0FeA86bBy19Prz3mYYKHPh7cSAfgxEdYOwz4Jq5VLcUu25dGogL6_d70EXxt17G-cJpUvAFsAnM_KU7cVg1NwGyPJ8iJVOaLv07s9GvWAktdV0yMaPsaut27L6WveijUEjxZp60YWfKv9mL-W1zhO68D46M9ty3GgW_yJVsJuJmnmzO6og"/>
<img alt="Miembro" className="w-6 h-6 rounded-full border-2 border-surface-container-low" data-alt="cinematic close-up of a stylish individual with soft natural light and neutral background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8GRs_rvrJsln_RR0dqc_bWkjbSJaRPXSjF8iQGZOGggadbw4RxepxSYnRvVAx1_6uRq8QgwD_3v80zRWpzVa3afJWi9xxqdlD0cD4byb5Sl31dDENAMB6Hs01WmOsgDyVrnmNgNabYLl4wU3W4YJzByvwPefNgMi3E-TIng4KYoAMVBUMVhF4MfL-upZaRBi4uTq6_58B6zh6h5njaHb1nZsQM8lTvYNP5ix6d7pygKjJUhzm__6r5B7E2ZwIqDHNjvo6X8kTbA"/>
<div className="w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center text-[10px] font-bold border-2 border-surface-container-low">+12</div>
</div>
</div>
</div>
<div className="bg-surface-bright rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
<span className="text-[#FFD700] font-black font-headline text-lg italic">#1</span>
</div>
</div>
<div className="space-y-4">
<div className="bg-surface-container-lowest rounded-2xl p-4 flex justify-between items-center">
<span className="text-on-surface-variant text-sm font-medium">Puntos de temporada</span>
<span className="text-[#b5f23d] font-black font-headline text-xl">1,240 pts</span>
</div>
<div className="flex items-center gap-2 bg-primary-container/10 text-primary-fixed py-2 px-4 rounded-full w-fit">
<span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>warning</span>
<span className="text-xs font-bold uppercase tracking-wider">2 pronósticos pendientes</span>
</div>
</div>
<button className="w-full mt-6 bg-surface-container-highest text-white py-3 rounded-xl font-bold hover:bg-secondary-container transition-all flex items-center justify-center gap-2 group-hover:bg-[#b5f23d] group-hover:text-on-primary">
                    Ver grupo
                    <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
</button>
</div>

<div className="bg-surface-container-low rounded-3xl p-6 border border-white/5 hover:bg-surface-container-high transition-all group">
<div className="flex justify-between items-start mb-6">
<div className="flex items-center gap-4">
<div className="w-14 h-14 rounded-2xl bg-secondary-container/20 flex items-center justify-center text-[#b5f23d]">
<span className="material-symbols-outlined text-3xl">groups</span>
</div>
<div>
<h3 className="text-xl font-bold font-headline text-white">Oficina Central</h3>
<div className="flex -space-x-2 mt-1">
<img alt="Miembro" className="w-6 h-6 rounded-full border-2 border-surface-container-low" data-alt="professional portrait of a confident man with subtle rim lighting on a dark background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCt9TDGvLZ1U34GfMlMyrovyNsrjxO1udRbEr9SjrLYt2mreMHaMmmgWRA78oZJUFOlRzcR9wewmCxJ_X65X9qOLe-cRN834teW0LY1vhn8X0zqDlNMDCPeYrP-1cOnmNlCofOVKmQ6c9hm1jhxjbHf2vw1ujmkBUzuVBVu1vRJAdRSSQ2wduaiyS5v3Q8RDcfKcxKl8nNE6y17PM4aqHjMx_RuwNVB71qU3AwQpJn05ejeVYUPm2JcpHiJU0CUteiPQ0782nTI3Q"/>
<img alt="Miembro" className="w-6 h-6 rounded-full border-2 border-surface-container-low" data-alt="artistic profile shot of a woman with dramatic shadows and vibrant accent lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuB6m5JKcu8Z2OUQ171PTv4RszkHQuNZYD2auZmj08S56xfVqhiIUnEe1Sf5le5C1yx9jjaH2FEMpEuqBw8q95out3mh4-OJEdAU-m_ijxnYKW6KkR-k3S0aDkBANAzQjBwwwEQiBpmWKbpUOL3MHCZ5AJCvGprVv-6PXaW-Yiz3xw1sv7GWHgaEb4iToyATPp0TYnIq3gYFKHxi0deQwKHaXtik_-2lEj4zivHtIXTUtdwDhHo7ZSdMO6hbBYW8v046tGTwgOqQ"/>
<div className="w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center text-[10px] font-bold border-2 border-surface-container-low">+45</div>
</div>
</div>
</div>
<div className="bg-surface-bright rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
<span className="text-[#C0C0C0] font-black font-headline text-lg italic">#2</span>
</div>
</div>
<div className="space-y-4">
<div className="bg-surface-container-lowest rounded-2xl p-4 flex justify-between items-center">
<span className="text-on-surface-variant text-sm font-medium">Puntos de temporada</span>
<span className="text-[#b5f23d] font-black font-headline text-xl">1,085 pts</span>
</div>
<div className="flex items-center gap-2 bg-surface-container-highest text-on-surface-variant py-2 px-4 rounded-full w-fit">
<span className="material-symbols-outlined text-sm">check_circle</span>
<span className="text-xs font-bold uppercase tracking-wider">Al día</span>
</div>
</div>
<button className="w-full mt-6 bg-surface-container-highest text-white py-3 rounded-xl font-bold hover:bg-secondary-container transition-all flex items-center justify-center gap-2 group-hover:bg-[#b5f23d] group-hover:text-on-primary">
                    Ver grupo
                    <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
</button>
</div>

<div className="bg-surface-container-low rounded-3xl p-6 border border-white/5 hover:bg-surface-container-high transition-all group">
<div className="flex justify-between items-start mb-6">
<div className="flex items-center gap-4">
<div className="w-14 h-14 rounded-2xl bg-secondary-container/20 flex items-center justify-center text-[#b5f23d]">
<span className="material-symbols-outlined text-3xl">workspace_premium</span>
</div>
<div>
<h3 className="text-xl font-bold font-headline text-white">Amigos del Fútbol</h3>
<div className="flex -space-x-2 mt-1">
<img alt="Miembro" className="w-6 h-6 rounded-full border-2 border-surface-container-low" data-alt="close-up of a smiling young person with warm natural lighting and soft blurred foliage background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfVSBzsvJj1MV_BVFkf1go2IwOeBGr-jZM8ZUOTe3Vyh7HGbwKkL26CmricOgoPYUZSlHOam2rtW-ufkE_my--4TvUVU2TYvDyBjl3l-W7k8GHaWzS34ZCJuSm1qzVhcqq-oeH2eOOcNIAFcTixuSk05bURNQ8_YHqzOR_ZaTSGKB_PND1NKmnka7YwWmeeTtLihg7hhM8Ol1FPRyFqYuO44iEo6oLEnz-U0Pj6xZxtXbcGNRdkgF4rhJOJgxqSwmFZ6bEX6QQ3g"/>
<img alt="Miembro" className="w-6 h-6 rounded-full border-2 border-surface-container-low" data-alt="vibrant studio portrait of a woman with high-contrast neon lighting effects" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCchgeZKNq3cb93qlWa7ZLerBJPQllg4eGdJ9pEa0NkaDvK91JPDhRjz2bWj33NHfYh3ww9WX2j_amaWfw-BNp_035KtpiSQ9Ix6016BwJYJ7aXSaF6lw6P4QrzE9tNAYktGEiqerFSy_5DQH0QV501yXqbt7rKRXSAs_-ZxQ0-qutHXzKTi34LZqcrM-UFxe5llgWJd87fQBbTVdYVCuDeyhM2H1nNrfJYan8zM3spOqyRKohqlaVZ8iGlXUgWak0SRXcNUNdSMw"/>
<img alt="Miembro" className="w-6 h-6 rounded-full border-2 border-surface-container-low" data-alt="minimalist portrait of a man in soft focus with elegant monochromatic tones" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYUlcZWqHNfzizExhwtdlnjNMuBlp7lzfdeQbV6lKOkqmapTdVSOxdUfthl8rr9-oOunKsMrutxa8Q8nS5luTs3C-JrUefToVuO3bN--g34Yor-KvPlu7tcEK-G9K_y52kToP_4JOAti5bHmirOtIsOmC-aoXDVOZjWv0FILmSDIFW_bmBVR31Px00vV1PCNHvc-i4l4wKI_XFGszlqySYEGj4U6_2txrp4WRafQ24ZTStATCGMcNIJFFH65GXEe6fo7rW0uPhwg"/>
<div className="w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center text-[10px] font-bold border-2 border-surface-container-low">+8</div>
</div>
</div>
</div>
<div className="bg-surface-bright rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
<span className="text-[#CD7F32] font-black font-headline text-lg italic">#3</span>
</div>
</div>
<div className="space-y-4">
<div className="bg-surface-container-lowest rounded-2xl p-4 flex justify-between items-center">
<span className="text-on-surface-variant text-sm font-medium">Puntos de temporada</span>
<span className="text-[#b5f23d] font-black font-headline text-xl">942 pts</span>
</div>
<div className="flex items-center gap-2 bg-primary-container/10 text-primary-fixed py-2 px-4 rounded-full w-fit">
<span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>warning</span>
<span className="text-xs font-bold uppercase tracking-wider">5 pronósticos pendientes</span>
</div>
</div>
<button className="w-full mt-6 bg-surface-container-highest text-white py-3 rounded-xl font-bold hover:bg-secondary-container transition-all flex items-center justify-center gap-2 group-hover:bg-[#b5f23d] group-hover:text-on-primary">
                    Ver grupo
                    <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
</button>
</div>
</div>

<section className="mt-20">
<div className="flex items-center justify-between mb-8">
<h2 className="text-2xl font-bold font-headline text-white">Ranking Global de Ligas</h2>
<button className="text-[#b5f23d] text-sm font-bold uppercase tracking-widest hover:underline">Ver todo</button>
</div>
<div className="bg-surface-container-low rounded-3xl overflow-hidden border border-white/5">
<div className="grid grid-cols-12 p-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant border-b border-white/5">
<div className="col-span-1">Pos</div>
<div className="col-span-6 md:col-span-8">Grupo</div>
<div className="col-span-3 md:col-span-2 text-right">Promedio Puntos</div>
<div className="col-span-2 md:col-span-1"></div>
</div>

<div className="grid grid-cols-12 p-6 items-center hover:bg-surface-container-high transition-colors">
<div className="col-span-1 font-headline font-black text-xl italic text-primary-fixed">#1</div>
<div className="col-span-6 md:col-span-8 flex items-center gap-4">
<div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center text-white">
<span className="material-symbols-outlined">star</span>
</div>
<span className="font-bold text-white">Champions Elite League</span>
</div>
<div className="col-span-3 md:col-span-2 text-right font-headline font-bold">156.4 pts</div>
<div className="col-span-2 md:col-span-1 text-right">
<span className="material-symbols-outlined text-on-surface-variant">trending_up</span>
</div>
</div>

<div className="grid grid-cols-12 p-6 items-center bg-surface-container-low/50 hover:bg-surface-container-high transition-colors">
<div className="col-span-1 font-headline font-black text-xl italic text-on-surface-variant">#2</div>
<div className="col-span-6 md:col-span-8 flex items-center gap-4">
<div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-white">
<span className="material-symbols-outlined">public</span>
</div>
<span className="font-bold text-white">Mundialistas 2026</span>
</div>
<div className="col-span-3 md:col-span-2 text-right font-headline font-bold">142.1 pts</div>
<div className="col-span-2 md:col-span-1 text-right">
<span className="material-symbols-outlined text-on-surface-variant">remove</span>
</div>
</div>
</div>
</section>
</main>



    </>
  );
}
