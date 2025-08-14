import Link from 'next/link'

interface AuthErrorPageProps {
    searchParams: {
        error?: string
    }
}

export default function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
    const { error } = searchParams

    const getErrorMessage = (error: string | undefined) => {
        switch (error) {
            case 'Verification':
                return {
                    title: 'Verification Failed',
                    message: 'The magic link has expired or has already been used. Please request a new one.',
                }
            case 'Configuration':
                return {
                    title: 'Configuration Error',
                    message: 'There is a problem with the server configuration.',
                }
            case 'AccessDenied':
                return {
                    title: 'Access Denied',
                    message: 'You do not have permission to sign in.',
                }
            default:
                return {
                    title: 'Authentication Error',
                    message: 'An error occurred during authentication. Please try again.',
                }
        }
    }

    const errorInfo = getErrorMessage(error)

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        {errorInfo.title}
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        {errorInfo.message}
                    </p>
                </div>
                <div className="rounded-md bg-red-50 p-4">
                    <div className="text-center">
                        <p className="text-sm text-red-700">
                            Error code: {error || 'Unknown'}
                        </p>
                    </div>
                </div>
                <div className="text-center">
                    <Link
                        href="/auth/signin"
                        className="font-medium text-blue-600 hover:text-blue-500"
                    >
                        Try signing in again
                    </Link>
                </div>
            </div>
        </div>
    )
}
