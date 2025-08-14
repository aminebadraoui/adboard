export function StatsCards() {
    const stats = [
        {
            name: 'Total Ads',
            value: '0',
            description: 'Saved ads in your collection',
        },
        {
            name: 'Boards',
            value: '1',
            description: 'Organized collections',
        },
        {
            name: 'This Month',
            value: '0',
            description: 'New ads added',
        },
        {
            name: 'Top Brand',
            value: '-',
            description: 'Most saved advertiser',
        },
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
                <div
                    key={stat.name}
                    className="bg-white overflow-hidden shadow rounded-lg border border-gray-200"
                >
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="text-2xl font-bold text-gray-900">
                                    {stat.value}
                                </div>
                            </div>
                        </div>
                        <div className="mt-1">
                            <p className="text-sm font-medium text-gray-900">{stat.name}</p>
                            <p className="text-sm text-gray-500">{stat.description}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}