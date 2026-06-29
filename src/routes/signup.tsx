import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type ChangeEvent, type ReactNode } from "react";
import { useAuth, type ArtisanSignupDetails } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { AppRole } from "@/types/database";

export const Route = createFileRoute("/signup")({ component: SignupPage });

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MAX_FILE_BYTES = 1024 * 1024;

type ArtisanForm = Required<Omit<ArtisanSignupDetails, "yearsExperience">> & {
  yearsExperience: string;
};

const emptyArtisanForm: ArtisanForm = {
  location: "",
  specialization: "",
  bio: "",
  gender: "",
  dateOfBirth: "",
  avatarUrl: "",
  businessName: "",
  artisanCategory: "",
  yearsExperience: "",
  address: "",
  region: "",
  city: "",
  digitalAddress: "",
  idType: "",
  idNumber: "",
  idCardUrl: "",
  portfolioUrls: [],
  priceRange: "",
  availability: "",
  workingDays: [],
  workingHours: "",
  whatsappNumber: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  paymentAccountName: "",
  momoNumber: "",
  preferredPaymentMethod: "",
};

function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function RequiredMark() {
  return (
    <span className="ml-1 text-destructive" aria-hidden="true">
      *
    </span>
  );
}

function Field({
  label,
  children,
  showRequired = true,
}: {
  label: string;
  children: ReactNode;
  showRequired?: boolean;
}) {
  return (
    <div>
      <Label>
        {label}
        {showRequired && <RequiredMark />}
      </Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function SignupPage() {
  const { requestOtp, signUp } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [customerLocation, setCustomerLocation] = useState("");
  const [customerBio, setCustomerBio] = useState("");
  const [artisan, setArtisan] = useState(emptyArtisanForm);
  const [otpcode, setOtpcode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AppRole>("customer");
  const [loading, setLoading] = useState(false);

  const setArtisanField = <K extends keyof ArtisanForm>(key: K, value: ArtisanForm[K]) =>
    setArtisan((current) => ({ ...current, [key]: value }));

  const handleImage = async (
    event: ChangeEvent<HTMLInputElement>,
    key: "avatarUrl" | "idCardUrl",
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > MAX_FILE_BYTES) {
      toast.error("Choose an image that is 1 MB or smaller.");
      return;
    }
    setArtisanField(key, await readImage(file));
  };

  const handlePortfolio = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length + artisan.portfolioUrls.length > 5) {
      toast.error("You can upload up to 5 portfolio photos.");
      return;
    }
    if (files.some((file) => !file.type.startsWith("image/") || file.size > MAX_FILE_BYTES)) {
      toast.error("Each portfolio photo must be an image no larger than 1 MB.");
      return;
    }
    setArtisanField("portfolioUrls", [
      ...artisan.portfolioUrls,
      ...(await Promise.all(files.map(readImage))),
    ]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedRole === "artisan") {
      if (artisan.workingDays.length === 0) return toast.error("Select at least one working day.");
      if (!artisan.avatarUrl || !artisan.idCardUrl || artisan.portfolioUrls.length === 0) {
        return toast.error("Profile photo, ID card, and portfolio photos are required.");
      }
    }

    setLoading(true);
    const details: ArtisanSignupDetails =
      selectedRole === "artisan"
        ? {
            ...artisan,
            yearsExperience: Number(artisan.yearsExperience),
            location: artisan.address,
          }
        : { location: customerLocation, bio: customerBio };
    const fullName = [firstName, middleName, lastName]
      .map((name) => name.trim())
      .filter(Boolean)
      .join(" ");
    const { error } = otpSent
      ? await signUp(phone, otpcode, fullName, selectedRole, email, details)
      : await requestOtp(phone, "signup");
    setLoading(false);

    if (error) toast.error(error.message);
    else if (!otpSent) {
      setOtpSent(true);
      toast.success("OTP sent to your phone.");
    } else {
      toast.success("Account created!");
      const routes = {
        artisan: "/artisan/dashboard",
        customer: "/customer/dashboard",
        admin: "/admin/dashboard",
      } as const;
      navigate({ to: routes[selectedRole] as never });
    }
  };

  const roles: { value: AppRole; label: string; desc: string }[] = [
    { value: "customer", label: "Customer", desc: "Book services" },
    { value: "artisan", label: "Artisan", desc: "Offer services" },
    { value: "admin", label: "Admin", desc: "Manage platform" },
  ];

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className={`mx-auto w-full ${selectedRole === "artisan" ? "max-w-4xl" : "max-w-md"}`}>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            A
          </div>
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Join ArtisanCRM with phone verification
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Section title="Account type">
            <div className="sm:col-span-2 grid grid-cols-3 gap-2">
              {roles.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  disabled={otpSent || loading}
                  onClick={() => setSelectedRole(role.value)}
                  className={`rounded-lg border p-3 text-center text-sm ${selectedRole === role.value ? "border-primary bg-primary/10 text-primary" : "bg-background text-muted-foreground"}`}
                >
                  <p className="font-medium">{role.label}</p>
                  <p className="text-xs opacity-70">{role.desc}</p>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Personal details">
            <Field label="First Name">
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </Field>
            <Field label="Middle Name (Optional)" showRequired={false}>
              <Input value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
            </Field>
            <Field label="Last Name">
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </Field>
            <Field label="Phone Number">
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                required
                disabled={otpSent || loading}
              />
            </Field>
            <Field label="Email Address" showRequired={false}>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            {selectedRole === "artisan" && (
              <>
                <Field label="Gender">
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={artisan.gender}
                    onChange={(e) => setArtisanField("gender", e.target.value)}
                    required
                  >
                    <option value="">Select gender</option>
                    <option>Female</option>
                    <option>Male</option>
                    <option>Other</option>
                    <option>Prefer not to say</option>
                  </select>
                </Field>
                <Field label="Date of Birth">
                  <Input
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    value={artisan.dateOfBirth}
                    onChange={(e) => setArtisanField("dateOfBirth", e.target.value)}
                    required
                  />
                </Field>
                <Field label="Profile Photo">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleImage(e, "avatarUrl")}
                    required={!artisan.avatarUrl}
                  />
                  {artisan.avatarUrl && (
                    <img
                      src={artisan.avatarUrl}
                      alt="Profile preview"
                      className="mt-2 h-20 w-20 rounded-full object-cover"
                    />
                  )}
                </Field>
              </>
            )}
          </Section>

          {selectedRole === "artisan" ? (
            <>
              <Section title="Business and services">
                <Field label="Business/Workshop Name">
                  <Input
                    value={artisan.businessName}
                    onChange={(e) => setArtisanField("businessName", e.target.value)}
                    required
                  />
                </Field>
                <Field label="Artisan Category">
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={artisan.artisanCategory}
                    onChange={(e) => setArtisanField("artisanCategory", e.target.value)}
                    required
                  >
                    <option value="">Select category</option>
                    {[
                      "Carpentry",
                      "Electrical",
                      "Fashion",
                      "Masonry",
                      "Painting",
                      "Plumbing",
                      "Welding",
                      "Other",
                    ].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Specific Skill/Service">
                  <Input
                    value={artisan.specialization}
                    onChange={(e) => setArtisanField("specialization", e.target.value)}
                    required
                  />
                </Field>
                <Field label="Years of Experience">
                  <Input
                    type="number"
                    min="0"
                    value={artisan.yearsExperience}
                    onChange={(e) => setArtisanField("yearsExperience", e.target.value)}
                    required
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Service Description">
                    <Textarea
                      value={artisan.bio}
                      onChange={(e) => setArtisanField("bio", e.target.value)}
                      required
                    />
                  </Field>
                </div>
                <Field label="Price Range">
                  <Input
                    value={artisan.priceRange}
                    onChange={(e) => setArtisanField("priceRange", e.target.value)}
                    placeholder="e.g. GHS 100 - 500"
                    required
                  />
                </Field>
                <Field label="Availability">
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={artisan.availability}
                    onChange={(e) => setArtisanField("availability", e.target.value)}
                    required
                  >
                    <option value="">Select availability</option>
                    <option>Available now</option>
                    <option>By appointment</option>
                    <option>Weekdays only</option>
                    <option>Weekends only</option>
                  </select>
                </Field>
              </Section>

              <Section title="Location">
                <Field label="Location/Address">
                  <Input
                    value={artisan.address}
                    onChange={(e) => setArtisanField("address", e.target.value)}
                    required
                  />
                </Field>
                <Field label="Region">
                  <Input
                    value={artisan.region}
                    onChange={(e) => setArtisanField("region", e.target.value)}
                    required
                  />
                </Field>
                <Field label="City/Town">
                  <Input
                    value={artisan.city}
                    onChange={(e) => setArtisanField("city", e.target.value)}
                    required
                  />
                </Field>
                <Field label="Digital Address">
                  <Input
                    value={artisan.digitalAddress}
                    onChange={(e) =>
                      setArtisanField("digitalAddress", e.target.value.toUpperCase())
                    }
                    placeholder="GA-123-4567"
                    required
                  />
                </Field>
              </Section>

              <Section title="Identity and portfolio">
                <Field label="ID Type">
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={artisan.idType}
                    onChange={(e) => setArtisanField("idType", e.target.value)}
                    required
                  >
                    <option value="">Select ID type</option>
                    <option>Ghana Card</option>
                    <option>Passport</option>
                    <option>Driver's Licence</option>
                    <option>Voter ID</option>
                  </select>
                </Field>
                <Field label="ID Number">
                  <Input
                    value={artisan.idNumber}
                    onChange={(e) => setArtisanField("idNumber", e.target.value)}
                    required
                  />
                </Field>
                <Field label="Upload ID Card">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleImage(e, "idCardUrl")}
                    required={!artisan.idCardUrl}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Image, maximum 1 MB</p>
                  {artisan.idCardUrl && (
                    <div className="mt-3 rounded-lg border p-2">
                      <img
                        src={artisan.idCardUrl}
                        alt="Selected ID card"
                        className="h-32 w-full rounded-md object-contain"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => setArtisanField("idCardUrl", "")}
                      >
                        Remove ID image
                      </Button>
                    </div>
                  )}
                </Field>
                <Field label="Portfolio/Work Photos">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => void handlePortfolio(e)}
                    required={artisan.portfolioUrls.length === 0}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Up to 5 images, 1 MB each</p>
                </Field>
                {artisan.portfolioUrls.length > 0 && (
                  <div className="sm:col-span-2">
                    <p className="mb-2 text-sm font-medium">
                      {artisan.portfolioUrls.length} work photo
                      {artisan.portfolioUrls.length === 1 ? "" : "s"} selected
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {artisan.portfolioUrls.map((src, index) => (
                        <button
                          type="button"
                          key={index}
                          title="Remove photo"
                          onClick={() =>
                            setArtisanField(
                              "portfolioUrls",
                              artisan.portfolioUrls.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <img
                            src={src}
                            alt={`Work ${index + 1}`}
                            className="h-20 w-20 rounded-md object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Section>

              <Section title="Schedule and contacts">
                <div className="sm:col-span-2">
                  <Label>
                    Working Days
                    <RequiredMark />
                  </Label>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {DAYS.map((day) => (
                      <label key={day} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={artisan.workingDays.includes(day)}
                          onChange={(e) =>
                            setArtisanField(
                              "workingDays",
                              e.target.checked
                                ? [...artisan.workingDays, day]
                                : artisan.workingDays.filter((item) => item !== day),
                            )
                          }
                        />
                        {day}
                      </label>
                    ))}
                  </div>
                </div>
                <Field label="Working Hours">
                  <Input
                    value={artisan.workingHours}
                    onChange={(e) => setArtisanField("workingHours", e.target.value)}
                    placeholder="8:00 AM - 5:00 PM"
                    required
                  />
                </Field>
                <Field label="WhatsApp Number">
                  <Input
                    type="tel"
                    value={artisan.whatsappNumber}
                    onChange={(e) =>
                      setArtisanField("whatsappNumber", e.target.value.replace(/\D/g, ""))
                    }
                    required
                  />
                </Field>
                <Field label="Emergency Contact Name">
                  <Input
                    value={artisan.emergencyContactName}
                    onChange={(e) => setArtisanField("emergencyContactName", e.target.value)}
                    required
                  />
                </Field>
                <Field label="Emergency Contact Phone">
                  <Input
                    type="tel"
                    value={artisan.emergencyContactPhone}
                    onChange={(e) =>
                      setArtisanField("emergencyContactPhone", e.target.value.replace(/\D/g, ""))
                    }
                    required
                  />
                </Field>
              </Section>

              <Section title="Payment details">
                <Field label="Bank/MoMo Account Name">
                  <Input
                    value={artisan.paymentAccountName}
                    onChange={(e) => setArtisanField("paymentAccountName", e.target.value)}
                    required
                  />
                </Field>
                <Field label="MoMo Number">
                  <Input
                    type="tel"
                    value={artisan.momoNumber}
                    onChange={(e) =>
                      setArtisanField("momoNumber", e.target.value.replace(/\D/g, ""))
                    }
                    required
                  />
                </Field>
                <Field label="Preferred Payment Method">
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={artisan.preferredPaymentMethod}
                    onChange={(e) => setArtisanField("preferredPaymentMethod", e.target.value)}
                    required
                  >
                    <option value="">Select method</option>
                    <option>Mobile Money</option>
                    <option>Bank Transfer</option>
                    <option>Cash</option>
                    <option>Card</option>
                  </select>
                </Field>
              </Section>
            </>
          ) : (
            <Section title="Profile details">
              <Field label="Location">
                <Input
                  value={customerLocation}
                  onChange={(e) => setCustomerLocation(e.target.value)}
                  required
                />
              </Field>
              <Field label={selectedRole === "admin" ? "About" : "Service Needs"}>
                <Input value={customerBio} onChange={(e) => setCustomerBio(e.target.value)} />
              </Field>
            </Section>
          )}

          {otpSent && (
            <Section title="Phone verification">
              <div className="sm:col-span-2">
                <Label>
                  OTP Code
                  <RequiredMark />
                </Label>
                <InputOTP
                  maxLength={5}
                  value={otpcode}
                  onChange={(value) => setOtpcode(value.replace(/\D/g, ""))}
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4].map((index) => (
                      <InputOTPSlot key={index} index={index} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </Section>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : otpSent ? "Verify and Create Account" : "Send OTP"}
          </Button>
          {otpSent && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setOtpSent(false);
                setOtpcode("");
              }}
              disabled={loading}
            >
              Use a different number
            </Button>
          )}
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
