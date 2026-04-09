
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Page() {
  return (
    <>
      



<aside className="hidden lg:flex h-screen w-64 fixed left-0 top-0 bg-surface-container-low flex flex-col py-6 z-40 border-r border-outline-variant/5">
<div className="px-6 mb-8 mt-16">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center text-primary-foreground">
<span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>sports_score</span>
</div>
<div>
<h2 className="text-sm font-black text-primary uppercase tracking-wider">Prode Arena</h2>
<p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Elite Predictor</p>
</div>
</div>
</div>
<nav className="flex-1 space-y-1 px-2">
<a className="flex items-center gap-3 text-muted-foreground px-4 py-3 hover:bg-surface-container-high hover:text-foreground transition-all duration-300 rounded-lg group" href="#">
<span className="material-symbols-outlined text-xl">home</span>
<span className="font-medium text-sm">Inicio</span>
</a>
<a className="flex items-center gap-3 text-muted-foreground px-4 py-3 hover:bg-surface-container-high hover:text-foreground transition-all duration-300 rounded-lg" href="#">
<span className="material-symbols-outlined text-xl">sports_score</span>
<span className="font-medium text-sm">Mi Prode</span>
</a>
<a className="flex items-center gap-3 text-muted-foreground px-4 py-3 hover:bg-surface-container-high hover:text-foreground transition-all duration-300 rounded-lg" href="#">
<span className="material-symbols-outlined text-xl">group</span>
<span className="font-medium text-sm">Grupos</span>
</a>
<a className="flex items-center gap-3 bg-primary text-primary-foreground font-bold rounded-lg px-4 py-3 shadow-[0_4px_20px_rgba(69,252,155,0.2)]" href="#">
<span className="material-symbols-outlined text-xl">military_tech</span>
<span className="font-medium text-sm">Ranking</span>
</a>
</nav>
<div className="px-4 mt-auto space-y-4">
<button className="w-full bg-primary-gradient py-3 rounded-xl text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_5px_rgba(69,252,155,0.2)] active:scale-[0.98] transition-all hover:shadow-[0_0_8px_rgba(69,252,155,0.4)]">
<span className="material-symbols-outlined text-lg">add_circle</span>
                New Prediction
            </button>
<div className="pt-4 border-t border-outline-variant/10">
<a className="flex items-center gap-3 text-muted-foreground px-4 py-2 hover:text-foreground transition-colors" href="#">
<span className="material-symbols-outlined text-xl">settings</span>
<span className="text-xs uppercase tracking-widest font-bold">Settings</span>
</a>
<a className="flex items-center gap-3 text-muted-foreground px-4 py-2 hover:text-foreground transition-colors" href="#">
<span className="material-symbols-outlined text-xl">logout</span>
<span className="text-xs uppercase tracking-widest font-bold">Logout</span>
</a>
</div>
</div>
</aside>

<main className="lg:ml-64 pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto">

<header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
<div>
<h1 className="text-4xl md:text-5xl font-extrabold editorial-title text-white mb-2 uppercase italic">Ranking Global</h1>
<p className="text-on-surface-variant text-sm font-medium">Compite con miles de usuarios en el Digital Arena.</p>
</div>
<div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant/10">
<button className="px-6 py-2 rounded-lg text-sm font-bold bg-surface-container-high text-primary shadow-sm">Esta fecha</button>
<button className="px-6 py-2 rounded-lg text-sm font-bold text-gray-400 hover:text-white transition-colors">Este mes</button>
<button className="px-6 py-2 rounded-lg text-sm font-bold text-gray-400 hover:text-white transition-colors">Temporada</button>
</div>
</header>

<div className="mb-12">
<div className="bg-secondary-container/20 border border-secondary/10 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-6 relative overflow-hidden">
<div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 blur-[100px] -mr-32 -mt-32 rounded-full"></div>
<div className="flex items-center gap-4 relative z-10">
<div className="w-16 h-16 rounded-full border-2 border-primary p-1">
<img alt="Tu Perfil" className="w-full h-full rounded-full object-cover" data-alt="close-up portrait of a young man with a confident expression and stylish haircut in professional lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNDIuiy6O0nN_HTqEzBiNR4zYzsqHjCVuDRFDMk0AYOFUTfIqtBbpe4ECRUZDiu4cd4HFaAoKtCC1Ebx3lJKo4FMUE684AEw-qIceH6VCU4_gQTYQTi-wOrh3ppsWMTRbAo1Bhs0YwwrRo10j0W_Ok08if2QEJIFmNsln1dX-tSF2-lTSvl138tXXl-8hAPHQ-nd_wWlY5kEs_BBNrti9m_TqzKTEwddC3pN7nMEskmsGaVr_1UyIP1wQ_XG3l6TN1bfgngL1TRQ"/>
</div>
<div>
<span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] block mb-1">Tu Posición</span>
<h3 className="text-2xl font-bold text-white">Marcos G. <span className="text-primary font-black">#42</span></h3>
</div>
</div>
<div className="flex gap-8 md:gap-16 relative z-10">
<div className="text-center md:text-left">
<span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Puntos</span>
<span className="text-3xl font-black editorial-title text-white">1,240</span>
</div>
<div className="text-center md:text-left">
<span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Diferencia</span>
<span className="text-3xl font-black editorial-title text-error">-12</span>
</div>
<div className="text-center md:text-left">
<span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Racha</span>
<div className="flex gap-1 mt-1">
<span className="w-4 h-4 rounded-sm bg-primary"></span>
<span className="w-4 h-4 rounded-sm bg-primary"></span>
<span className="w-4 h-4 rounded-sm bg-primary"></span>
<span className="w-4 h-4 rounded-sm bg-gray-700"></span>
<span className="w-4 h-4 rounded-sm bg-gray-700"></span>
</div>
</div>
</div>
</div>
</div>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

<div className="lg:col-span-8 space-y-8">

<div className="grid grid-cols-1 md:grid-cols-3 gap-4">

<div className="bg-surface-container-low rounded-2xl p-6 flex flex-col items-center justify-center order-2 md:order-1 border-t-4 border-gray-400">
<div className="relative mb-4">
<img alt="Silver" className="w-20 h-20 rounded-full object-cover" data-alt="profile portrait of a cheerful young woman with curly hair and casual urban clothing on a soft grey background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBVDS7yq6hOdeOO4kAyotTdnVHLRiG-6oL5sOjo905JLn64lZs7Vcm8piWr5Gp2dKVupqGha2-4zCj_vk_jTEsibtCjcG0Wc-IfgDchaFJbYGLE7jNwKItUV1LDYT_Jn5l2UlX0JYtbVn3yFYOs0o_OhBejNjMo2T10py3t90ob0jOtIkLH_etHWGIppwa5ZTo8uab-e5pDevr6aXnALgAe1fS_2JWPKvhPA4qTWKCltRvkrSBP3Y2q0mhWOVY5qMmeJaP04mG5zQ"/>
<div className="absolute -bottom-2 -right-2 bg-gray-400 w-10 h-10 rounded-full flex items-center justify-center border-4 border-surface-container-low shadow-lg">
<svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path>
</svg>
</div>
</div>
<h4 className="font-bold text-white mb-1">Lucía Sanz</h4>
<span className="text-primary font-black text-xl">1,540 pts</span>
</div>

<div className="bg-surface-container-high rounded-2xl p-8 flex flex-col items-center justify-center order-1 md:order-2 border-t-4 border-primary transform md:scale-105 shadow-2xl relative">
<div className="absolute top-4 left-4">
<span className="material-symbols-outlined text-primary text-4xl" style={{fontVariationSettings: "'FILL' 1"}}>workspace_premium</span>
</div>
<div className="relative mb-4">
<img alt="Gold" className="w-24 h-24 rounded-full object-cover border-4 border-primary" data-alt="studio portrait of a middle-aged man with short beard and sophisticated expression in sharp focus lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuApcuvKymSZLXVkR56SvZ5vt7WIaA80jSeX4oPK2zEzNr-rHXumm8vM9IxBoQMcC_oH8p8UzdoFxo5AeTugoAgF6r4kYVFgAyne8FsPggHxtdocDbgvXqJDLp28h9XoDB0GNOMk_COZ2FTp2P9-UCkcRLpazhL_0FBhMBaU450y7_TgQavczGpbsUjW5mXxoiIZGTG78C9w6iCbRpJ2C-IYLeLWY_4tZBRmuAthjZXCFAeM479M9Ec208k8DUSpabeMxleem3s3Xg"/>
<div className="absolute -bottom-2 -right-2 bg-primary w-12 h-12 rounded-full flex items-center justify-center border-4 border-surface-container-high shadow-lg">
<svg className="w-7 h-7 text-background" fill="currentColor" viewBox="0 0 24 24">
<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path>
</svg>
</div>
</div>
<h4 className="font-black text-2xl text-white mb-1">Koke_10</h4>
<span className="text-primary font-black text-2xl">1,820 pts</span>
</div>

<div className="bg-surface-container-low rounded-2xl p-6 flex flex-col items-center justify-center order-3 md:order-3 border-t-4 border-orange-700">
<div className="relative mb-4">
<img alt="Bronze" className="w-20 h-20 rounded-full object-cover" data-alt="professional corporate headshot of a smiling man with neat hair against a blurred office window background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5wQv9kHw5XmMqozmJ3I0EqIzd1rabumqEPaY5k_IluAOarWxD0NLN2p2lsNHIkxLKDhTWa9hQNdZITU-59-i_ToRoaczSmLvkDSY7JErdAgMD_1ZhIC03hzYCAgV_XVXlQoefH3wrkR7O-F6IwdSy_aUp58Mpj9xBak2SHp13Fpj2dZYutF79AKUpTp6MS0LXqbRIlbO66XQbkN4h3RUQI_1pqe2fFPGvJTlBQFSx9ikRn-zSQEbBBitD_MgbCvGRAE5mQtl09w"/>
<div className="absolute -bottom-2 -right-2 bg-orange-700 w-10 h-10 rounded-full flex items-center justify-center border-4 border-surface-container-low shadow-lg">
<svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path>
</svg>
</div>
</div>
<h4 className="font-bold text-white mb-1">S. Ramos</h4>
<span className="text-primary font-black text-xl">1,490 pts</span>
</div>
</div>

<div className="bg-surface-container-low rounded-2xl overflow-hidden border border-outline-variant/10">
<table className="w-full text-left border-collapse">
<thead className="bg-surface-container-highest/30">
<tr>
<th className="py-4 px-6 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Posición</th>
<th className="py-4 px-6 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Usuario</th>
<th className="py-4 px-6 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Grupos</th>
<th className="py-4 px-6 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Puntos</th>
<th className="py-4 px-6 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Racha</th>
</tr>
</thead>
<tbody className="divide-y divide-outline-variant/5">

<tr className="hover:bg-surface-container-highest/20 transition-colors">
<td className="py-4 px-6 font-black editorial-title text-xl text-gray-400">04</td>
<td className="py-4 px-6">
<div className="flex items-center gap-3">
<img className="w-8 h-8 rounded-full object-cover" data-alt="face of a man with glasses and a friendly expression in clear outdoor lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDO5Eycyhp68Zp8kAobf5SQNPbt8FxdWBVhXa1GenwPdt21ZhztchflyMIsK1cyTjrL2_kmEJPVCpKXsUoUTC8WVf9IO-b2WWr9CrMiXmyH_f4BvxsxWwBhNeSTJ3MsdmZOZDPHneo9_KlFql6PkY_PZij9KrIkbZ-Xp-Qa8nfCrJTfWZMQph0SQm0WEiLnjMUUvawvnDTYvSIBRPUHegaPT-CPL0nPvYhUKd88SHIJdKcNQz4sJOrorJkoQFrD6jr4j40Fih98rQ"/>
<span className="font-bold text-white">Martin R.</span>
</div>
</td>
<td className="py-4 px-6 text-sm text-on-surface-variant">4 Grupos</td>
<td className="py-4 px-6 font-bold text-primary">1,385</td>
<td className="py-4 px-6">
<div className="flex gap-0.5">
<span className="w-3 h-3 bg-primary rounded-sm"></span>
<span className="w-3 h-3 bg-primary rounded-sm"></span>
<span className="w-3 h-3 bg-error rounded-sm"></span>
<span className="w-3 h-3 bg-primary rounded-sm"></span>
<span className="w-3 h-3 bg-primary rounded-sm"></span>
</div>
</td>
</tr>

<tr className="hover:bg-surface-container-highest/20 transition-colors">
<td className="py-4 px-6 font-black editorial-title text-xl text-gray-400">05</td>
<td className="py-4 px-6">
<div className="flex items-center gap-3">
<img className="w-8 h-8 rounded-full object-cover" data-alt="professional portrait of a man with clean shaven face and smart clothing on neutral background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtw5a8olcfkphN6t-nvudCvHsnuqXiM4_2zAJM1jDMbwS8rNlb1epwTYvtTKqjVX1kX-XPyqvJdyule3rwdnb5Z-u5bV-RUP-FqbqtoSNfdaHfaYrJAnjeWfHzu1Vbo2O5qnUny9_TgS0zcJ9bm2MbraYiwicTRaXcHxDRxWPa6u8x3uj03JXTBUaV_68c_9QSClBp-ZRWYCb2y9j91PxmjpibBRppPXOWBm8ssexgyg2AH4rwzM8P6uNE-NOpaXcjdYxscNm20w"/>
<span className="font-bold text-white">Alex99</span>
</div>
</td>
<td className="py-4 px-6 text-sm text-on-surface-variant">2 Grupos</td>
<td className="py-4 px-6 font-bold text-primary">1,360</td>
<td className="py-4 px-6">
<div className="flex gap-0.5">
<span className="w-3 h-3 bg-gray-600 rounded-sm"></span>
<span className="w-3 h-3 bg-primary rounded-sm"></span>
<span className="w-3 h-3 bg-primary rounded-sm"></span>
<span className="w-3 h-3 bg-error rounded-sm"></span>
<span className="w-3 h-3 bg-primary rounded-sm"></span>
</div>
</td>
</tr>

<tr className="hover:bg-surface-container-highest/20 transition-colors">
<td className="py-4 px-6 font-black editorial-title text-xl text-gray-400">06</td>
<td className="py-4 px-6">
<div className="flex items-center gap-3">
<img className="w-8 h-8 rounded-full object-cover" data-alt="outdoor portrait of a woman with long dark hair and natural skin tone in daylight" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCByMoYOn3KO82iwoMTVjOZnldVjsrvkGtkJme7hLbon3JoA9XPJKsKds_FsnHr32_CS0msDw5yOmlhenGqKhCwRMNRib4dOJAXLAKELCk9H-ENzKjCOj2iVcIb-h-vMo-l7MNPyWrjYCX-1_JLX6cSh7M7e9q1KA2tmzQVnczSe1cYBBAKc8FLGNE0QQjf3XosZjBOuVsaEQKlEDNtXK8SWdwifjPPA6P9iBjq2NOsucxBtcptVK7ysUnt6NRu9ldGOvN3hqi80Q"/>
<span className="font-bold text-white">Elena_Predict</span>
</div>
</td>
<td className="py-4 px-6 text-sm text-on-surface-variant">7 Grupos</td>
<td className="py-4 px-6 font-bold text-primary">1,310</td>
<td className="py-4 px-6">
<div className="flex gap-0.5">
<span className="w-3 h-3 bg-primary rounded-sm"></span>
<span className="w-3 h-3 bg-gray-600 rounded-sm"></span>
<span className="w-3 h-3 bg-primary rounded-sm"></span>
<span className="w-3 h-3 bg-primary rounded-sm"></span>
<span className="w-3 h-3 bg-gray-600 rounded-sm"></span>
</div>
</td>
</tr>
</tbody>
</table>
</div>
</div>

<aside className="lg:col-span-4 space-y-6">

<div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/10">
<div className="flex items-center justify-between mb-6">
<h3 className="text-xs font-black uppercase tracking-widest text-primary">Porcentajes de la Fecha</h3>
<span className="material-symbols-outlined text-sm text-on-surface-variant">trending_up</span>
</div>
<div className="space-y-8">

<div>
<div className="flex justify-between items-center mb-3">
<span className="text-xs font-bold text-white uppercase tracking-tighter">Real Madrid vs Barcelona</span>
<span className="text-[10px] text-on-surface-variant">2.4k votos</span>
</div>
<div className="flex h-3 w-full rounded-full overflow-hidden bg-surface-container-highest">
<div className="bg-primary h-full" style={{}}></div>
<div className="bg-gray-600 h-full border-x border-surface-container-low" style={{}}></div>
<div className="bg-secondary-container h-full" style={{}}></div>
</div>
<div className="flex justify-between mt-2">
<div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary"></span><span className="text-[9px] font-bold text-gray-400">1 (45%)</span></div>
<div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-600"></span><span className="text-[9px] font-bold text-gray-400">X (25%)</span></div>
<div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary-container"></span><span className="text-[9px] font-bold text-gray-400">2 (30%)</span></div>
</div>
</div>

<div>
<div className="flex justify-between items-center mb-3">
<span className="text-xs font-bold text-white uppercase tracking-tighter">Man City vs Arsenal</span>
<span className="text-[10px] text-on-surface-variant">1.8k votos</span>
</div>
<div className="flex h-3 w-full rounded-full overflow-hidden bg-surface-container-highest">
<div className="bg-primary h-full" style={{}}></div>
<div className="bg-gray-600 h-full border-x border-surface-container-low" style={{}}></div>
<div className="bg-secondary-container h-full" style={{}}></div>
</div>
<div className="flex justify-between mt-2">
<div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary"></span><span className="text-[9px] font-bold text-gray-400">1 (60%)</span></div>
<div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-600"></span><span className="text-[9px] font-bold text-gray-400">X (15%)</span></div>
<div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary-container"></span><span className="text-[9px] font-bold text-gray-400">2 (25%)</span></div>
</div>
</div>

<div>
<div className="flex justify-between items-center mb-3">
<span className="text-xs font-bold text-white uppercase tracking-tighter">Inter vs Milan</span>
<span className="text-[10px] text-on-surface-variant">1.2k votos</span>
</div>
<div className="flex h-3 w-full rounded-full overflow-hidden bg-surface-container-highest">
<div className="bg-primary h-full" style={{}}></div>
<div className="bg-gray-600 h-full border-x border-surface-container-low" style={{}}></div>
<div className="bg-secondary-container h-full" style={{}}></div>
</div>
<div className="flex justify-between mt-2">
<div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary"></span><span className="text-[9px] font-bold text-gray-400">1 (33%)</span></div>
<div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-600"></span><span className="text-[9px] font-bold text-gray-400">X (34%)</span></div>
<div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary-container"></span><span className="text-[9px] font-bold text-gray-400">2 (33%)</span></div>
</div>
</div>
</div>
</div>

<div className="bg-secondary-container rounded-2xl p-6 relative overflow-hidden group">
<div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&amp;fit=crop&amp;q=80&amp;w=600')] bg-cover bg-center mix-blend-overlay opacity-20 group-hover:scale-110 transition-transform duration-700" data-alt="dramatic wide shot of a modern football stadium at night under bright floodlights with a sense of excitement and scale"></div>
<div className="relative z-10">
<h4 className="text-xl font-black editorial-title text-primary italic mb-2 uppercase">Gana la Champions</h4>
<p className="text-white/80 text-sm mb-6 leading-relaxed">Predice el resultado de la final y gana un viaje VIP para el próximo año.</p>
<button className="bg-white text-background font-black py-3 px-6 rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 group/btn">
                            Ver Bases
                            <span className="material-symbols-outlined text-sm group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
</button>
</div>
</div>
</aside>
</div>
</main>

<div className="md:hidden fixed bottom-0 left-0 w-full bg-background/95 backdrop-blur-md flex justify-around items-center h-20 px-6 z-50 border-t border-white/5">
<a className="flex flex-col items-center gap-1 text-gray-400" href="#">
<span className="material-symbols-outlined">home</span>
<span className="text-[10px] font-bold uppercase tracking-tighter">Inicio</span>
</a>
<a className="flex flex-col items-center gap-1 text-gray-400" href="#">
<span className="material-symbols-outlined">sports_score</span>
<span className="text-[10px] font-bold uppercase tracking-tighter">Mi Prode</span>
</a>
<div className="relative -top-8">
<button className="liquid-neon w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(181,242,61,0.4)] text-background">
<span className="material-symbols-outlined text-3xl font-black">add</span>
</button>
</div>
<a className="flex flex-col items-center gap-1 text-primary" href="#">
<span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>military_tech</span>
<span className="text-[10px] font-bold uppercase tracking-tighter">Ranking</span>
</a>
<a className="flex flex-col items-center gap-1 text-gray-400" href="#">
<span className="material-symbols-outlined">account_circle</span>
<span className="text-[10px] font-bold uppercase tracking-tighter">Perfil</span>
</a>
</div>



    </>
  );
}
