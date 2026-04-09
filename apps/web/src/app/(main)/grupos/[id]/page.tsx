
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Page() {
  return (
    <>
      

<nav className="fixed top-0 w-full z-50 bg-[#131317]/80 backdrop-blur-xl flex justify-between items-center h-16 px-6 max-w-full shadow-[0_8px_32px_rgba(73,24,200,0.08)]">
<div className="flex items-center gap-8">
<span className="text-2xl font-black text-[#b5f23d] italic font-headline tracking-tight">Prode</span>
<div className="hidden md:flex gap-6 items-center">
<a className="text-gray-400 font-medium hover:text-[#b5f23d] transition-colors duration-200" href="#">Inicio</a>
<a className="text-gray-400 font-medium hover:text-[#b5f23d] transition-colors duration-200" href="#">Mi Prode</a>
<a className="text-[#b5f23d] border-b-2 border-[#b5f23d] pb-1 font-bold" href="#">Grupos</a>
<a className="text-gray-400 font-medium hover:text-[#b5f23d] transition-colors duration-200" href="#">Ranking</a>
</div>
</div>
<div className="flex items-center gap-4">
<button className="material-symbols-outlined text-gray-400 hover:text-[#b5f23d] active:scale-95 duration-100">notifications</button>
<button className="material-symbols-outlined text-gray-400 hover:text-[#b5f23d] active:scale-95 duration-100">account_circle</button>
</div>
</nav>

<div className="pt-24 pb-12 px-6 max-w-7xl mx-auto flex flex-col md:flex-row gap-8">

<main className="flex-1 space-y-8">

<header className="bg-surface-container-low rounded-xl p-8 relative overflow-hidden">
<div className="absolute top-0 right-0 w-64 h-64 bg-secondary-container/10 blur-[100px] rounded-full -mr-20 -mt-20"></div>
<div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
<div className="space-y-2">
<div className="flex items-center gap-3">
<h1 className="text-4xl font-headline font-extrabold tracking-tight text-white">Los Galácticos del Sur</h1>
<span className="bg-surface-container-high px-3 py-1 rounded-full text-xs font-bold text-primary-container tracking-wider uppercase">Public</span>
</div>
<div className="flex items-center gap-4 text-on-surface-variant font-medium">
<div className="flex items-center gap-1">
<span className="material-symbols-outlined text-sm">group</span>
                                128 Miembros
                            </div>
<div className="flex items-center gap-1">
<span className="material-symbols-outlined text-sm">qr_code</span>
                                Código: <span className="text-white font-mono">GAL-2024</span>
</div>
</div>
</div>
<div className="flex gap-3">
<button className="flex items-center gap-2 bg-primary-container text-on-primary px-6 py-3 rounded-lg font-bold hover:brightness-110 active:scale-95 transition-all duration-200 shadow-[0_0_20px_rgba(181,242,61,0.2)]">
<span className="material-symbols-outlined">person_add</span>
                            Invitar
                        </button>
<button className="flex items-center justify-center bg-surface-container-high text-white w-12 h-12 rounded-lg hover:bg-surface-variant transition-colors">
<span className="material-symbols-outlined">settings</span>
</button>
</div>
</div>
</header>

<div className="flex gap-8 border-b border-surface-variant overflow-x-auto no-scrollbar">
<button className="pb-4 text-[#b5f23d] border-b-2 border-[#b5f23d] font-bold text-lg whitespace-nowrap">Ranking</button>
<button className="pb-4 text-on-surface-variant hover:text-white transition-colors font-semibold text-lg whitespace-nowrap">Historial</button>
<button className="pb-4 text-on-surface-variant hover:text-white transition-colors font-semibold text-lg whitespace-nowrap flex items-center gap-2">
                    Chat
                    <span className="bg-secondary-container text-white text-[10px] px-1.5 py-0.5 rounded-full">12</span>
</button>
</div>

<div className="bg-surface-container-low rounded-xl overflow-hidden border border-white/5">
<table className="w-full text-left border-collapse">
<thead>
<tr className="bg-surface-container-high/50 text-on-surface-variant text-xs uppercase tracking-widest font-bold">
<th className="px-6 py-4">Pos</th>
<th className="px-6 py-4">Usuario</th>
<th className="px-6 py-4 text-center">Puntos Fecha</th>
<th className="px-6 py-4 text-center">Racha</th>
<th className="px-6 py-4 text-right">Puntos Totales</th>
</tr>
</thead>
<tbody className="divide-y divide-white/5">

<tr className="hover:bg-white/5 transition-colors group">
<td className="px-6 py-5">
<div className="w-8 h-8 rounded-full bg-primary-container/20 flex items-center justify-center text-primary-container font-black shadow-[0_0_15px_rgba(181,242,61,0.1)]">
<span className="material-symbols-outlined text-lg" style={{fontVariationSettings: "'FILL' 1"}}>military_tech</span>
</div>
</td>
<td className="px-6 py-5">
<div className="flex items-center gap-3">
<img alt="" className="w-10 h-10 rounded-full object-cover border-2 border-primary-container" data-alt="professional portrait of a man with short dark hair and confident expression with neutral background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBycJaNbDHfH-ad2Wj1mJkuvIMws9sHJ8fL3V9M-qeAP1FvPWZ1KzuXT3zubbrJZL4Ybs43vRzL78uRf6FVB-jObnjqnTLQxX1muKP_iET437h_ELyrKhjevD9jo6VO8adHVsFZFZ9YM53dT4EQpcHTCMwctWxDOcxv4MK8aV4HqwbqUevYndpXnkgJX2WZvvnQkg7wkdQFqzTmxrLjqhPLJIRmuHzIt4NAxOqhOUyCkK4uCMjXYHwP8A2_t4d_UnrTTL4ZcIuk0w"/>
<span className="font-bold text-white group-hover:text-primary-container transition-colors">Mateo_Predice</span>
</div>
</td>
<td className="px-6 py-5 text-center font-bold text-primary-container">+45</td>
<td className="px-6 py-5 text-center">
<div className="flex items-center justify-center gap-1 text-[#ffb4ab]">
<span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>local_fire_department</span>
<span className="font-bold">5</span>
</div>
</td>
<td className="px-6 py-5 text-right font-black text-xl text-white">1,420</td>
</tr>

<tr className="hover:bg-white/5 transition-colors group">
<td className="px-6 py-5">
<div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-on-surface-variant font-black">
<span className="material-symbols-outlined text-lg" style={{fontVariationSettings: "'FILL' 1 color"}}>military_tech</span>
</div>
</td>
<td className="px-6 py-5">
<div className="flex items-center gap-3">
<img alt="" className="w-10 h-10 rounded-full object-cover" data-alt="portrait of a young woman with smiling expression and vibrant city bokeh background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCXJf-Wc67iFCrIbAGBx5UVun-6dM3dYIdJmoDckn_Tn5i62qP1Jpw6sh2QSVxFvJGfIwJ5LrUbFvlNEua1jRMqVd7gq_AmQMi25NwhoykIZ4ySBa9RQKbP-_AQNLjodvT3QC2-07KUmmw-RNyjlWJQ1XDiEXkKPGmSOgSMu2LvhwHrX3oSrKJf-jehqBXM58FT8CHmWVmAUOpm0p1Ty0uF8OT2P9OqCJTM_i9orH6QwgMQ4e-e08Yi33Hnfiyf3EFrha6ysIOX4g"/>
<span className="font-bold text-white group-hover:text-primary-container transition-colors">Ana_Soccer</span>
</div>
</td>
<td className="px-6 py-5 text-center font-bold text-white">+32</td>
<td className="px-6 py-5 text-center">
<div className="flex items-center justify-center gap-1 text-[#ffb4ab]">
<span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>local_fire_department</span>
<span className="font-bold">3</span>
</div>
</td>
<td className="px-6 py-5 text-right font-black text-xl text-white">1,385</td>
</tr>

<tr className="bg-primary-container/5 border-l-4 border-primary-container group">
<td className="px-6 py-5">
<div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-black">14</div>
</td>
<td className="px-6 py-5">
<div className="flex items-center gap-3">
<img alt="" className="w-10 h-10 rounded-full object-cover border border-primary-container" data-alt="friendly man smiling in high quality headshot with outdoor natural lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAi5Y9JZwhbzEsi5KkRXfGz8aA_7K7JH56SDlVt3QX4oDsC-bE8rHSsm_Spg4C_FuPcksw4V6Rkah1d6rO3PbPdKyOIYRB1TDJH6f4Dz4XQhm4Ius5YNqHD1XO-eINMSHzYGWg3_zavuJW7Al6JFnpEFZh7pbNe2naqn29ckwl8VKrDkEAzkQV-bhhltI3iI_Y3-lHxQsPddPW2-ivuTdkJTkuuzI4PM2Fv92YpzJUdfiXfbCD9z9TZn8at9nYU1WTxmQoQVcGOBQ"/>
<span className="font-bold text-primary-container uppercase tracking-tight">Tu Perfil</span>
</div>
</td>
<td className="px-6 py-5 text-center font-bold text-primary-container">+28</td>
<td className="px-6 py-5 text-center">
<div className="flex items-center justify-center gap-1 text-gray-500">
<span className="material-symbols-outlined text-sm">local_fire_department</span>
<span className="font-bold">0</span>
</div>
</td>
<td className="px-6 py-5 text-right font-black text-xl text-white">942</td>
</tr>

<tr className="hover:bg-white/5 transition-colors group">
<td className="px-6 py-5">
<div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-on-surface-variant font-black">15</div>
</td>
<td className="px-6 py-5">
<div className="flex items-center gap-3">
<img alt="" className="w-10 h-10 rounded-full object-cover" data-alt="professional male profile photo with clear lighting and corporate setting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAiRhu1HNCulOmblSE1LbAAvf-rMgacY0nXGgtk9VJcZEQKlLyDlxcvZRqp8pTgRLgkY2zdDzR-G_7M7xaBUlQwOwfYfPE9guCYysvn1qM-g8-DYSJoP4GQmceSWC0IQNTUY_UmZrVAqXukllD5POV34HXaCqU4QJp5Mc6qmA1bqQ3nyk05OIjeloi5mdAjuTs4Fb78h_wL1_udnAyVveb437FA2_F3Ol4pmTzbOk0LZQc3v-t28VyzwbuJVO4ph458Z_v2nsEEtw"/>
<span className="font-bold text-white group-hover:text-primary-container transition-colors">Javi_Gol</span>
</div>
</td>
<td className="px-6 py-5 text-center font-bold text-white">+15</td>
<td className="px-6 py-5 text-center">
<div className="flex items-center justify-center gap-1 text-[#ffb4ab]">
<span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>local_fire_department</span>
<span className="font-bold">2</span>
</div>
</td>
<td className="px-6 py-5 text-right font-black text-xl text-white">938</td>
</tr>
</tbody>
</table>
</div>
</main>

<aside className="w-full md:w-80 space-y-6">

<section className="bg-surface-container-low rounded-xl p-6 border border-white/5">
<h3 className="font-headline font-bold text-white text-lg mb-6 flex items-center gap-2">
<span className="material-symbols-outlined text-secondary">trending_up</span>
                    Actividad Reciente
                </h3>
<div className="space-y-6">
<div className="flex gap-4">
<div className="relative">
<img alt="" className="w-10 h-10 rounded-full" data-alt="profile image for activity feed" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDdQc_02eeP1MqEv60XXoruElb8ceRfNtkklUBOvyWlDuJq9k0CyWJ2ioyuJHtLYBt3bbx9_A0SatSmFwAUH6RcCpRDuciR2APkxnUtTvpzHgWlQ0D2-nvKd1RGVh2MwJZeKS1_mSn_hh5fyROoqwCtpBlboQ6mvm2DoArtBgF6R_mCI1a_G9L0-eXTi5-_5ey6BaQV2IF86kenFKTrmCKEDzklPJOjzjAQISZmcj4a3F_1rP2u2GKHT3rnS67kJhCDIr5oODyrw"/>
<div className="absolute -bottom-1 -right-1 bg-primary-container text-on-primary w-5 h-5 rounded-full flex items-center justify-center">
<span className="material-symbols-outlined text-[12px] font-bold">military_tech</span>
</div>
</div>
<div className="flex-1 space-y-1">
<p className="text-sm text-on-surface leading-snug">
<span className="font-bold text-white">Mateo_Predice</span> subió al 1er puesto.
                            </p>
<span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Hace 12 min</span>
</div>
</div>
<div className="flex gap-4">
<div className="relative">
<img alt="" className="w-10 h-10 rounded-full" data-alt="profile image for activity feed" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDyym9rYzkLOeSzLOkT7TQYPhxucTGva2DRjSpX8qlDhaWJaFallqZQVn3E5ADHjSOaT_rQLNnJ1I5EzCUEXcyDAIGUGw4HApBOh0lSfOGq21bYbe--mqgz-fGRaJy0aRkkKI-V915bapONRSjTNKh4e9UpwAJU8vocUbjwi66JADlvMbFhbMDJSST0UD2fR1Wk4oKpibyzrqxvLfM2PP7cD_Q9rLrYDIBxUNq42bDPFQ29NUzvuCgfi9CA8ypcE_MDk2CccGWzw"/>
<div className="absolute -bottom-1 -right-1 bg-secondary-container text-white w-5 h-5 rounded-full flex items-center justify-center">
<span className="material-symbols-outlined text-[12px] font-bold">edit</span>
</div>
</div>
<div className="flex-1 space-y-1">
<p className="text-sm text-on-surface leading-snug">
<span className="font-bold text-white">Tú</span> actualizaste tus predicciones para la Fecha 12.
                            </p>
<span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Hace 1 hora</span>
</div>
</div>
<div className="flex gap-4">
<div className="relative">
<img alt="" className="w-10 h-10 rounded-full" data-alt="profile image for activity feed" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBgPZMyyFtgbZWWj8cHN_Kbo3rqS9uESinRf4x5lsVpospUtyZmFgL0z2JTELaJ9-ZJdlcHOZOcvDv2g-HT1JRdbfPXYIVrcKBYHXRFBh4JGFrJtQZlClZhs7--85gdy0Uz8RObuSGcMuT3n9H_n--oNwCpa1XTMDYLwlsD620rKJ-u43JQLvavMcxWRBe-tkNBO0cw15FuUQu__03Eb04XorPReJXqTE-9mNvCBjqsLsw_Iv8nmHrY00Wd63gMSJyzX4n2cxIB4A"/>
<div className="absolute -bottom-1 -right-1 bg-[#ffb4ab] text-on-error w-5 h-5 rounded-full flex items-center justify-center">
<span className="material-symbols-outlined text-[12px] font-bold" style={{fontVariationSettings: "'FILL' 1"}}>local_fire_department</span>
</div>
</div>
<div className="flex-1 space-y-1">
<p className="text-sm text-on-surface leading-snug">
<span className="font-bold text-white">Ana_Soccer</span> consiguió una racha de 3.
                            </p>
<span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Ayer</span>
</div>
</div>
</div>
</section>

<section className="grid grid-cols-2 gap-4">
<div className="bg-secondary-container/10 p-4 rounded-xl border border-secondary-container/20">
<span className="text-xs font-bold text-on-secondary-container uppercase tracking-widest block mb-1">Promedio</span>
<span className="text-2xl font-black text-white">842 pts</span>
</div>
<div className="bg-primary-container/10 p-4 rounded-xl border border-primary-container/20">
<span className="text-xs font-bold text-primary-container uppercase tracking-widest block mb-1">Actividad</span>
<span className="text-2xl font-black text-white">92%</span>
</div>
</section>

<section className="relative bg-gradient-to-br from-secondary-container to-on-secondary-fixed-variant rounded-xl p-6 overflow-hidden">
<div className="relative z-10 space-y-4">
<h4 className="font-headline font-extrabold text-white text-xl leading-tight">¿Falta alguien en el grupo?</h4>
<p className="text-on-secondary-container text-sm">Copia el enlace rápido y compártelo en WhatsApp.</p>
<button className="w-full bg-white text-on-secondary-fixed px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
<span className="material-symbols-outlined text-sm">content_copy</span>
                        Copiar Enlace
                    </button>
</div>
<span className="absolute -bottom-8 -right-8 material-symbols-outlined text-[120px] opacity-10 text-white" style={{fontVariationSettings: "'FILL' 1"}}>share</span>
</section>
</aside>
</div>

<footer className="bg-[#131317] w-full py-12 flex flex-col items-center justify-center space-y-4">
<div className="flex gap-6">
<a className="text-gray-500 hover:text-white transition-colors font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-widest" href="#">Terms</a>
<a className="text-gray-500 hover:text-white transition-colors font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-widest" href="#">Privacy</a>
<a className="text-gray-500 hover:text-white transition-colors font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-widest" href="#">Support</a>
</div>
<p className="text-gray-500 font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-widest">© 2024 Prode Arena. The Stadium is Yours.</p>
</footer>

    </>
  );
}
