import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg bg-body-tertiary border-bottom">
        <div className="container">
          <Link className="navbar-brand fw-semibold" href="/">Corevai-CRM</Link>
          <div className="ms-auto">
            <Link href="/login" className="btn btn-outline-primary">Login</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-5 bg-light">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-7">
              <h1 className="display-5 fw-bold">Client Onboarding Automation</h1>
              <p className="lead text-body-secondary mt-3">
                Centralize emails, automate follow-ups and document reminders, and monitor eVirtualPay with Virtual Tracker.
              </p>
              <div className="mt-4 d-flex gap-2">
                <Link href="/login" className="btn btn-primary btn-lg">Get Started</Link>
                <Link href="/login" className="btn btn-outline-secondary btn-lg">Live Demo</Link>
              </div>
            </div>
            <div className="col-lg-5 mt-4 mt-lg-0">
              <div className="card shadow-sm">
                <img
                  alt="Corevai dashboard preview"
                  className="card-img-top"
                  src="https://images.unsplash.com/photo-1556157382-97eda2d62296?q=80&w=1200&auto=format&fit=crop"
                />
                <div className="card-body">
                  <p className="card-text text-muted mb-0">
                    Virtual Tracker: multi-account eVirtualPay health at a glance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="row row-cols-1 row-cols-md-3 g-4 mt-2">
            <div className="col">
              <div className="card h-100 border-0">
                <div className="card-body">
                  <h5 className="card-title">Email Automation</h5>
                  <p className="card-text text-body-secondary">48h / 5d / 10d / 15d follow-ups, auto-classified communications.</p>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card h-100 border-0">
                <div className="card-body">
                  <h5 className="card-title">Docs & Tasks</h5>
                  <p className="card-text text-body-secondary">12-hour reminders until submitted; Notion & Calendar sync.</p>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card h-100 border-0">
                <div className="card-body">
                  <h5 className="card-title">Virtual Tracker</h5>
                  <p className="card-text text-body-secondary">Multi-account eVirtualPay check with daily 9:00 AM digest.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}