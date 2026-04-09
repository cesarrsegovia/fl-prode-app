
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Page() {
  return (
    <>
      


<main className="pt-24 pb-32 px-4 max-w-3xl mx-auto">

<header className="mb-8">
<div className="flex items-center justify-between mb-4">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center border border-outline-variant/15">
<img className="w-7 h-7 object-contain" data-alt="professional football league emblem with modern geometric shapes and high contrast metallic finish" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDAVdS3oCvcfPNsJaatfvikGMrsFP0S8dhf2WkLZMnNFnFxDy1frnn4U28UP2_Vq7udrmbtMdoEYLNlb7qpJwik_gudsR1rudQ0e9K-e6Y6QRsgK4mQnYoER3Ab4c247o-x62H60sUp0HkHQ7wT4SfqICGaNUEAOIwnHsY6C_jg2p5ma43kpHlgOqNq3vwGx5XpNnGagojfU5CgLZpF69Q0eKyYZIia0567dbCpXEF3iCUKjtkBkwgC8W1aax9ZVjOHctm0H7rkkA"/>
</div>
<div>
<h1 className="text-3xl font-headline font-extrabold tracking-tight text-white leading-none">Fecha 12</h1>
<p className="text-sm text-on-surface-variant font-medium mt-1">Liga Profesional 2024</p>
</div>
</div>
<div className="text-right">
<span className="text-xs font-label uppercase tracking-widest text-on-surface-variant block mb-1">Cierra en</span>
<div className="flex gap-2 text-primary font-headline font-bold text-xl">
<span>02d</span>
<span>:</span>
<span>14h</span>
<span>:</span>
<span>35m</span>
</div>
</div>
</div>

<div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/10">
<div className="flex justify-between items-end mb-2">
<span className="text-sm font-semibold text-white">Tu progreso</span>
<span className="text-sm font-bold text-primary">6 de 10 partidos pronosticados</span>
</div>
<div className="w-full bg-surface-container-highest rounded-full h-2">
<div className="bg-primary-gradient h-full rounded-full shadow-[0_0_12px_rgba(181,242,61,0.4)]" style={{}}></div>
</div>
</div>
</header>

<div className="sticky top-20 z-40 mb-8">
<div className="bg-secondary-container/90 backdrop-blur-md p-4 rounded-xl flex items-center justify-between shadow-2xl">
<div className="flex items-center gap-3">
<span className="material-symbols-outlined text-primary-fixed" data-icon="stars" style={{fontVariationSettings: "'FILL' 1"}}>stars</span>
<div>
<p className="text-xs font-label uppercase tracking-tighter text-secondary-fixed/70">Capitán de la Fecha</p>
<p className="text-sm font-bold text-white">Suma x2 puntos en este partido</p>
</div>
</div>
<select className="bg-surface-container-highest text-white text-sm rounded-lg border-none focus:ring-2 focus:ring-primary py-2 pl-4 pr-10 appearance-none font-medium">
<option>River Plate vs Boca Jrs</option>
<option>Racing vs Independiente</option>
<option>San Lorenzo vs Huracán</option>
</select>
</div>
</div>

<div className="space-y-4">

<div className="bg-surface-container-low rounded-xl overflow-hidden border-l-4 border-primary group transition-all hover:bg-surface-container-high">
<div className="p-5">
<div className="flex justify-between items-center mb-4">
<span className="text-xs font-bold text-on-surface-variant font-label">Sábado 15:30</span>
<span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary-container/10 text-primary-container flex items-center gap-1.5">
<span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                            Abierto
                        </span>
</div>
<div className="flex items-center justify-between gap-4">

<div className="flex flex-col items-center gap-2 flex-1">
<img className="w-12 h-12" data-alt="heraldic football club shield with diagonal red stripe and white background, sharp vector style" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCh3dtabKnzqeqQXsqApqnKmPoleFskFZAWtMF2kE65ULDPPgU_I8ZbiDGTNZUpjlZCQW53A1LERVEm5VkLhjOf-aB_gHVDyorKaEQ3hCH6vA6U2QNsmUo_kimAbsQqUbyDN5aGokAcZt0ADp8HeZglOH4IksqIiU9-jAIQNt3_cVqDEKUonJQosLAAPE_Bwa_2ymu4GfvaTbZuHtbjtQQSraIiErBP1KVFeqTGL5B4xEhDsgnrz5kHKp5FO2gdXZYn7Su3Opol6w"/>
<span className="text-xs font-bold text-center uppercase tracking-tight text-white">River Plate</span>
</div>

<div className="flex items-center gap-2">
<button className="w-12 h-12 rounded-lg bg-surface-container-highest text-white font-black text-lg hover:bg-surface-bright transition-all active:scale-90">1</button>
<button className="w-12 h-12 rounded-lg bg-primary-gradient text-on-primary font-black text-lg shadow-[0_0_20px_rgba(181,242,61,0.2)] active:scale-90">X</button>
<button className="w-12 h-12 rounded-lg bg-surface-container-highest text-white font-black text-lg hover:bg-surface-bright transition-all active:scale-90">2</button>
</div>

<div className="flex flex-col items-center gap-2 flex-1">
<img className="w-12 h-12" data-alt="oval football club shield with blue and yellow horizontal stripes, professional sport insignia" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAyFprUGQzk5YvBLLs3S29rN-dR0YGfd1Ey3vQ9j6S-p8EapuM4y5ahZ2azezbouB-ERMBjWRGQPu6KucaYxS7A9XCmf0KaSVQeWmZpVIyC5c5Y1IJ_a37ZYMQKnRv3K-SLBq1ERwg2KpYRCLjWmtdzm9N7ab2mmVL-9y7gCExRge_qWfjKrQmoIJXtTABZPZo1Y27l0d4dGjtorrL5_FTErtfdsassh0Vl_Dl_6S2JSTCEnWju8y5KDbqkTnMEuts2T88xI4cDRg"/>
<span className="text-xs font-bold text-center uppercase tracking-tight text-white">Boca Jrs</span>
</div>
</div>

<div className="mt-6 pt-4 border-t border-outline-variant/10 flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary-fixed text-sm" data-icon="add_circle">add_circle</span>
<span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Bonus marcador (+3 pts)</span>
</div>
<div className="flex items-center gap-3">
<input className="w-10 h-8 bg-surface-container-lowest border-none rounded text-center text-sm font-bold focus:ring-1 focus:ring-primary p-0" placeholder="0" type="number"/>
<span className="text-on-surface-variant font-bold">-</span>
<input className="w-10 h-8 bg-surface-container-lowest border-none rounded text-center text-sm font-bold focus:ring-1 focus:ring-primary p-0" placeholder="0" type="number"/>
</div>
</div>
</div>
</div>

<div className="bg-surface-container-low rounded-xl overflow-hidden border-l-4 border-transparent group transition-all">
<div className="p-5">
<div className="flex justify-between items-center mb-4">
<span className="text-xs font-bold text-on-surface-variant font-label">En vivo - 22' ST</span>
<span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-yellow-500/10 text-yellow-500 flex items-center gap-1.5 animate-pulse">
<span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                            En juego
                        </span>
</div>
<div className="flex items-center justify-between gap-4 opacity-60">
<div className="flex flex-col items-center gap-2 flex-1">
<img className="w-12 h-12" data-alt="shield logo with light blue and white vertical stripes, traditional football club aesthetics" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBUjYYeG_z7-3EFC37xViNtJ6oOmHXKuBSGx6uo8DUlRphPtPn6JXeaFvaSqK0zBekW27JqDlgl0vCw8MT0CK_k60DAMwRR9HIn9Pf3J2EQGwcySLSIpg1ufmKXL4i7yvDGCrtVLb0Wj45Gkv__iEMHxNdfSLe3m1BmZ_-BLc7CrPHKAyn9CkOeW1LdQo_yQh175v1BMoojERMRvdJ01HWEU8H-k93o2ma-N30oHom46MkVrlP0uVpTP-K6hQlZOiRzZz_G8P7UJg"/>
<span className="text-xs font-bold text-center uppercase tracking-tight text-white">Racing</span>
</div>
<div className="flex items-center gap-2">
<button className="w-12 h-12 rounded-lg bg-surface-container-highest text-gray-500 font-black text-lg cursor-not-allowed" disabled>1</button>
<button className="w-12 h-12 rounded-lg bg-surface-container-highest text-gray-500 font-black text-lg cursor-not-allowed" disabled>X</button>
<button className="w-12 h-12 rounded-lg bg-surface-container-highest text-gray-500 font-black text-lg cursor-not-allowed" disabled>2</button>
</div>
<div className="flex flex-col items-center gap-2 flex-1">
<img className="w-12 h-12" data-alt="circular red football club logo with white letter details, classic sport branding" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBWUhUDrKCnGW5I1BV1t_XBRtsWNOg2n3q4DgFFrUpdnkD6m_HnwdMjgzKvcPrfrVj6GHFhTGvdLumaCZ0mlinQfqnFgRyA9uHw51Yve8-jk36q3j2orYuX5jzV6d2c5LZn_dB3JXsMMC8QJJ6EiqJe5tPv0KBV8qfQW61jz8eiWQEL_reNnxudaDqPJFF47Tw-_h0Vi7QD6susn1Qao23j7XHYrXC6-R_b2E2qDE87Lm-r1Dpabl-0AWgzF82E0_fX2tMZb53JZA"/>
<span className="text-xs font-bold text-center uppercase tracking-tight text-white">Independiente</span>
</div>
</div>
</div>
</div>

<div className="bg-surface-container-low rounded-xl overflow-hidden border-l-4 border-transparent group transition-all hover:bg-surface-container-high">
<div className="p-5">
<div className="flex justify-between items-center mb-4">
<span className="text-xs font-bold text-on-surface-variant font-label">Domingo 19:00</span>
<span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary-container/10 text-primary-container flex items-center gap-1.5">
<span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                            Abierto
                        </span>
</div>
<div className="flex items-center justify-between gap-4">
<div className="flex flex-col items-center gap-2 flex-1">
<img className="w-12 h-12" data-alt="shield shaped logo with red and blue vertical bars, gold details, athletic club identity" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQHuiZnL5hE6tVlfs7R4ydD7a6ZWXDhM_vlby0-ZYYgWQivAazD4opllWtIoi9fqlBOhdS-K8mH9t6XEFV2Wv4t5nEnfj5R_zqK3ZjEME4CFagIgzVwvmYyH4cekoPD8CYSAJdN_OHesLfwDHVmwhjM6WXouL1RD13s2mqX79AYknnAzJmMZBdk2vDXbiyPbH6wlPo_bjsQwvT41vfSAN_ZMTDeWUVbjmwYvB6rLsE_66CBNieih4rv8yd1986QZfCIZjLc-1q5g"/>
<span className="text-xs font-bold text-center uppercase tracking-tight text-white">San Lorenzo</span>
</div>
<div className="flex items-center gap-2">
<button className="w-12 h-12 rounded-lg bg-surface-container-highest text-white font-black text-lg hover:bg-surface-bright transition-all active:scale-90">1</button>
<button className="w-12 h-12 rounded-lg bg-surface-container-highest text-white font-black text-lg hover:bg-surface-bright transition-all active:scale-90">X</button>
<button className="w-12 h-12 rounded-lg bg-surface-container-highest text-white font-black text-lg hover:bg-surface-bright transition-all active:scale-90">2</button>
</div>
<div className="flex flex-col items-center gap-2 flex-1">
<img className="w-12 h-12" data-alt="football club logo featuring a red hot air balloon on a white background, unique sport team emblem" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqao1JtMgU9osWHawMOem-8GYZQIZynhGPwBdmGGEZtDSCKm-vIj-Edsd-SibsZ1HZnIt5SS5SiXBux9FFVAeHv1AaBgvLMqSDIsukfrXXIFaT54IFu13ROuBvRqHPJ6j5OqX2a3h2zKcCdNmo2xbN-8osJXa8-id2wg4EfVO61hg1U2wWtUmMJh63TgVzjYT4EcbT1Y2VTKBmD7pB6LerTzyCmf9MWF617ejfxBZVq-tFYeqPGvs_3r-9i3kBNgmgW8pfjj1fVQ"/>
<span className="text-xs font-bold text-center uppercase tracking-tight text-white">Huracán</span>
</div>
</div>
</div>
</div>
</div>

<div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-background via-background/95 to-transparent md:relative md:bg-none md:p-0 md:mt-12">
<button className="w-full h-14 bg-primary-gradient text-on-primary font-headline font-extrabold text-lg rounded-xl shadow-[0_8px_32px_rgba(181,242,61,0.25)] flex items-center justify-center gap-3 active:scale-[0.98] transition-transform">
<span className="material-symbols-outlined" data-icon="save">save</span>
                Guardar pronósticos
            </button>
</div>
</main>



    </>
  );
}
