import { auth } from '@/lib/auth'
import { TokenManager } from '@/components/dashboard/token-manager'

export default async function SettingsPage() {
  const session = await auth()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600">
                    Manage your account settings and API access
                </p>
            </div>

            <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">API Tokens</h2>
                    <p className="text-sm text-gray-600">
                        Create personal access tokens for the Chrome extension and API access
                    </p>
                </div>

                <div className="p-6">
                    <TokenManager />
                </div>
            </div>

            <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Chrome Extension</h2>
                    <p className="text-sm text-gray-600">
                        Instructions for setting up the Chrome extension
                    </p>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <h3 className="font-medium text-gray-900 mb-2">Installation Steps:</h3>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                            <li>Download the Chrome extension from the repository</li>
                            <li>Open Chrome and go to chrome://extensions/</li>
                            <li>Enable "Developer mode" in the top right</li>
                            <li>Click "Load unpacked" and select the extension folder</li>
                            <li>Create an API token above and configure it in the extension</li>
                        </ol>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-md">
                        <p className="text-sm text-blue-800">
                            <strong>Tip:</strong> Once installed, the extension will automatically detect Facebook ads
                            and show a "Save Ad" button on sponsored posts.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Account Information</h2>
                </div>

                <div className="p-6">
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Email</dt>
                            <dd className="mt-1 text-sm text-gray-900">{session?.user?.email}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Name</dt>
                            <dd className="mt-1 text-sm text-gray-900">{session?.user?.name || 'Not set'}</dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    )
}