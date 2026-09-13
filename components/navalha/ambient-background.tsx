/**
 * Camada cinematográfica atrás de toda a página (seção "background cinemático"
 * do redesign editorial): halos de luz, um círculo cortado pela borda e uma
 * linha fina, todos com `position: fixed` — então rolam "parados" sob o
 * conteúdo (paralaxe grátis, sem JS/scroll listener) e nunca disputam
 * atenção com texto real. Puramente decorativo: `aria-hidden` +
 * `pointer-events-none`, e só `transform`/`opacity` animam (sem custo de
 * layout), com `prefers-reduced-motion` já neutralizado globalmente.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Halo bronze, canto superior direito — ultrapassa a viewport de propósito. */}
      <div
        className="animate-drift absolute -top-56 -right-40 size-[34rem] rounded-full opacity-70"
        style={{ background: 'radial-gradient(circle, color-mix(in oklch, var(--primary) 18%, transparent) 0%, transparent 70%)' }}
      />
      {/* Halo carvão, canto inferior esquerdo — mais discreto, quase preto. */}
      <div
        className="animate-drift-reverse absolute -bottom-64 -left-48 size-[38rem] rounded-full opacity-60"
        style={{ background: 'radial-gradient(circle, color-mix(in oklch, var(--foreground) 6%, transparent) 0%, transparent 70%)' }}
      />
      {/* Círculo fino, cortado pela borda direita, no meio da página. */}
      <div className="animate-glow absolute top-[38%] -right-24 size-80 rounded-full border border-primary/15" />
      {/* Linha fina na diagonal, só sugerida — não decorativa demais. */}
      <div className="absolute left-1/4 top-[62%] h-px w-[40vw] rotate-[-8deg] bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  )
}
