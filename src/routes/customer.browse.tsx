import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/app-db";
import { useEffect, useId, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateLabel } from "@/lib/crm-helpers";
import {
  Search,
  MapPin,
  Star,
  Wrench,
  BriefcaseBusiness,
  Navigation,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/types/database";
import "leaflet/dist/leaflet.css";

const DEFAULT_SEARCH_RADIUS_KM = 5;
const SEARCH_RADIUS_OPTIONS_KM = [1, 5, 10, 25, 50];
const GEOCODE_CACHE_KEY = "artisancrm.geocode-cache.v1";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];
type ServiceCategory = Database["public"]["Tables"]["service_categories"]["Row"];
type Feedback = Database["public"]["Tables"]["feedback"]["Row"];
type ServiceRecord = Database["public"]["Tables"]["service_records"]["Row"];
type Appointment = Database["public"]["Tables"]["appointments"]["Row"];

type Coordinates = {
  lat: number;
  lng: number;
};

type ArtisanWithDistance = Profile & {
  coordinates: Coordinates | null;
  distanceKm: number | null;
};

type CoordinateLookup = Record<string, Coordinates>;

const LOCATION_COORDINATES: Record<string, Coordinates> = {
  accra: { lat: 5.560014, lng: -0.205744 },
  "east legon": { lat: 5.6506, lng: -0.1539 },
  madina: { lat: 5.6826, lng: -0.1645 },
  legon: { lat: 5.6508, lng: -0.187 },
  tema: { lat: 5.6698, lng: -0.0166 },
  kasoa: { lat: 5.5345, lng: -0.4168 },
  adenta: { lat: 5.7043, lng: -0.1675 },
  kumasi: { lat: 6.6885, lng: -1.6244 },
  takoradi: { lat: 4.9042, lng: -1.7596 },
  cape: { lat: 5.1053, lng: -1.2466 },
  tamale: { lat: 9.4075, lng: -0.8533 },
};

function normalizeLocation(location?: string | null) {
  return location?.trim().toLowerCase() ?? "";
}

function resolveFallbackLocationCoordinates(location?: string | null): Coordinates | null {
  const normalized = location?.trim().toLowerCase();
  if (!normalized) return null;

  const match = Object.entries(LOCATION_COORDINATES).find(([name]) => normalized.includes(name));
  return match?.[1] ?? null;
}

function resolveLocationCoordinates(
  location: string | null | undefined,
  geocoded: CoordinateLookup,
) {
  const normalized = normalizeLocation(location);
  if (!normalized) return null;

  return geocoded[normalized] ?? resolveFallbackLocationCoordinates(location);
}

function resolveArtisanCoordinates(artisan: Profile, geocoded: CoordinateLookup) {
  if (
    Number.isFinite(artisan.last_latitude) &&
    Number.isFinite(artisan.last_longitude)
  ) {
    return {
      lat: artisan.last_latitude as number,
      lng: artisan.last_longitude as number,
    };
  }

  return resolveLocationCoordinates(artisan.location, geocoded);
}

function readGeocodeCache(): CoordinateLookup {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(window.localStorage.getItem(GEOCODE_CACHE_KEY) ?? "{}") as CoordinateLookup;
  } catch {
    return {};
  }
}

function saveGeocodeCache(cache: CoordinateLookup) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
}

