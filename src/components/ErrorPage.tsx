import { Card } from '@heroui/react'
import { AlertTriangle } from 'lucide-react'

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-950">
            <Card className="p-8 max-w-md text-center space-y-4">
                <AlertTriangle className="mx-auto size-12 text-amber-500" />
                <h2 className="text-lg font-semibold">Something went wrong</h2>
                <p className="text-sm text-neutral-500">{error.message || 'An unexpected error occurred.'}</p>
                <button
                    onClick={reset}
                    className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                    Try again
                </button>
            </Card>
        </div>
    )
}
