
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Page() {
  return (
    <>
      

<div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary-container/10 rounded-full blur-[120px]"></div>
<div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-container/5 rounded-full blur-[120px]"></div>

<main className="w-full max-w-[420px] z-10">
<div className="flex flex-col items-center mb-8">
<div className="flex items-center gap-2 mb-2">
<span className="material-symbols-outlined text-primary-container text-4xl" style={{fontVariationSettings: "'FILL' 1"}}>sports_score</span>
<h1 className="font-headline font-black text-3xl italic tracking-tighter text-primary-container">PRODE ARENA</h1>
</div>
<p className="text-on-surface-variant text-sm font-medium tracking-wide uppercase">The Stadium is Yours</p>
</div>
<div className="glass-panel border border-outline-variant/10 rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.4)] overflow-hidden">

<div className="flex bg-surface-container-low/50 border-b border-outline-variant/10">
<button className="flex-1 py-4 text-sm font-bold border-b-2 border-primary-container text-primary-container transition-colors">
                    Iniciar sesión
                </button>
<button className="flex-1 py-4 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors">
                    Registrarse
                </button>
</div>
<div className="p-8">

<form className="space-y-5">
<div className="space-y-2">
<label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Email</label>
<div className="relative">
<input className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container/30 transition-all" placeholder="nombre@ejemplo.com" type="email"/>
</div>
</div>
<div className="space-y-2">
<div className="flex justify-between items-center ml-1">
<label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">Contraseña</label>
</div>
<div className="relative">
<input className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container/30 transition-all" placeholder="••••••••" type="password"/>
<button className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors" type="button">
<span className="material-symbols-outlined text-[20px]">visibility</span>
</button>
</div>
</div>
<div className="flex justify-end">
<a className="text-xs font-bold text-primary-container/80 hover:text-primary-container transition-colors" href="#">¿Olvidaste tu contraseña?</a>
</div>

<div className="hidden flex items-center gap-2 text-error text-xs font-medium bg-error-container/10 p-3 rounded-lg border border-error/20">
<span className="material-symbols-outlined text-[16px]">error</span>
<span>Credenciales incorrectas. Por favor, intenta de nuevo.</span>
</div>
<button className="w-full neon-gradient text-on-primary font-black py-4 rounded-xl shadow-[0_8px_20px_rgba(181,242,61,0.2)] hover:shadow-[0_12px_24px_rgba(181,242,61,0.3)] hover:-translate-y-0.5 active:scale-95 transition-all duration-200 uppercase tracking-tight" type="submit">
                        Ingresar
                    </button>
<div className="relative py-4 flex items-center">
<div className="flex-grow border-t border-outline-variant/10"></div>
<span className="flex-shrink mx-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">o continuá con</span>
<div className="flex-grow border-t border-outline-variant/10"></div>
</div>
<div className="grid grid-cols-2 gap-4">
<button className="flex items-center justify-center gap-3 bg-surface-container-low border border-outline-variant/10 py-3 rounded-xl hover:bg-surface-container-high transition-colors active:scale-95" type="button">
<img alt="Google" className="w-5 h-5" data-alt="minimalist google icon logo colorful on transparent background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVzT_Hqb3zNH_kIqgabNtqriHHKRxkqDGQk1rtlyLXa5vkSPtxo-aJ_LS_c4WTFyoeuGmdih-7rz-odJlZVXwOIbR5GqMGzR01IdtBsnC4b992h_qH0mGXOnwHZ3uaOkDFlOywIF_7g00U5hUKKnosRcxTdq1-XT2MyOZckXJYsAHeJEU3MFxvQ_RDXcQHOAeT8Aapm8DQfyK66yegUVA1rZAZBSOo4zT30Gh0iiEj_lDXKawb97TklLeK7vhxkKHOu2nqtldOww"/>
<span className="text-sm font-bold">Google</span>
</button>
<button className="flex items-center justify-center gap-3 bg-surface-container-low border border-outline-variant/10 py-3 rounded-xl hover:bg-surface-container-high transition-colors active:scale-95" type="button">
<svg className="w-5 h-5 fill-on-surface" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.041-1.416-4.041-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path></svg>
<span className="text-sm font-bold">GitHub</span>
</button>
</div>
</form>

<div className="mt-8 text-center space-y-4">
<p className="text-xs text-on-surface-variant font-medium">
                        ¿No tienes una cuenta? <a className="text-primary-container font-bold hover:underline" href="#">Regístrate ahora</a>
</p>
<div className="flex justify-center items-center gap-6">
<a className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest hover:text-on-surface-variant transition-colors" href="#">Términos</a>
<a className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest hover:text-on-surface-variant transition-colors" href="#">Privacidad</a>
<a className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest hover:text-on-surface-variant transition-colors" href="#">Soporte</a>
</div>
</div>
</div>
</div>

<p className="text-center mt-8 text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-[0.3em]">
            © 2024 Prode Arena. All Rights Reserved.
        </p>
</main>




    </>
  );
}
