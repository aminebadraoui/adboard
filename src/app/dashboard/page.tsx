import { auth } from '@/lib/auth'
import { AddAdDialog } from '@/components/dashboard/add-ad-dialog'
import { AdGrid } from '@/components/dashboard/ad-grid'
import { StatsCards } from '@/components/dashboard/stats-cards'

export default async function DashboardPage() {
  const session = await auth()

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Welcome back, {session?.user?.name?.split(' ')[0] || 'there'}!
                    </h1>
                    <p className="text-gray-600">
                        Here's what's happening with your ad collection
                    </p>
                </div>
                <AddAdDialog />
            </div>

            {/* Stats */}
            <StatsCards />

            {/* Recent Ads */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Ads</h2>
                    <a href="/dashboard/ads" className="text-sm text-blue-600 hover:text-blue-700">
                        View all
                    </a>
                </div>
                <AdGrid limit={8} />
            </div>
        </div>
    )
}