async function geocodeLocation(location: string): Promise<Coordinates | null> {
  const query = location.toLowerCase().includes("ghana") ? location : `${location}, Ghana`;
  const params = new URLSearchParams({
    format: "jsonv2",
    limit: "1",
    addressdetails: "1",
    countrycodes: "gh",
    q: query,
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) return null;

  const [result] = (await response.json()) as Array<{ lat?: string; lon?: string }>;
  const lat = Number(result?.lat);
  const lng = Number(result?.lon);

  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function distanceBetweenKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const latDelta = ((to.lat - from.lat) * Math.PI) / 180;
  const lngDelta = ((to.lng - from.lng) * Math.PI) / 180;
  const fromLat = (from.lat * Math.PI) / 180;
  const toLat = (to.lat * Math.PI) / 180;

  const haversine =
    Math.sin(latDelta / 2) ** 2 + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

const artisanToolMarkerHtml =
  '<div class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-accent text-accent-foreground shadow-md">' +
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-5.8 5.8a2.1 2.1 0 0 0 3 3l5.8-5.8a4 4 0 0 0 5.4-5.4l-2.7 2.7-3-3 2.7-2.7Z"/>' +
  "</svg></div>";

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getArtisanMarkerHtml(artisan: Profile) {
  if (!artisan.avatar_url) return artisanToolMarkerHtml;

  return `<div class="h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-background shadow-md"><img src="${escapeAttribute(
    artisan.avatar_url,
  )}" alt="${escapeAttribute(
    artisan.full_name,
  )} profile image" class="h-full w-full object-cover" /></div>`;
}

export const Route = createFileRoute("/customer/browse")({
  component: () => (
    <ProtectedRoute allowedRoles={["customer"]}>
      <DashboardLayout>
        <BrowseContent />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function BrowseContent() {
  const { profile } = useAuth();
  const [artisans, setArtisans] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [statsByArtisan, setStatsByArtisan] = useState<
    Record<string, { rating: number; reviews: number; jobs: number; nextDate: string | null }>
  >({});
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [radiusKm, setRadiusKm] = useState(DEFAULT_SEARCH_RADIUS_KM);
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const [usingLiveLocation, setUsingLiveLocation] = useState(false);
  const [selectedArtisanId, setSelectedArtisanId] = useState<string | null>(null);
  const [geocodedLocations, setGeocodedLocations] = useState<CoordinateLookup>(() =>
    readGeocodeCache(),
  );
  const [locationStatus, setLocationStatus] = useState("Resolving saved locations on the map.");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const load = async () => {
      let sharedArtisans: Profile[] | null = null;
      try {
        sharedArtisans = await db.getAvailableArtisans();
      } catch (error) {
        console.error("Could not refresh artisans from the server:", error);
      }

      const [rolesRes, catRes, feedbackRes, serviceRes, appointmentRes] = await Promise.all([
        db.from("user_roles").select("user_id").eq("role", "artisan"),
        db.from("service_categories").select("*"),
        db.getPublicFeedback(),
        db.from("service_records").select("*"),
        db.from("appointments").select("*"),
      ]);
      const artisanIds = sharedArtisans?.map((artisan) => artisan.id) ??
        ((rolesRes.data || []) as UserRole[]).map((r) => r.user_id);
      if (artisanIds.length > 0) {
        if (sharedArtisans) {
          setArtisans(sharedArtisans);
        } else {
          const { data } = await db
            .from("profiles")
            .select("*")
            .in("id", artisanIds)
            .eq("is_active", true);
          setArtisans((data || []) as Profile[]);
        }
      } else {
        setArtisans([]);
      }
      setCategories((catRes.data || []) as ServiceCategory[]);

      const nextStats = artisanIds.reduce<
        Record<string, { rating: number; reviews: number; jobs: number; nextDate: string | null }>
      >((acc, artisanId) => {
        const feedback = (feedbackRes as Feedback[]).filter(
          (item) => item.artisan_id === artisanId,
        );
        const jobs = ((serviceRes.data || []) as ServiceRecord[]).filter(
          (item) => item.artisan_id === artisanId,
        ).length;
        const upcoming = ((appointmentRes.data || []) as Appointment[])
          .filter(
            (item) =>
              item.artisan_id === artisanId &&
              (item.status === "pending" || item.status === "confirmed"),
          )
          .sort((left, right) =>
            `${left.scheduled_date} ${left.scheduled_time}`.localeCompare(
              `${right.scheduled_date} ${right.scheduled_time}`,
            ),
          )[0];

        acc[artisanId] = {
          rating: feedback.length
            ? feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length
            : 0,
          reviews: feedback.length,
          jobs,
          nextDate: upcoming?.scheduled_date ?? null,
        };

        return acc;
      }, {});

      setStatsByArtisan(nextStats);
    };
    load();
  }, [refreshToken]);

  useEffect(() => {
    const interval = window.setInterval(
      () => setRefreshToken((value) => value + 1),
      10_000,
    );
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const subscriptions = [
      "profiles",
      "feedback",
      "service_records",
      "appointments",
    ].map((table) =>
      db.onTableChange(table as Parameters<typeof db.onTableChange>[0], () =>
        setRefreshToken((value) => value + 1),
      ),
    );

    return () => subscriptions.forEach((subscription) => subscription.unsubscribe());
  }, []);

  useEffect(() => {
    if (usingLiveLocation) return;

    const savedCoordinates = resolveLocationCoordinates(profile?.location, geocodedLocations);
    if (savedCoordinates) {
      setUserCoordinates(savedCoordinates);
      setLocationStatus(`Showing artisans within ${radiusKm} km of ${profile?.location}.`);
    }
  }, [geocodedLocations, profile?.location, radiusKm, usingLiveLocation]);

  useEffect(() => {
    const locations = [profile?.location, ...artisans.map((artisan) => artisan.location)]
      .map((location) => location?.trim())
      .filter((location): location is string => Boolean(location));

    const missingLocations = Array.from(new Set(locations)).filter(
      (location) => !geocodedLocations[normalizeLocation(location)],
    );

    if (!missingLocations.length) return;

    let cancelled = false;

    const loadGeocodes = async () => {
      setLocationStatus("Improving map accuracy from OpenStreetMap locations...");
      const nextCache = { ...readGeocodeCache(), ...geocodedLocations };

      for (const location of missingLocations) {
        if (cancelled) return;

        try {
          const coordinates =
            (await geocodeLocation(location)) ?? resolveFallbackLocationCoordinates(location);
          if (coordinates) {
            nextCache[normalizeLocation(location)] = coordinates;
            saveGeocodeCache(nextCache);
            if (!cancelled) setGeocodedLocations({ ...nextCache });
          }
        } catch {
          const fallback = resolveFallbackLocationCoordinates(location);
          if (fallback) {
            nextCache[normalizeLocation(location)] = fallback;
          }
        }
      }
    };

    loadGeocodes();

    return () => {
      cancelled = true;
    };
  }, [artisans, geocodedLocations, profile?.location]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Location access is not available in this browser.");
      return;
    }

    setLocationStatus("Finding a precise current location...");
    let bestAccuracy = Number.POSITIVE_INFINITY;
    let watchId: number | null = null;
    const stopWatching = () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      window.clearTimeout(timeoutId);
    };
    const timeoutId = window.setTimeout(() => {
      stopWatching();
      if (!Number.isFinite(bestAccuracy)) {
        setLocationStatus(
          "Could not access your current location. Saved location is still used when available.",
        );
      }
    }, 20_000);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (position.coords.accuracy >= bestAccuracy) return;
        bestAccuracy = position.coords.accuracy;
        setUsingLiveLocation(true);
        setUserCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus(
          `Showing artisans within ${radiusKm} km of your current location (accurate to about ${Math.round(position.coords.accuracy)} m).`,
        );
        if (position.coords.accuracy <= 50) stopWatching();
      },
      () => {
        stopWatching();
        setLocationStatus(
          "Could not access your current location. Saved location is still used when available.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    );
  };

  const artisansWithDistance: ArtisanWithDistance[] = useMemo(
    () =>
      artisans.map((artisan) => {
        const coordinates = resolveArtisanCoordinates(artisan, geocodedLocations);
        const distanceKm =
          userCoordinates && coordinates ? distanceBetweenKm(userCoordinates, coordinates) : null;
        return { ...artisan, coordinates, distanceKm };
      }),
    [artisans, geocodedLocations, userCoordinates],
  );

  const filtered = artisansWithDistance.filter((a) => {
    const matchSearch =
      a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.specialization?.toLowerCase().includes(search.toLowerCase()) ||
      a.location?.toLowerCase().includes(search.toLowerCase());
    const matchCat =
      catFilter === "all" || a.specialization?.toLowerCase().includes(catFilter.toLowerCase());
    const hasLiveArtisanLocation = a.last_latitude != null && a.last_longitude != null;
    const matchRadius =
      !userCoordinates || !hasLiveArtisanLocation || (a.distanceKm != null && a.distanceKm <= radiusKm);
    return matchSearch && matchCat && matchRadius;
  });

  const displayedArtisans = [...filtered].sort((left, right) => {
    if (left.distanceKm == null && right.distanceKm == null) {
      return left.full_name.localeCompare(right.full_name);
    }
    if (left.distanceKm == null) return 1;
    if (right.distanceKm == null) return -1;
    return left.distanceKm - right.distanceKm;
  });

  const mappedCount = filtered.filter((artisan) => artisan.coordinates).length;
  const nearestArtisan = displayedArtisans.find((artisan) => artisan.distanceKm != null);
  const selectedArtisan =
    displayedArtisans.find((artisan) => artisan.id === selectedArtisanId) ?? null;

  return (
    <>
      <PageHeader title="Browse Artisans" description="Find skilled providers near you" />

      <div className="space-y-6">
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="relative min-h-[420px] border-b lg:border-b-0 lg:border-r">
              <ArtisanMap
                center={userCoordinates}
                artisans={displayedArtisans}
                radiusKm={radiusKm}
                statsByArtisan={statsByArtisan}
                onArtisanSelect={setSelectedArtisanId}
                className="h-[420px] lg:h-[560px]"
              />
              <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
                <Badge className="gap-1 bg-background/95 text-foreground shadow-sm backdrop-blur">
                  <Navigation className="h-3.5 w-3.5" />
                  {radiusKm} km radius
                </Badge>
                <Badge variant="secondary" className="bg-background/95 shadow-sm backdrop-blur">
                  {mappedCount} mapped
                </Badge>
              </div>
            </div>

            <aside className="flex flex-col gap-5 p-5">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  Find a match
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{locationStatus}</p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search name, skill, or place"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={catFilter} onValueChange={setCatFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(radiusKm)}
                  onValueChange={(value) => setRadiusKm(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Search radius" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEARCH_RADIUS_OPTIONS_KM.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        Within {option} km
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={useCurrentLocation} className="w-full gap-2">
                  <MapPin className="h-4 w-4" />
                  Use My Location
                </Button>
              </div>

              <div className="grid grid-cols-3 overflow-hidden rounded-lg border text-center text-sm">
                <div className="p-3">
                  <p className="text-xs text-muted-foreground">Found</p>
                  <p className="mt-1 text-lg font-semibold text-card-foreground">
                    {filtered.length}
                  </p>
                </div>
                <div className="border-x p-3">
                  <p className="text-xs text-muted-foreground">Mapped</p>
                  <p className="mt-1 text-lg font-semibold text-card-foreground">{mappedCount}</p>
                </div>
                <div className="p-3">
                  <p className="text-xs text-muted-foreground">Nearest</p>
                  <p className="mt-1 text-lg font-semibold text-card-foreground">
                    {nearestArtisan?.distanceKm != null
                      ? nearestArtisan.distanceKm.toFixed(1)
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-muted p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  Search area
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Results are sorted by distance when your location or saved address can be mapped.
                </p>
              </div>

              {selectedArtisan ? (
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-start gap-3">
                    <ProfileAvatar
                      src={selectedArtisan.avatar_url}
                      name={selectedArtisan.full_name}
                      className="h-11 w-11 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-foreground">
                            {selectedArtisan.full_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {selectedArtisan.specialization || "General artisan"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedArtisanId(null)}
                          className="h-7 px-2"
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-lg border text-sm">
                    <div className="p-3">
                      <p className="text-xs text-muted-foreground">Rating</p>
                      <p className="mt-1 font-semibold text-foreground">
                        {statsByArtisan[selectedArtisan.id]?.reviews
                          ? statsByArtisan[selectedArtisan.id].rating.toFixed(1)
                          : "New"}
                      </p>
                    </div>
                    <div className="border-x p-3">
                      <p className="text-xs text-muted-foreground">Jobs</p>
                      <p className="mt-1 font-semibold text-foreground">
                        {statsByArtisan[selectedArtisan.id]?.jobs ?? 0}
                      </p>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-muted-foreground">Distance</p>
                      <p className="mt-1 font-semibold text-foreground">
                        {selectedArtisan.distanceKm != null
                          ? `${selectedArtisan.distanceKm.toFixed(1)} km`
                          : "-"}
                      </p>
                    </div>
                  </div>

                  {selectedArtisan.location && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0 text-primary" />
                      <span>{selectedArtisan.location}</span>
                    </div>
                  )}
                  {selectedArtisan.last_location_at && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Last location update: {new Date(selectedArtisan.last_location_at).toLocaleString()}
                    </p>
                  )}

                  {selectedArtisan.bio && (
                    <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                      {selectedArtisan.bio}
                    </p>
                  )}

                  <Link
                    to="/customer/appointments"
                    search={{ artisanId: selectedArtisan.id }}
                    className="mt-4 block"
                  >
                    <Button className="w-full">Book This Artisan</Button>
                  </Link>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Click an artisan marker on the map to see their details here.
                </div>
              )}
            </aside>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Available artisans</h2>
            <p className="text-sm text-muted-foreground">
              {displayedArtisans.length} provider{displayedArtisans.length === 1 ? "" : "s"} match
              your search
            </p>
          </div>
          <Badge variant="outline" className="w-fit gap-1">
            <MapPin className="h-3.5 w-3.5" />
            Within {radiusKm} km
          </Badge>
        </div>

        {displayedArtisans.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
            <Wrench className="mx-auto h-10 w-10 mb-3 opacity-50" />
            <p>No artisans found</p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {displayedArtisans.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <ProfileAvatar
                    src={a.avatar_url}
                    name={a.full_name}
                    className="h-12 w-12 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-card-foreground">
                          {a.full_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {a.specialization || "General artisan"}
                        </p>
                      </div>
                      {a.distanceKm != null && (
                        <Badge variant="secondary" className="shrink-0 gap-1">
                          <Navigation className="h-3.5 w-3.5" />
                          {a.distanceKm.toFixed(1)} km
                        </Badge>
                      )}
                    </div>

                    {a.location && (
                      <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{a.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-lg border text-sm">
                  <div className="p-3">
                    <p className="text-xs text-muted-foreground">Rating</p>
                    <p className="mt-1 flex items-center gap-1 font-semibold text-card-foreground">
                      <Star className="h-3.5 w-3.5 text-accent" />
                      {statsByArtisan[a.id]?.reviews
                        ? statsByArtisan[a.id].rating.toFixed(1)
                        : "New"}
                    </p>
                  </div>
                  <div className="border-x p-3">
                    <p className="text-xs text-muted-foreground">Jobs</p>
                    <p className="mt-1 flex items-center gap-1 font-semibold text-card-foreground">
                      <BriefcaseBusiness className="h-3.5 w-3.5 text-primary" />
                      {statsByArtisan[a.id]?.jobs ?? 0}
                    </p>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-muted-foreground">Next slot</p>
                    <p className="mt-1 truncate font-semibold text-card-foreground">
                      {statsByArtisan[a.id]?.nextDate
                        ? formatDateLabel(statsByArtisan[a.id].nextDate as string)
                        : "Open"}
                    </p>
                  </div>
                </div>

                {a.bio && (
                  <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">{a.bio}</p>
                )}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {statsByArtisan[a.id]?.reviews ? (
                      <Badge variant="outline">{statsByArtisan[a.id].reviews} reviews</Badge>
                    ) : (
                      <Badge variant="outline">New provider</Badge>
                    )}
                    {a.coordinates ? (
                      <Badge variant="outline">Mapped</Badge>
                    ) : (
                      <Badge variant="outline">Location pending</Badge>
                    )}
                  </div>
                  <Link
                    to="/customer/appointments"
                    search={{ artisanId: a.id }}
                    className="sm:w-auto"
                  >
                    <Button size="sm" className="w-full sm:w-auto">
                      Book Artisan
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ArtisanMap({
  center,
  artisans,
  radiusKm,
  statsByArtisan,
  onArtisanSelect,
  className = "h-[360px]",
}: {
  center: Coordinates | null;
  artisans: ArtisanWithDistance[];
  radiusKm: number;
  statsByArtisan: Record<
    string,
    { rating: number; reviews: number; jobs: number; nextDate: string | null }
  >;
  onArtisanSelect: (artisanId: string) => void;
  className?: string;
}) {
  const mapElementId = useId().replace(/:/g, "-");

  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | null = null;
    let markerLayer: import("leaflet").LayerGroup | null = null;
    let radiusBounds: import("leaflet").LatLngBounds | null = null;

    const mappedArtisans = artisans.filter((artisan) => artisan.coordinates);
    const fallbackCenter = center ?? mappedArtisans[0]?.coordinates ?? LOCATION_COORDINATES.accra;

    import("leaflet").then((leaflet) => {
      if (disposed) return;

      const L = leaflet.default;
      map = L.map(mapElementId, {
        center: [fallbackCenter.lat, fallbackCenter.lng],
        zoom: center ? 10 : 7,
        scrollWheelZoom: true,
        touchZoom: true,
        zoomAnimation: false,
        markerZoomAnimation: false,
        fadeAnimation: false,
        wheelDebounceTime: 30,
        wheelPxPerZoomLevel: 80,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      markerLayer = L.layerGroup().addTo(map);

      if (center) {
        const radiusCircle = L.circle([center.lat, center.lng], {
          radius: radiusKm * 1000,
          color: "#16a34a",
          fillColor: "#22c55e",
          fillOpacity: 0.08,
          weight: 2,
        }).addTo(markerLayer);
        radiusBounds = radiusCircle.getBounds();

        L.marker([center.lat, center.lng], {
          icon: L.divIcon({
            className: "",
            html: '<div class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary text-xs font-bold text-primary-foreground shadow-md">You</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
        }).addTo(markerLayer);
      }

      mappedArtisans.forEach((artisan) => {
        const coordinates = artisan.coordinates as Coordinates;
        const stats = statsByArtisan[artisan.id];
        const popup = document.createElement("div");
        const header = document.createElement("div");
        const icon = document.createElement(artisan.avatar_url ? "img" : "div");
        const titleWrap = document.createElement("div");
        const name = document.createElement("strong");
        const specialty = document.createElement("div");
        const meta = document.createElement("div");
        const location = document.createElement("div");
        const rating = document.createElement("span");
        const jobs = document.createElement("span");
        const distance = document.createElement("span");
        const bio = document.createElement("p");
        const bookLink = document.createElement("a");

        popup.className = "w-64 space-y-3";
        header.className = "flex items-start gap-3";
        icon.className = artisan.avatar_url
          ? "h-10 w-10 shrink-0 rounded-full border object-cover"
          : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary";
        if (artisan.avatar_url) {
          (icon as HTMLImageElement).src = artisan.avatar_url;
          (icon as HTMLImageElement).alt = `${artisan.full_name} profile image`;
        } else {
          icon.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-5.8 5.8a2.1 2.1 0 0 0 3 3l5.8-5.8a4 4 0 0 0 5.4-5.4l-2.7 2.7-3-3 2.7-2.7Z"/></svg>';
        }
        titleWrap.className = "min-w-0";
        name.className = "block truncate text-sm text-foreground";
        specialty.className = "text-xs text-muted-foreground";
        meta.className = "grid grid-cols-3 gap-2 rounded-md border p-2 text-center text-xs";
        location.className = "text-xs text-muted-foreground";
        bio.className = "line-clamp-3 text-xs text-muted-foreground";
        bookLink.className =
          "inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground";
        bookLink.href = `/customer/appointments?artisanId=${encodeURIComponent(artisan.id)}`;

        name.textContent = artisan.full_name;
        specialty.textContent = artisan.specialization || "General artisan";
        location.textContent = artisan.location || "Location unavailable";
        rating.textContent = stats?.reviews ? `${stats.rating.toFixed(1)} rating` : "New";
        jobs.textContent = `${stats?.jobs ?? 0} jobs`;
        distance.textContent =
          artisan.distanceKm != null ? `${artisan.distanceKm.toFixed(1)} km` : "Distance -";
        bio.textContent = artisan.bio || "No bio has been added yet.";
        bookLink.textContent = "Book This Artisan";

        titleWrap.append(name, specialty);
        header.append(icon, titleWrap);
        meta.append(rating, jobs, distance);
        popup.append(header, meta, location, bio, bookLink);

        L.marker([coordinates.lat, coordinates.lng], {
          icon: L.divIcon({
            className: "",
            html: getArtisanMarkerHtml(artisan),
            iconSize: artisan.avatar_url ? [40, 40] : [36, 36],
            iconAnchor: artisan.avatar_url ? [20, 20] : [18, 18],
          }),
        })
          .on("click", (event) => {
            onArtisanSelect(artisan.id);
            event.target.openPopup();
          })
          .bindPopup(popup)
          .addTo(markerLayer as import("leaflet").LayerGroup);
      });

      if (radiusBounds?.isValid()) {
        map.fitBounds(radiusBounds.pad(0.08), {
          animate: false,
          padding: [24, 24],
        });
      } else {
        const bounds = L.latLngBounds([]);
        mappedArtisans.forEach((artisan) => {
          const coordinates = artisan.coordinates as Coordinates;
          bounds.extend([coordinates.lat, coordinates.lng]);
        });

        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.2), { animate: false, maxZoom: 12 });
        }
      }
    });

    return () => {
      disposed = true;
      map?.stop();
      map?.off();
      map?.remove();
    };
  }, [artisans, center, mapElementId, onArtisanSelect, radiusKm, statsByArtisan]);

  return (
    <div className="h-full overflow-hidden bg-card">
      <div id={mapElementId} className={`${className} w-full touch-none bg-muted`} />
    </div>
  );
}
