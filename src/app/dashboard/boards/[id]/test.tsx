export default function TestBoardPage({ params }: { params: { id: string } }) {
    return (
        <div>
            <h1>Board ID: {params.id}</h1>
            <p>This is a test board page</p>
        </div>
    )
}
