export default function DashboardPage() {
    return (
        <div className="container-fluid p-0">
            <h1 className="h3 fw-semibold">Dashboard</h1>
            <div className="row g-3 mt-1">
                <div className="col-md-4">
                    <div className="card shadow-sm">
                        <div className="card-body">
                            <div className="text-body-secondary small">Clients (active)</div>
                            <div className="display-6 fw-bold">0</div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card shadow-sm">
                        <div className="card-body">
                            <div className="text-body-secondary small">Today’s Follow-ups</div>
                            <div className="display-6 fw-bold">0</div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card shadow-sm">
                        <div className="card-body">
                            <div className="text-body-secondary small">Docs Pending</div>
                            <div className="display-6 fw-bold">0</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}