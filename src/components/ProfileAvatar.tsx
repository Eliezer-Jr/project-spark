import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getProfileInitials } from "@/lib/profile-avatar";
import { cn } from "@/lib/utils";

export function ProfileAvatar({
  src,
  name,
  className,
  fallbackClassName,
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
  fallbackClassName?: string;
}) {
  return (
    <Avatar className={cn("border bg-muted", className)}>
      {src && <AvatarImage src={src} alt={name ? `${name} profile image` : "Profile image"} />}
      <AvatarFallback className={cn("font-semibold", fallbackClassName)}>
        {getProfileInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
