import { Link } from '@tanstack/react-router'

export default function Header() {
    return (
        <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
                <Link to="/" className="text-lg font-semibold tracking-tight">
                    Jemari
                </Link>
                <nav className="flex items-center gap-4 text-sm">
                    <Link to="/" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 [&.active]:font-semibold [&.active]:text-neutral-900">
                        Home
                    </Link>
                    <Link to="/demo" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 [&.active]:font-semibold [&.active]:text-neutral-900">
                        Demo
                    </Link>
                </nav>
            </div>
        </header>
    )
}
