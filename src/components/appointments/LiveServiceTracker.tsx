import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { db, type TrackingParty } from "@/lib/app-db";
import type { Database } from "@/types/database";
import {
  CheckCircle2,
  Clock3,
  LocateFixed,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Route,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
type Tracking = {
  appointmentId: string;
  journeyStatus: "not_started" | "en_route" | "arrived";
  artisan: TrackingParty;
  customer: TrackingParty | null;
};

type RouteStep = {
  instruction: string;
  distance: number;
};

type InMapRoute = {
  coordinates: Array<[number, number]>;
  distance: number;
  duration: number;
  steps: RouteStep[];
};

function distanceKm(a: TrackingParty | null, b: TrackingParty | null) {
  if (a?.latitude == null || a.longitude == null || b?.latitude == null || b.longitude == null)
    return null;
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function formatStep(type: string, modifier: string | undefined, road: string) {
  if (type === "depart") return `Start${road ? ` on ${road}` : ""}`;
  if (type === "arrive") return "Arrive at the destination";
  if (type === "roundabout") return `Enter the roundabout${road ? ` toward ${road}` : ""}`;
  const action = modifier ? `${type} ${modifier}` : type;
  return `${action.charAt(0).toUpperCase()}${action.slice(1)}${road ? ` onto ${road}` : ""}`;
}

function formatRouteDistance(metres: number) {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}

export function LiveServiceTracker({
  appointment,
  role,
}: {
  appointment: Appointment;
  role: "artisan" | "customer";
}) {
  const [open, setOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [busy, setBusy] = useState(false);
  const [routeData, setRouteData] = useState<InMapRoute | null>(null);
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);
  const rawId = useId();
  const mapId = `service-map-${rawId.replace(/:/g, "")}`;

  const load = useCallback(async () => {
    try {
      setTracking(await db.getAppointmentTracking(appointment.id));
    } catch (error) {
      if (open)
        toast.error(error instanceof Error ? error.message : "Could not load live tracking.");
    }
  }, [appointment.id, open]);

  useEffect(() => {
    if (!open) return;
    void load();
    const interval = window.setInterval(() => void load(), 12_000);
    return () => window.clearInterval(interval);
  }, [load, open]);

  useEffect(
    () => () => {
      if (watchRef.current != null) navigator.geolocation?.clearWatch(watchRef.current);
    },
    [],
  );

  const self = role === "artisan" ? (tracking?.artisan ?? null) : (tracking?.customer ?? null);
  const other = role === "artisan" ? (tracking?.customer ?? null) : (tracking?.artisan ?? null);
  const tripDistance = useMemo(
    () => distanceKm(tracking?.artisan ?? null, tracking?.customer ?? null),
    [tracking],
  );
  const etaMinutes = routeData
    ? Math.max(1, Math.round(routeData.duration / 60))
    : tripDistance == null
      ? null
      : Math.max(1, Math.round((tripDistance / 28) * 60));
  const canTrack = appointment.status === "pending" || appointment.status === "confirmed";

  useEffect(() => {
    if (!open || !tracking) return;
    let disposed = false;
    let map: import("leaflet").Map | null = null;
    void import("leaflet").then((module) => {
      if (disposed) return;
      const L = module.default;
      const points = [tracking.artisan, tracking.customer].filter(
        (party): party is TrackingParty => party?.latitude != null && party.longitude != null,
      );
      const fallback: [number, number] = [5.6037, -0.187];
      map = L.map(mapId, { zoomControl: false, attributionControl: false }).setView(
        points.length ? [points[0].latitude!, points[0].longitude!] : fallback,
        points.length ? 14 : 11,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      points.forEach((party) => {
        const isArtisan = party.id === tracking.artisan.id;
        L.marker([party.latitude!, party.longitude!], {
          icon: L.divIcon({
            className: "",
            html: `<div class="service-map-marker ${isArtisan ? "service-map-marker--artisan" : "service-map-marker--customer"}">${isArtisan ? "A" : "C"}</div>`,
            iconSize: [42, 42],
            iconAnchor: [21, 21],
          }),
        }).addTo(map!);
      });
      if (routeData?.coordinates.length) {
        const line = L.polyline(routeData.coordinates, {
          color: "#15803d",
          weight: 6,
          opacity: 0.9,
        }).addTo(map);
        map.fitBounds(line.getBounds(), { padding: [48, 48], maxZoom: 16 });
      } else if (points.length === 2) {
        const line = L.polyline(
          points.map((party) => [party.latitude!, party.longitude!]),
          {
            color: "#15803d",
            weight: 5,
            opacity: 0.8,
            dashArray: "10 8",
          },
        ).addTo(map);
        map.fitBounds(line.getBounds(), { padding: [48, 48], maxZoom: 15 });
      }
      window.setTimeout(() => map?.invalidateSize(), 80);
    });
    return () => {
      disposed = true;
      map?.remove();
    };
  }, [mapId, open, routeData, tracking]);

  const loadDirections = async (force = false) => {
    if (
      self?.latitude == null ||
      self.longitude == null ||
      other?.latitude == null ||
      other.longitude == null
    )
      return;

    if (directionsOpen && !force) {
      setDirectionsOpen(false);
      return;
    }

    setDirectionsOpen(true);
    if (routeData) return;
    setRouteLoading(true);
    setRouteError(null);
    try {
      const coordinates = `${self.longitude},${self.latitude};${other.longitude},${other.latitude}`;
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true`,
      );
      if (!response.ok) throw new Error("Road directions are temporarily unavailable.");
      const payload = (await response.json()) as {
        routes?: Array<{
          distance: number;
          duration: number;
          geometry: { coordinates: Array<[number, number]> };
          legs: Array<{
            steps: Array<{
              distance: number;
              name: string;
              maneuver: { type: string; modifier?: string };
            }>;
          }>;
        }>;
      };
      const route = payload.routes?.[0];
      if (!route) throw new Error("No drivable route was found between these locations.");
      setRouteData({
        distance: route.distance,
        duration: route.duration,
        coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        steps: (route.legs[0]?.steps || []).map((step) => ({
          distance: step.distance,
          instruction: formatStep(step.maneuver.type, step.maneuver.modifier, step.name),
        })),
      });
    } catch (error) {
      setRouteError(error instanceof Error ? error.message : "Could not load road directions.");
    } finally {
      setRouteLoading(false);
    }
  };

  const beginSharing = async () => {
    if (!navigator.geolocation) {
      toast.error("Location is not supported on this device.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await db.updateMyLocation(
            position.coords.latitude,
            position.coords.longitude,
            new Date(position.timestamp).toISOString(),
          );
          await db.updateAppointment(
            appointment.id,
            role === "artisan"
              ? { artisan_location_sharing: true, journey_status: "en_route" }
              : { customer_location_sharing: true },
          );
          watchRef.current = navigator.geolocation.watchPosition(
            (next) => {
              void db.updateMyLocation(
                next.coords.latitude,
                next.coords.longitude,
                new Date(next.timestamp).toISOString(),
              );
            },
            undefined,
            { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
          );
          setConsentOpen(false);
          toast.success(
            role === "artisan"
              ? "Journey started — your customer can follow your arrival."
              : "Location shared for this service only.",
          );
          await load();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Could not start location sharing.");
        } finally {
          setBusy(false);
        }
      },
      (error) => {
        setBusy(false);
        toast.error(
          error.code === 1
            ? "Allow precise location to use live tracking."
            : "Could not get your location. Try again outdoors.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
    );
  };

  const stopSharing = async () => {
    setBusy(true);
    try {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
      await db.updateAppointment(
        appointment.id,
        role === "artisan"
          ? { artisan_location_sharing: false }
          : { customer_location_sharing: false },
      );
      await load();
      toast.success("Live location sharing stopped.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not stop sharing.");
    } finally {
      setBusy(false);
    }
  };

  const markArrived = async () => {
    setBusy(true);
    try {
      await db.updateAppointment(appointment.id, { journey_status: "arrived" });
      await load();
      toast.success("Customer notified that you have arrived.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update arrival.");
    } finally {
      setBusy(false);
    }
  };

  if (!canTrack) return null;
  const canShowDirections =
    self?.latitude != null &&
    self.longitude != null &&
    other?.latitude != null &&
    other.longitude != null;
  const statusTitle =
    tracking?.journeyStatus === "arrived"
      ? role === "artisan"
        ? "You’ve arrived"
        : "Your artisan has arrived"
      : tracking?.journeyStatus === "en_route"
        ? etaMinutes
          ? `${etaMinutes} min${etaMinutes === 1 ? "" : "s"} away`
          : "Heading your way…"
        : role === "artisan"
          ? "Ready for this service?"
          : "Service visit confirmed";

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-primary/30 text-primary"
        onClick={() => setOpen(true)}
      >
        <Navigation className="h-4 w-4" />{" "}
        {role === "artisan" ? "Trip & directions" : "Track service"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:h-[min(820px,92vh)] sm:max-w-md sm:rounded-[2rem] sm:border">
          <div className="z-10 flex items-start justify-between bg-background px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> Live service
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">{statusTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {tracking?.journeyStatus === "en_route" && etaMinutes
                  ? `About ${tripDistance?.toFixed(1)} km remaining`
                  : appointment.title}
              </p>
            </div>
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="relative min-h-0 flex-1 bg-muted">
            <div id={mapId} className="h-full min-h-[320px] w-full" />
            {!tracking?.artisan.sharing && !tracking?.customer?.sharing && (
              <div className="absolute inset-x-5 top-5 z-[500] rounded-2xl border bg-background/95 p-4 shadow-lg backdrop-blur">
                <div className="flex gap-3">
                  <LocateFixed className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">Map unlocks when someone shares</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Only participants in this appointment can see shared positions.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative z-[600] -mt-5 rounded-t-[1.75rem] bg-background px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.12)]">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <div className="flex items-center gap-3">
              <ProfileAvatar
                src={other?.avatarUrl}
                name={other?.fullName || (role === "artisan" ? "Customer" : "Artisan")}
                className="h-12 w-12"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {other?.fullName || (role === "artisan" ? "Your customer" : "Your artisan")}
                </p>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {other?.sharing ? "Live location available" : "Location not shared"}
                </p>
              </div>
              {other?.phone && (
                <Button asChild variant="secondary" size="icon" className="rounded-full">
                  <a href={`tel:${other.phone}`} aria-label="Call">
                    <Phone className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {other?.phone && (
                <Button asChild variant="secondary" size="icon" className="rounded-full">
                  <a href={`sms:${other.phone}`} aria-label="Message">
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {canShowDirections && (
                <Button
                  variant={directionsOpen ? "secondary" : "outline"}
                  className="gap-2"
                  disabled={routeLoading}
                  onClick={() => void loadDirections()}
                >
                  <Route className="h-4 w-4" />
                  {routeLoading ? "Routing..." : directionsOpen ? "Hide directions" : "Directions"}
                </Button>
              )}
              {self?.sharing ? (
                <Button variant="outline" className="gap-2" disabled={busy} onClick={stopSharing}>
                  <ShieldCheck className="h-4 w-4" /> Stop sharing
                </Button>
              ) : (
                <Button
                  className={canShowDirections ? "" : "col-span-2"}
                  disabled={busy}
                  onClick={() => setConsentOpen(true)}
                >
                  <LocateFixed className="mr-2 h-4 w-4" />
                  {role === "artisan" ? "Start trip" : "Share location"}
                </Button>
              )}
            </div>
            {directionsOpen && (
              <div className="mt-3 rounded-xl border bg-muted/40 p-3">
                {routeLoading ? (
                  <p className="text-sm text-muted-foreground">Finding the best road route…</p>
                ) : routeError ? (
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-destructive">{routeError}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRouteData(null);
                        void loadDirections(true);
                      }}
                    >
                      Retry
                    </Button>
                  </div>
                ) : routeData ? (
                  <>
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span>{Math.max(1, Math.round(routeData.duration / 60))} min drive</span>
                      <span>{formatRouteDistance(routeData.distance)}</span>
                    </div>
                    <div className="mt-2 max-h-28 space-y-2 overflow-y-auto pr-1">
                      {routeData.steps.map((step, index) => (
                        <div key={`${step.instruction}-${index}`} className="flex gap-2 text-xs">
                          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">
                            {index + 1}
                          </span>
                          <span className="flex-1 text-foreground">{step.instruction}</span>
                          <span className="text-muted-foreground">
                            {formatRouteDistance(step.distance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            )}
            {role === "artisan" && tracking?.journeyStatus === "en_route" && (
              <Button className="mt-2 w-full gap-2" disabled={busy} onClick={markArrived}>
                <CheckCircle2 className="h-4 w-4" /> I’ve arrived
              </Button>
            )}
            {tracking?.journeyStatus === "arrived" && (
              <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary/10 p-3 text-sm font-medium text-primary">
                <CheckCircle2 className="h-4 w-4" /> Arrival confirmed
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent className="top-auto bottom-0 translate-y-0 gap-0 rounded-b-none rounded-t-[1.75rem] p-0 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 sm:rounded-2xl">
          <DialogHeader className="border-b p-6 text-left">
            <DialogTitle>Share live location?</DialogTitle>
            <DialogDescription className="sr-only">Location sharing consent</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-6">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
              <p className="text-sm leading-6 text-muted-foreground">
                Your precise location is shared only with{" "}
                {role === "artisan" ? "this customer" : "this artisan"} for this appointment. You
                can stop at any time.
              </p>
            </div>
            <div className="flex gap-3">
              <Clock3 className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
              <p className="text-sm leading-6 text-muted-foreground">
                Sharing is appointment-specific and is never started silently in the background.
              </p>
            </div>
            <Button className="w-full" disabled={busy} onClick={beginSharing}>
              {busy
                ? "Getting precise location…"
                : role === "artisan"
                  ? "Start journey & share"
                  : "Share for this service"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setConsentOpen(false)}>
              Not now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
