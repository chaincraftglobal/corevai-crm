import Link from "next/link";
import { requireAuth } from "@/lib/auth-guard";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    await requireAuth();

    return (
        <div className="container-fluid">
            <div className="row min-vh-100">
                {/* Sidebar */}
                <aside className="col-12 col-md-3 col-lg-2 border-end py-4">
                    <div className="px-3 mb-3">
                        <div className="h5 mb-0">Corevai-CRM</div>
                        <small className="text-body-secondary">Admin</small>
                    </div>

                    <ul className="nav flex-column px-2">
                        <li className="nav-item">
                            <Link className="nav-link" href="/dashboard">Dashboard</Link>
                        </li>
                        <li className="nav-item mt-2 text-uppercase text-muted small px-2">Modules</li>
                        <li className="nav-item">
                            <Link className="nav-link" href="/virtual-tracker">Virtual Tracker</Link>
                        </li>
                    </ul>

                    <form action="/api/logout" method="post" className="px-3 mt-4">
                        <button className="btn btn-outline-secondary w-100" type="submit">Logout</button>
                    </form>
                </aside>

                {/* Main */}
                <main className="col-12 col-md-9 col-lg-10 p-4">
                    {children}
                </main>
            </div>
        </div>
    );
}