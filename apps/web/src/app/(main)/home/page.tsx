
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Page() {
  return (
    <>
      

<header className="fixed top-0 w-full z-50 bg-[#131317]/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(73,24,200,0.08)]">
<nav className="flex justify-between items-center h-16 px-6 max-w-full font-['Manrope'] font-bold tracking-tight">
<div className="flex items-center gap-8">
<span className="text-2xl font-black text-[#b5f23d] italic">Prode</span>
<div className="hidden md:flex items-center gap-6">
<a className="text-[#b5f23d] border-b-2 border-[#b5f23d] pb-1 transition-colors duration-200" href="/home">Inicio</a>
<a className="text-gray-400 font-medium hover:text-[#b5f23d] transition-colors duration-200" href="#">Mi Prode</a>
<a className="text-gray-400 font-medium hover:text-[#b5f23d] transition-colors duration-200" href="#">Grupos</a>
<a className="text-gray-400 font-medium hover:text-[#b5f23d] transition-colors duration-200" href="#">Ranking</a>
</div>
</div>
<div className="flex items-center gap-4">
<button className="material-symbols-outlined text-gray-400 hover:text-[#b5f23d] active:scale-95 duration-100" data-icon="notifications">notifications</button>
<div className="flex items-center gap-2 cursor-pointer group">
<img alt="User" className="w-8 h-8 rounded-full object-cover ring-2 ring-transparent group-hover:ring-[#b5f23d] transition-all" data-alt="portrait of a confident man with short beard and dark hair on a neutral professional background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCwbGBd9-5YCK3M69RDmTPOsMSiPCyCgVMa4tbZYwZtE5VQYK9_k9JgsOp2PjLUSvMeACi0AwTQ4whDlCbJ7y5kRkvsRkhNAnO5z2AAVWXCShUBQy9cxS3UAXVvaPaoqKrPnaurvzV2EIraOQcqiSojgcIT9m3OTtwZQqgI7Zdimkg7s4VuxuCNz6AethDT-5-KHwDKNcNj1724T_fmFeic1tc-TP7M_iLmJq2DfRuDq-2FPrj-Q5W08VDkMeBU4iYBpM8t68gkvA"/>
<span className="material-symbols-outlined text-gray-400 group-hover:text-[#b5f23d]" data-icon="account_circle">account_circle</span>
</div>
</div>
</nav>
</header>
<main className="pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto">

<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

<div className="lg:col-span-8 space-y-8">

<section className="relative overflow-hidden rounded-xxl aspect-[21/9] md:aspect-[3/1] bg-surface-container-low flex items-center group">
<img alt="Stadium" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700" data-alt="wide shot of a modern football stadium at night under bright floodlights with green pitch and hazy atmosphere" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1s4gRDbvGI23rQem4HSV0txOmpIhU3BfujBj2MTGUJEAZoIYQ1GxplLL5kuMcuO3b40AXA7Gjp3XtDQZe2qcsWRN-MAyJEP1rT6j2-PasPpNTaDl4s_5J9vQj6UYr-lVE5KXL3RFAN57DW16ziWh8MMS2rU0h8cFf4sWHdVoFpmNb6jQMJKb_03DOGxz0aTPmWRuiX0XTlbF_oU2A-Yc5KLpFzNh3QyOjYzzF0ALfohwf8JjPbFWELjCoo3Z0-Q5wGttemHpxBA"/>
<div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent"></div>
<div className="relative z-10 px-8 md:px-12 space-y-4">
<div className="space-y-1">
<span className="text-[#b5f23d] font-bold tracking-widest text-xs uppercase">Liga Argentina</span>
<h1 className="text-3xl md:text-5xl headline-text font-extrabold tracking-tight">Fecha 12</h1>
</div>
<div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[#b5f23d]" data-icon="timer">timer</span>
<span className="font-semibold text-lg">Cierra en 14h 32m</span>
</div>
<button className="liquid-neon text-[#131317] font-bold px-8 py-3 rounded-xl shadow-lg active:scale-95 transition-all">
                                Cargar pronósticos
                            </button>
</div>
</div>
</section>

<section className="space-y-4">
<div className="flex justify-between items-center">
<h2 className="text-xl headline-text font-bold">Mis grupos</h2>
<button className="text-[#b5f23d] text-sm font-semibold hover:underline">Ver todos</button>
</div>
<div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar">

<div className="min-w-[280px] bg-surface-container-high rounded-xxl p-5 space-y-4 border border-outline-variant/10">
<div className="flex justify-between items-start">
<div className="bg-secondary-container/20 p-2 rounded-lg">
<span className="material-symbols-outlined text-secondary" data-icon="groups">groups</span>
</div>
<span className="bg-[#b5f23d]/10 text-[#b5f23d] text-xs font-bold px-2 py-1 rounded-full">#2 de 8</span>
</div>
<div>
<h3 className="font-bold text-lg">Oficina Tech</h3>
<p className="text-on-surface-variant text-sm">8 miembros activos</p>
</div>
<div className="flex items-center justify-between pt-2 border-t border-outline-variant/10">
<span className="text-xs text-on-surface-variant">Líder:</span>
<div className="flex items-center gap-2">
<span className="text-xs font-bold">Marcos G.</span>
<img alt="Leader" className="w-6 h-6 rounded-full object-cover" data-alt="headshot of a smiling young man with dark curly hair against a clean studio background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZnK_09SBTqXGPMuI5dRRXvPHJC12sT1zFOlGzwZ7PEEBEknTMgamLQtpg5ZOzTuSZmPVmyEJ17fez1_R0qSgUfkuaGTkGmOL-AKJ5hmzpNlUDHsGAg9r06P97C6EzXtbCt3v8w5nHuLO2R_NsuxKJ_YHRqYXMklq0Qt8PYQnVZiCRNe-SKhmY1X-_RWWPcgZeFCmPYY6SvVurjdk-HHpWdQ7zUMz6CHTiE0Re1fao8zQl9IQnU3BPP3NNaX3rdP54YAOZNcbVqQ"/>
</div>
</div>
</div>

<div className="min-w-[280px] bg-surface-container-high rounded-xxl p-5 space-y-4 border border-outline-variant/10">
<div className="flex justify-between items-start">
<div className="bg-secondary-container/20 p-2 rounded-lg">
<span className="material-symbols-outlined text-secondary" data-icon="sports_soccer">sports_soccer</span>
</div>
<span className="bg-[#b5f23d]/10 text-[#b5f23d] text-xs font-bold px-2 py-1 rounded-full">#5 de 15</span>
</div>
<div>
<h3 className="font-bold text-lg">Fútbol Amigos</h3>
<p className="text-on-surface-variant text-sm">15 miembros activos</p>
</div>
<div className="flex items-center justify-between pt-2 border-t border-outline-variant/10">
<span className="text-xs text-on-surface-variant">Líder:</span>
<div className="flex items-center gap-2">
<span className="text-xs font-bold">Sofía R.</span>
<img alt="Leader" className="w-6 h-6 rounded-full object-cover" data-alt="portrait of a radiant woman with long brown hair smiling warmly" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHf6ysEPOgBxKkSYf52wG1dlqCRZBlrHUTj5CPbkjmP08jJ_fTjD5Mp3JCA1NgWlsOuXasoKjD_VP-E0lfPxHveJ73_fFISwT7J97f4-yzkvaqcEJdwDhV6xViHcrK9IPN1nPegzkyFmPS_CecI-_Vwd5vflX06cD9Y_btSwzslJf_IY18w3GQUznV_-c4CrM7WNLg-ja_a3H0eX0T5JWGSbFRSO5Idu68adxXnYszL1Nz3C1hWInk_HyHRGY_KQbf6L80jwC7qg"/>
</div>
</div>
</div>

<div className="min-w-[280px] bg-surface-container-high rounded-xxl p-5 space-y-4 border border-outline-variant/10">
<div className="flex justify-between items-start">
<div className="bg-secondary-container/20 p-2 rounded-lg">
<span className="material-symbols-outlined text-secondary" data-icon="emoji_events">emoji_events</span>
</div>
<span className="bg-[#b5f23d]/10 text-[#b5f23d] text-xs font-bold px-2 py-1 rounded-full">#1 de 12</span>
</div>
<div>
<h3 className="font-bold text-lg">La Scaloneta</h3>
<p className="text-on-surface-variant text-sm">12 miembros activos</p>
</div>
<div className="flex items-center justify-between pt-2 border-t border-outline-variant/10">
<span className="text-xs text-on-surface-variant">Líder:</span>
<div className="flex items-center gap-2">
<span className="text-xs font-bold">Tú</span>
<img alt="User" className="w-6 h-6 rounded-full object-cover" data-alt="portrait of a confident man with short beard and dark hair" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKTq9rRBpMzkp-BYyqKlFYuPqlWcq0ZOvWXGd4nBit5Er5tHWevxY3EDqE_CUSdAivTG2v9LmA1WYtvK5O8GdPhAyLS9OmIn3mmyZ5zLNNL5U9cK3_7H6WVtu9h7P8c50sPvnL8YiEn6xiCc6eOuOfiVcwH4v3xGIICpaJjt8Ga-_7DD4SteNs3780v1DjIkxi27zzJScL8P51--CZ9Tbnl4ATZRnjdcq4J2ICkWHXL4VJyKqIKekCXBgJQNIrul58DJfD3-3Vuw"/>
</div>
</div>
</div>
</div>
</section>
</div>

<div className="lg:col-span-4 space-y-8">

<section className="bg-gradient-to-br from-secondary-container to-[#32009a] rounded-xxl p-6 shadow-2xl relative overflow-hidden">
<div className="absolute -right-4 -bottom-4 opacity-10">
<span className="material-symbols-outlined text-[120px]" data-icon="military_tech">military_tech</span>
</div>
<div className="relative z-10 space-y-6">
<div className="space-y-1">
<h2 className="text-white/60 uppercase text-[10px] tracking-widest font-black">Mi Ranking Global</h2>
<div className="flex items-end gap-2">
<span className="text-4xl font-black text-white italic">#1,452</span>
<span className="text-[#b5f23d] font-bold text-sm mb-1">+12 pos.</span>
</div>
</div>
<div className="flex items-center justify-between">
<div className="text-white">
<p className="text-xs opacity-60">Puntos totales</p>
<p className="text-xl font-bold">2,480 pts</p>
</div>
<button className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors">
                                Ver ranking completo
                            </button>
</div>
</div>
</section>

<section className="bg-surface-container-low rounded-xxl p-6 space-y-6">
<h2 className="text-xl headline-text font-bold">Actividad reciente</h2>
<div className="space-y-6">

<div className="flex gap-4">
<div className="relative">
<img alt="Avatar" className="w-10 h-10 rounded-full object-cover" data-alt="portrait of a young man with short blond hair and clear blue eyes" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQeN64qd9r7AjduuiYOZUf7HkeVjI-DtOQR8-7TneCvoTliqoF7zBQGf47Cr_LX1dqHce9ZBikDaeRh3nOSqppjQot7ZYwZZUW1eRDRyi_f5mUZ8qgYyGzTr7b5O4f4INSIh3fj7PpWKoNN6fF6SANTgbCqaju3oOMA2oeh3WAdhMFMg3C2e2zd5RXMOx1UwgbOO990REtDnaZE6AdSUbB_zsY2GbgoyBUknjhN-zGe-tmmRH3v36RUYMsG14CldnCwBAAAvGOnQ"/>
<div className="absolute -bottom-1 -right-1 bg-[#b5f23d] rounded-full p-0.5 border-2 border-surface-container-low">
<span className="material-symbols-outlined text-[12px] text-[#131317] block" data-icon="check_circle" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
</div>
</div>
<div className="flex-1">
<p className="text-sm"><span className="font-bold">Juan</span> acertó <span className="text-[#b5f23d] font-bold">3/3</span> resultados en la jornada de hoy.</p>
<span className="text-xs text-on-surface-variant">hace 14m</span>
</div>
</div>

<div className="flex gap-4">
<div className="w-10 h-10 rounded-full bg-secondary-container/30 flex items-center justify-center">
<span className="material-symbols-outlined text-secondary text-xl" data-icon="person_add">person_add</span>
</div>
<div className="flex-1">
<p className="text-sm"><span className="font-bold">Matias P.</span> se unió a tu grupo <span className="font-bold">La Scaloneta</span>.</p>
<span className="text-xs text-on-surface-variant">hace 2h</span>
</div>
</div>

<div className="flex gap-4">
<div className="relative">
<img alt="Avatar" className="w-10 h-10 rounded-full object-cover" data-alt="headshot of a smiling woman with wavy dark hair on a neutral background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCkBCk6uZIDED83H2YChMxiyQ0ilupMV67hhyz1yG4YQK7Nl3UJ1nYUVpUlRzdYOhbgRrIj7MF7Fr2ALLRXeR4sNv6CZMlH8REdEQZCZDJZhNUJ98WDhu-N9nHg3kh95yGMtZIt3jYuWg-dpdLIPEBgfYRbkZAu377vKu8PwDBnIUj0rCJfFiGj1HkbcU167n4QVF-l7TdPGdyGE6RcepGQQMTOr2AaiPPLNI8zbkp3TO4ijJhk8N_YJfJ5MEclSqoE9_bfV5xSLQ"/>
<div className="absolute -bottom-1 -right-1 bg-secondary rounded-full p-0.5 border-2 border-surface-container-low">
<span className="material-symbols-outlined text-[12px] text-on-secondary block" data-icon="military_tech" style={{fontVariationSettings: "'FILL' 1"}}>military_tech</span>
</div>
</div>
<div className="flex-1">
<p className="text-sm"><span className="font-bold">Sofía R.</span> subió al puesto <span className="font-bold">#5</span> en el ranking global.</p>
<span className="text-xs text-on-surface-variant">hace 5h</span>
</div>
</div>

<div className="flex gap-4">
<div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center">
<span className="material-symbols-outlined text-on-surface-variant text-xl" data-icon="update">update</span>
</div>
<div className="flex-1">
<p className="text-sm">Se actualizaron los puntos de la <span className="font-bold">Fecha 11</span>.</p>
<span className="text-xs text-on-surface-variant">hace 1d</span>
</div>
</div>
</div>
</section>
</div>
</div>
</main>

<footer className="w-full py-12 border-t-0 bg-[#131317]">
<div className="flex flex-col items-center justify-center space-y-4">
<div className="flex gap-8">
<a className="font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-all" href="#">Terms</a>
<a className="font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-all" href="#">Privacy</a>
<a className="font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-all" href="#">Support</a>
</div>
<p className="font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-widest text-gray-500">© 2024 Prode Arena. The Stadium is Yours.</p>
</div>
</footer>

<div className="md:hidden fixed bottom-0 left-0 right-0 glass-nav h-20 px-6 flex items-center justify-between border-t border-white/5 z-50">
<a className="flex flex-col items-center gap-1 text-[#b5f23d]" href="/home">
<span className="material-symbols-outlined" data-icon="home" style={{fontVariationSettings: "'FILL' 1"}}>home</span>
<span className="text-[10px] font-bold">Inicio</span>
</a>
<a className="flex flex-col items-center gap-1 text-gray-400" href="#">
<span className="material-symbols-outlined" data-icon="sports_score">sports_score</span>
<span className="text-[10px] font-bold">Mi Prode</span>
</a>
<div className="-mt-12 bg-[#b5f23d] p-4 rounded-full shadow-[0_0_20px_rgba(181,242,61,0.4)] active:scale-90 transition-transform">
<span className="material-symbols-outlined text-[#131317]" data-icon="add">add</span>
</div>
<a className="flex flex-col items-center gap-1 text-gray-400" href="#">
<span className="material-symbols-outlined" data-icon="group">group</span>
<span className="text-[10px] font-bold">Grupos</span>
</a>
<a className="flex flex-col items-center gap-1 text-gray-400" href="#">
<span className="material-symbols-outlined" data-icon="military_tech">military_tech</span>
<span className="text-[10px] font-bold">Ranking</span>
</a>
</div>

    </>
  );
}
