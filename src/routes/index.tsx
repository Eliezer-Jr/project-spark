import { createFileRoute, Link } from "@tanstack/react-router";
import { Wrench, Users, Calendar, Star, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">A</div>
            <span className="text-lg font-bold text-foreground">ArtisanCRM</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get Started <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <div className="inline-flex items-center rounded-full border bg-secondary px-4 py-1.5 text-sm font-medium text-secondary-foreground mb-6">
          <Wrench className="mr-2 h-4 w-4" /> Built for Local Service Providers
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Manage Your Artisan<br />Business with Ease
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          The all-in-one CRM for plumbers, electricians, tailors, and skilled artisans.
          Track customers, schedule appointments, log services, and collect feedback — all in one place.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link to="/signup">
            <Button size="lg" className="text-base px-8">
              Start Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg" className="text-base px-8">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-secondary/30 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-foreground mb-12">Everything You Need</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Users, title: "Customer Management", desc: "Add, edit, and organize your customer database with ease." },
              { icon: Calendar, title: "Appointment Scheduling", desc: "Book and manage appointments with a simple calendar view." },
              { icon: Wrench, title: "Service Records", desc: "Log every job performed, track history, and categorize services." },
              { icon: Star, title: "Feedback & Ratings", desc: "Collect customer feedback and improve your service quality." },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-card-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-foreground mb-12">Built for Everyone</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Wrench, title: "Artisans", desc: "Manage customers, schedule work, track services, and grow your business.", color: "bg-primary/10 text-primary" },
              { icon: Users, title: "Customers", desc: "Browse artisans, book appointments, track service history, and leave reviews.", color: "bg-accent/10 text-accent" },
              { icon: Shield, title: "Administrators", desc: "Oversee the platform, manage users, view analytics, and ensure quality.", color: "bg-chart-3/10 text-chart-3" },
            ].map((r) => (
              <div key={r.title} className="rounded-xl border bg-card p-8 shadow-sm text-center">
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${r.color}`}>
                  <r.icon className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-card-foreground">{r.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ArtisanCRM. Built for local service providers.</p>
        </div>
      </footer>
    </div>
  );
}
