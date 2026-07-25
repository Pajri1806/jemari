import { Card } from '@heroui/react'
import { FileQuestion } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export default function NotFoundPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-950">
            <Card className="p-8 max-w-md text-center space-y-4">
                <FileQuestion className="mx-auto size-12 text-neutral-400" />
                <h2 className="text-lg font-semibold">Page not found</h2>
                <p className="text-sm text-neutral-500">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <Link
                    to="/"
                    className="inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                    Go home
                </Link>
            </Card>
        </div>
    )
}
