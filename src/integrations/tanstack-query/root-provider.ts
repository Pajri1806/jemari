import { QueryClient } from '@tanstack/react-query'

let _queryClient: QueryClient | null = null

export function getQueryClient() {
    if (!_queryClient) {
        _queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    staleTime: 30 * 1000,
                },
            },
        })
    }
    return _queryClient
}

export function getContext() {
    const queryClient = getQueryClient()
    return { queryClient }
}
