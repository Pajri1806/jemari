import { useEffect, type ReactNode } from 'react'

export default function LenisSmoothScrollProvider({ children }: { children?: ReactNode }) {
    useEffect(() => {
        // Lenis smooth scroll is optional — skip if not installed
        let lenis: { raf: (time: number) => void; destroy: () => void } | null = null

        // Dynamically try to use lenis if available
        try {
            // @ts-ignore
            import('lenis').then((mod) => {
                const Lenis = mod.default
                lenis = new Lenis({
                    duration: 0.8,
                    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                })

                function raf(time: number) {
                    lenis?.raf(time)
                    requestAnimationFrame(raf)
                }

                requestAnimationFrame(raf)
            })
        } catch {
            // Lenis not available — normal scroll
        }

        return () => {
            lenis?.destroy()
        }
    }, [])

    return <>{children}</>
}
