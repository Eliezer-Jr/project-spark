import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUp, Trash2 } from "lucide-react";
import { toast } from "sonner";

const MAX_IMAGE_SIZE_BYTES = 1024 * 1024;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ProfileImageUploader({
  value,
  name,
  onChange,
}: {
  value: string | null;
  name: string;
  onChange: (value: string | null) => void;
}) {
  const handleFileChange = async (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("Profile image must be 1 MB or smaller.");
      return;
    }

    try {
      onChange(await readFileAsDataUrl(file));
    } catch {
      toast.error("Could not read that image.");
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
      <ProfileAvatar src={value} name={name} className="h-20 w-20" fallbackClassName="text-lg" />

      <div className="min-w-0 flex-1">
        <Label htmlFor="profile-image">Profile image</Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a clear image customers and artisans can recognize.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" className="relative gap-2">
            <ImageUp className="h-4 w-4" />
            Upload Image
            <Input
              id="profile-image"
              type="file"
              accept="image/*"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(event) => {
                void handleFileChange(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </Button>
          {value && (
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => onChange(null)}
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
