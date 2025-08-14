import Link from 'next/link'

export default function VerifyRequestPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Check your email
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        A sign-in link has been sent to your email address.
                    </p>
                </div>
                <div className="rounded-md bg-blue-50 p-4">
                    <div className="text-center">
                        <svg
                            className="mx-auto h-12 w-12 text-blue-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                        </svg>
                        <p className="mt-2 text-sm text-blue-700">
                            Click the link in your email to sign in to your account.
                        </p>
                        <p className="mt-1 text-xs text-blue-600">
                            The link will expire in 24 hours.
                        </p>
                    </div>
                </div>
                <div className="text-center">
                    <Link
                        href="/auth/signin"
                        className="font-medium text-blue-600 hover:text-blue-500"
                    >
                        Back to sign in
                    </Link>
                </div>
            </div>
        </div>
    )
}
